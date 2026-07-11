import os
import json
import logging
import asyncio
from typing import Dict, Any, List
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

# Optional: Set litellm logger to see detailed errors if needed
# litellm.set_verbose = True

class InferenceEngine:
    def __init__(self):
        pass

    @property
    def vision_model(self):
        return os.getenv("VISION_MODEL", "fireworks_ai/accounts/fireworks/models/llama-v3p2-11b-vision-instruct")
        
    @property
    def text_model(self):
        return os.getenv("TEXT_MODEL", "fireworks_ai/accounts/fireworks/models/llama-v3p1-8b-instruct")

    async def _call_llm_vision(self, prompt: str, image_b64: str) -> str:
        try:
            response = await litellm.acompletion(
                model=self.vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                    ]
                }],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Vision LLM call failed: {e}")
            return "{}"

    async def _call_llm_text(self, prompt: str, json_mode: bool = True) -> str:
        try:
            kwargs = {
                "model": self.text_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 2000
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
                
            response = await litellm.acompletion(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Text LLM call failed: {e}")
            return "{}" if json_mode else f"I'm sorry, I encountered an error processing your request. Details: {str(e)}"

    async def chat(self, messages: list) -> str:
        """
        Takes a list of standard message dictionaries: [{"role": "system", "content": "..."}, ...]
        and returns the raw text response.
        """
        try:
            response = await litellm.acompletion(
                model=self.text_model,
                messages=messages,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Chat LLM call failed: {e}")
            return f"I'm sorry, I encountered an error processing your request. Details: {str(e)}"

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
