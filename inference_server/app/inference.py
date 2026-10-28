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
        "groq/openai/gpt-oss-120b",
        "groq/qwen/qwen3.8-27b",
        "gemini/gemini-3.5-flash",
        "gemini/gemini-3.5-flash-lite",
        "groq/llama-3.3-70b-versatile",
        "huggingface/meta-llama/Llama-3.3-70B-Instruct",
    ]

    VISION_FALLBACKS = [
        "gemini/gemini-3.5-flash",
        "gemini/gemini-3.5-flash-lite",
        "fireworks_ai/accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
    ]

    def __init__(self):
        # If the user set a specific TEXT_MODEL in .env, put it first in the chain
        custom_text = os.getenv("TEXT_MODEL")
        if custom_text and custom_text not in self.TEXT_FALLBACKS:
            self.TEXT_FALLBACKS = [custom_text] + self.TEXT_FALLBACKS

        custom_vision = os.getenv("VISION_MODEL")
        if custom_vision and custom_vision not in self.VISION_FALLBACKS:
            self.VISION_FALLBACKS = [custom_vision] + self.VISION_FALLBACKS

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
        return await self._call_with_fallback(
            models=self.TEXT_FALLBACKS,
            messages=messages,
            max_tokens=1000,
            json_mode=False,
            label="chat",
        )

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

    async def analyze_text(self, prompt: str, json_mode: bool = True) -> str:
        return await self._call_llm_text(prompt, json_mode)

engine = InferenceEngine()
