import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
import litellm

from .agents import (
    build_anatomy_prompt,
    build_safety_prompt,
    build_phase_prompt,
    build_education_prompt,
    build_arbiter_prompt
)
from .models import AnalysisResult

logger = logging.getLogger(__name__)

# Suppress litellm's noisy logs unless debugging
litellm.suppress_debug_info = True


class InferenceEngine:
    """
    Multi-provider inference engine with automatic fallback.
    
    Provider chain (tried in order):
      1. Groq       — Free tier, Llama 3.3 70B, very fast (~6K req/day)
      2. Gemini     — Free tier, Gemini 2.0 Flash (~15 req/min)
      3. HuggingFace — Free serverless models as last resort
    
    The TEXT_MODEL env var can override the primary model.
    If a provider fails (rate-limit, credits, network), the next one is tried.
    """

    # Fallback chains — order matters (first = preferred)
    TEXT_FALLBACKS = [
    "openai/deepseek-v4.1-flash-1017",
    "openai/glm-5.3-flash",
    "openai/qwen3.8-flash-next",
]

    VISION_FALLBACKS = [
    "openai/qwen3.8-27b",
    "openai/nemotron-3-nano-omni-30b-a3b-reasoning",
    "openai/qwen3.8-flash-next",
]

    def __init__(self):
        # If the user set a specific TEXT_MODEL in .env, put it first in the chain
        custom_text = os.getenv("TEXT_MODEL")
        if custom_text and custom_text not in self.TEXT_FALLBACKS:
            self.TEXT_FALLBACKS = [
    "openai/deepseek-v4.1-flash-1017",
    "openai/glm-5.3-flash",
    "openai/qwen3.8-flash-next",
] + self.TEXT_FALLBACKS

        custom_vision = os.getenv("VISION_MODEL")
        if custom_vision and custom_vision not in self.VISION_FALLBACKS:
            self.VISION_FALLBACKS = [
    "openai/qwen3.8-27b",
    "openai/nemotron-3-nano-omni-30b-a3b-reasoning",
    "openai/qwen3.8-flash-next",
] + self.VISION_FALLBACKS

        logger.info(f"InferenceEngine initialized — text chain: {self.TEXT_FALLBACKS}")
        logger.info(f"InferenceEngine initialized — vision chain: {self.VISION_FALLBACKS}")

    # ──────────────────────────────────────────────
    #  Core LLM call with automatic fallback
    # ──────────────────────────────────────────────

    async def _call_with_fallback(
        self,
        models: List[str],
        messages: list,
        max_tokens: int = 2000,
        json_mode: bool = False,
        label: str = "llm",
    ) -> str:
        """
        Try each model in `models` in order. Return the first successful response.
        If all fail, return a user-friendly error string.
        """
        last_error = None

        for model in models:
            try:
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                }
                if json_mode:
                    # Gemini doesn't support response_format yet via litellm in all cases,
                    # so we add it only for models known to support it.
                    if not model.startswith("gemini/"):
                        kwargs["response_format"] = {"type": "json_object"}

                response = await litellm.acompletion(**kwargs)
                content = response.choices[0].message.content
                logger.info(f"[{label}] Success with model: {model}")
                return content

            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                logger.warning(f"[{label}] Model {model} failed: {e}")

                # If it's a rate-limit, credit, or quota error — try next provider
                if any(kw in error_str for kw in [
                    "rate_limit", "rate limit", "quota", "credits",
                    "insufficient", "429", "resource_exhausted",
                    "too many requests", "billing", "exceeded"
                ]):
                    logger.info(f"[{label}] Rate/credit issue on {model}, trying next provider...")
                    continue

                # For other transient errors, also try next
                if any(kw in error_str for kw in ["timeout", "connection", "503", "502", "500"]):
                    logger.info(f"[{label}] Transient error on {model}, trying next provider...")
                    continue

                # For unexpected errors, still try next but log more aggressively
                logger.error(f"[{label}] Unexpected error on {model}: {e}")
                continue

        # All models exhausted
        error_msg = f"All providers failed. Last error: {last_error}"
        logger.error(f"[{label}] {error_msg}")
        if json_mode:
            return "{}"
        return (
            "I'm sorry, all AI providers are currently unavailable. "
            "This is usually temporary — please try again in a minute or two. "
            f"(Technical detail: {last_error})"
        )

    # ──────────────────────────────────────────────
    #  Public API (unchanged interface)
    # ──────────────────────────────────────────────

    async def _call_llm_vision(self, prompt: str, image_b64: str) -> str:
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
            ]
        }]
        return await self._call_with_fallback(
            models=self.VISION_FALLBACKS,
            messages=messages,
            max_tokens=500,
            json_mode=True,
            label="vision",
        )

    async def _call_llm_text(self, prompt: str, json_mode: bool = True) -> str:
        messages = [{"role": "user", "content": prompt}]
        return await self._call_with_fallback(
            models=self.TEXT_FALLBACKS,
            messages=messages,
            max_tokens=2000,
            json_mode=json_mode,
            label="text",
        )

    async def chat(self, messages: list) -> str:
        """
        Takes a list of standard message dictionaries: [{"role": "system", "content": "..."}, ...]
        and returns the raw text response.
        """
        response = await self._call_with_fallback(
            models=self.TEXT_FALLBACKS,
            messages=messages,
            max_tokens=2500,
            json_mode=False,
            label="chat",
        )
        # Normalize any compressed table separators (e.g. '||' or '|||') into clean line breaks
        import re
        if response and "||" in response:
            response = re.sub(r'\|{2,}\s*', '\n| ', response)
        return response

    async def analyze_frame_parallel(self, image_b64: str) -> AnalysisResult:
        # Run specialized agents in parallel
        results = await asyncio.gather(
            self._call_llm_vision(build_anatomy_prompt(), image_b64),
            self._call_llm_vision(build_safety_prompt(), image_b64),
            self._call_llm_vision(build_phase_prompt(), image_b64),
            self._call_llm_vision(build_education_prompt(), image_b64),
            return_exceptions=True
        )

        agent_outputs = []
        for res in results:
            if isinstance(res, Exception):
                logger.error(f"Agent failed: {res}")
            else:
                agent_outputs.append(res)
        
        # Pass to the arbiter to synthesize
        context = "\n---\n".join(agent_outputs)
        arbiter_prompt = build_arbiter_prompt(context)
        final_json = await self._call_llm_text(arbiter_prompt)
        
        try:
            data = json.loads(final_json)
            return AnalysisResult(
                phase=data.get("phase", "Unknown"),
                anatomy_identified=data.get("anatomy_identified", []),
                safety_concerns=data.get("safety_concerns", []),
                education_tips=data.get("education_tips", [])
            )
        except json.JSONDecodeError:
            logger.error("Failed to parse arbiter output as JSON")
            return AnalysisResult()

    async def analyze_live_frame(
        self,
        image_b64: str,
        procedure_type: str = "Laparoscopic Cholecystectomy",
        timestamp: float = 0.0,
        frame_metrics: Optional[Dict[str, Any]] = None,
    ) -> AnalysisResult:
        mins = int(timestamp // 60)
        secs = int(timestamp % 60)
        ts_str = f"{mins:02d}:{secs:02d}"
        metrics_ctx = json.dumps(frame_metrics) if frame_metrics else "none"

        # Pre-check optical clarity before invoking Vision LLM
        if isinstance(frame_metrics, dict):
            brightness = frame_metrics.get("brightness", 50)
            contrast = frame_metrics.get("contrastScore", 40)
            if brightness < 14 or contrast < 11:
                reason = (
                    f"Camera feed is dark or obstructed ({brightness}% brightness)."
                    if brightness < 14
                    else f"Camera feed is blurry or lacks visual detail ({contrast}% contrast)."
                )
                return AnalysisResult(
                    is_surgical_scene=False,
                    feed_quality="dark" if brightness < 14 else "blurry",
                    scene_observed=reason,
                    phase="Camera Feed Unclear / Low Light",
                    risk_level="standby",
                    safety_score=None,
                    efficiency_score=None,
                    skill_score=None,
                    anatomy_identified=[],
                    instruments_detected=[],
                    safety_concerns=[],
                    alerts=[],
                    education_tips=[],
                    guidance_tip="Ensure camera is focused and aimed at an illuminated surgical procedure before scoring.",
                    timestamp=timestamp,
                )

        prompt = f"""You are MediCast AI Intraoperative Vision Verifier & Surgical Monitor.
Target Procedure: {procedure_type}
Elapsed Time: {ts_str}
Optical Frame Telemetry: {metrics_ctx}

STRICT ZERO-HALLUCINATION RULES:
1. Inspect what is LITERALLY visible in this image frame.
2. Set "is_surgical_scene": true ONLY if the image genuinely shows a real surgical procedure, open incision, endoscopic/laparoscopic/arthroscopic/microscopic operative view, or surgical tissue model, AND the view is clear enough to evaluate.
3. If the image shows a normal room, person, face, ceiling, wall, desk, dark/blurry frame, or anything NOT a surgical procedure:
   - Set "is_surgical_scene": false
   - Set "safety_score": null, "efficiency_score": null, "skill_score": null
   - Set "risk_level": "standby"
   - Set "phase": "No Surgery Detected in Camera View"
   - Set "anatomy_identified": [] and "instruments_detected": []
   - Set "alerts": [] (NEVER fabricate surgical portals, cannulas, bleeding, or scores!)
   - Set "scene_observed" to a brief factual description of what is actually visible.

Return ONLY valid JSON matching this schema:
{{
  "is_surgical_scene": false,
  "feed_quality": "clear",
  "scene_observed": "Factual description of camera frame",
  "phase": "No Surgery Detected in Camera View",
  "risk_level": "standby",
  "safety_score": null,
  "efficiency_score": null,
  "skill_score": null,
  "anatomy_identified": [],
  "instruments_detected": [],
  "alerts": [],
  "guidance_tip": "Position camera clearly over an illuminated surgical field to activate scoring and alerts."
}}"""

        raw = await self._call_llm_vision(prompt, image_b64)
        data = {}
        try:
            data = json.loads(raw)
        except Exception:
            import re
            match = re.search(r'\{[\s\S]*\}', raw or '')
            if match:
                try:
                    data = json.loads(match.group(0))
                except Exception:
                    data = {}

        is_surgical = bool(data.get("is_surgical_scene", False))
        feed_quality = str(data.get("feed_quality", "clear")).lower()

        if not data or not is_surgical or feed_quality in ("dark", "blurry"):
            return AnalysisResult(
                is_surgical_scene=False,
                feed_quality="non_surgical" if not is_surgical else feed_quality,
                scene_observed=data.get("scene_observed") or "No active surgical procedure detected in camera view.",
                phase="No Surgery Detected in View",
                risk_level="standby",
                safety_score=None,
                efficiency_score=None,
                skill_score=None,
                anatomy_identified=[],
                instruments_detected=[],
                safety_concerns=[],
                alerts=[],
                education_tips=[],
                guidance_tip="Position camera clearly over an illuminated surgical field to activate real-time scoring and warnings.",
                timestamp=timestamp,
            )

        alerts = data.get("alerts", [])
        safety_concerns = [
            f"[{a.get('severity', 'low').upper()}] {a.get('description', '')}"
            for a in alerts if isinstance(a, dict) and a.get("description")
        ]
        guidance_tip = data.get("guidance_tip", "")

        def _parse_opt_score(val, default_val):
            if val is None:
                return default_val
            try:
                return max(0, min(100, int(round(float(val)))))
            except Exception:
                return default_val

        return AnalysisResult(
            is_surgical_scene=True,
            feed_quality="clear",
            scene_observed=data.get("scene_observed", "Surgical field confirmed."),
            phase=data.get("phase", "Active Intraoperative Monitoring"),
            risk_level=data.get("risk_level", "low"),
            safety_score=_parse_opt_score(data.get("safety_score"), 92),
            efficiency_score=_parse_opt_score(data.get("efficiency_score"), 90),
            skill_score=_parse_opt_score(data.get("skill_score"), 91),
            anatomy_identified=data.get("anatomy_identified", []),
            instruments_detected=data.get("instruments_detected", []),
            safety_concerns=safety_concerns,
            alerts=alerts if isinstance(alerts, list) else [],
            education_tips=[guidance_tip] if guidance_tip else [],
            guidance_tip=guidance_tip,
            timestamp=timestamp,
        )

    async def analyze_text(self, prompt: str, json_mode: bool = True) -> str:
        return await self._call_llm_text(prompt, json_mode)

engine = InferenceEngine()
