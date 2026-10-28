from fastapi import APIRouter, HTTPException
from typing import Optional
import json

import os
from pathlib import Path

from .models import ChatRequest, ChatResponse
from .inference import engine
from .database import get_clinical_report, get_frame_analyses

router = APIRouter()

# Load the base agent prompt from file
AGENT_PROMPT_PATH = Path(__file__).parent / "agent_prompt.md"
base_agent_prompt = ""
if AGENT_PROMPT_PATH.exists():
    with open(AGENT_PROMPT_PATH, "r", encoding="utf-8") as f:
        base_agent_prompt = f.read()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Handles queries to the AI assistant regarding the surgical session.
    Uses multi-provider fallback (Groq → Gemini → HuggingFace).
    """
    try:
        # Fetch context about the surgery to provide to the LLM
        report = await get_clinical_report(request.sessionId)
        if not report:
            # Fallback to raw frame analyses if no final report exists
            analyses = await get_frame_analyses(request.sessionId)
            context_data = "\n".join([json.dumps(a) for a in analyses[-10:]]) # last 10 frames
        else:
            context_data = report
        
        system_prompt = (
            f"{base_agent_prompt}\n\n"
            "--- SURGICAL CONTEXT ---\n"
            "Use the following surgical context to anchor your answers if relevant:\n"
            f"{context_data}\n\n"
        )
        
        # Build structured messages array for LiteLLM
        messages = [{"role": "system", "content": system_prompt}]
        
        if request.history:
            for msg in request.history:
                messages.append({"role": msg.role, "content": msg.content})
                
        messages.append({"role": "user", "content": request.message})
        
        # The engine tries multiple providers automatically (Groq → Gemini → HF)
        reply = await engine.chat(messages)
        
        return ChatResponse(response=reply)
        
    except Exception as e:
        # Return a friendly response instead of crashing with a 500
        logger.error(f"Chat endpoint error: {e}")
        return ChatResponse(
            response=(
                "I'm temporarily unable to process your request. "
                "Our AI providers are being rate-limited or unavailable right now. "
                "Please try again in a moment."
            )
        )
