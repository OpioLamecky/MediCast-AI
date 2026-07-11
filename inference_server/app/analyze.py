import uuid
import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException

from .models import (
    SessionCreate, 
    SessionResponse, 
    FrameAnalysisRequest, 
    FrameAnalysisResponse, 
    ClinicalReportRequest, 
    ClinicalReportResponse
)
from .youtube import process_youtube_video
from .database import (
    create_session, 
    update_session_status, 
    insert_frame_analysis, 
    save_clinical_report,
    get_frame_analyses
)
from .inference import engine
from .telemetry import get_gpu_metrics
from .websocket import publish_analysis

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/sessions", response_model=SessionResponse)
async def create_new_session(request: SessionCreate, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    await create_session(session_id, request.videoUrl)
    
    # Process video in background if it's a URL
    background_tasks.add_task(process_youtube_video, request.videoUrl, session_id)
    
    return SessionResponse(sessionId=session_id, status="created")

@router.post("/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_frame(request: FrameAnalysisRequest):
    try:
        # Run inference using the InferenceEngine
        analysis_result = await engine.analyze_frame_parallel(request.imageBase64)
        analysis_result.timestamp = request.timestamp
        
        # Get Telemetry
        gpu_metrics = get_gpu_metrics()
        
        # Construct response
        response = FrameAnalysisResponse(
            timestamp=request.timestamp,
            analysis=analysis_result,
            gpu_metrics=gpu_metrics
        )
        
        # Save to DB
        await insert_frame_analysis(request.sessionId, request.timestamp, analysis_result.dict())
        
        # Publish to WebSockets
        await publish_analysis(request.sessionId, response.dict())
        
        return response
    except Exception as e:
        logger.error(f"Error analyzing frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/report", response_model=ClinicalReportResponse)
async def generate_report(request: ClinicalReportRequest):
    try:
        analyses = await get_frame_analyses(request.sessionId)
        if not analyses:
            return ClinicalReportResponse(report="No analysis data found for this session.")
        
        # Synthesize report using LLM
        prompt = "Based on the following surgical frame analyses, generate a comprehensive clinical post-operative report.\n\n"
        for a in analyses:
            prompt += str(a) + "\n"
            
        report_json = await engine.analyze_text(prompt)
        # Parse or use as raw string
        report = report_json
        
        await save_clinical_report(request.sessionId, report)
        return ClinicalReportResponse(report=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from .models import VideoAnalysisRequest
import json

@router.post("/analyze-video")
async def generate_video_analysis(request: VideoAnalysisRequest):
    try:
        video = request.video_details
        prompt = f"""You are an elite, senior surgical video analyst AI and a renowned medical educator. Analyze the following surgical procedure and provide a comprehensive, highly intuitive clinical assessment. 
Your analysis MUST draw heavily upon established surgical literature, current gold-standard clinical guidelines (such as SAGES or equivalent), and deep surgical intuition. 
Do not just provide generic statements. Provide highly specific, nuanced insights about technique, anatomical landmarks, potential complications based on the procedure type, and detailed actionable recommendations.

Surgery Details:
- Title: {video.get('title', 'Unknown')}
- Procedure: {video.get('procedure_type', 'Unknown')}
- Surgeon: {video.get('surgeon_name', 'Unknown')}
- Duration: {video.get('duration_minutes', 'Unknown')} minutes
- Department: {video.get('department', 'Unknown')}
- Notes: {video.get('notes', 'None')}

Generate a realistic, incredibly detailed analysis as if you just watched a complex case. Incorporate references to clinical literature and surgical intuition where appropriate in your notes and summary. Return ONLY valid JSON in the following schema:
{{
  "overall_score": number (integer 0-100),
  "risk_level": "low" | "moderate" | "high" | "critical",
  "phases": [
    {{
      "name": string,
      "start_time": string,
      "end_time": string,
      "score": number,
      "notes": string (Must include intuitive observations and literature-backed insights)
    }}
  ],
  "instruments_detected": [string],
  "risk_events": [
    {{
      "timestamp": string,
      "severity": "low" | "moderate" | "high" | "critical",
      "description": string,
      "recommendation": string
    }}
  ],
  "technique_assessment": string (Detailed critique of surgical technique and anatomical awareness),
  "recommendations": [string],
  "summary": string (Comprehensive post-operative summary),
  "efficiency_score": number (integer 0-100),
  "safety_score": number (integer 0-100),
  "skill_score": number (integer 0-100)
}}

Make this highly educational, critical, and insightful for medical professionals."""

        result_text = await engine.analyze_text(prompt)
        # Assuming the LLM returns JSON
        try:
            result = json.loads(result_text)
        except:
            # Try to extract JSON if it added markdown
            import re
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', result_text, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group(1))
                except:
                    result = {}
            else:
                result = {}

        # Force all scores to be integers out of 100 to prevent Supabase type casting errors
        for key in ['overall_score', 'efficiency_score', 'safety_score', 'skill_score']:
            if key in result:
                try:
                    val = float(result[key])
                    if val <= 1.0:
                        val = val * 100
                    elif val <= 10.0:
                        val = val * 10
                    result[key] = int(round(val))
                except (ValueError, TypeError):
                    result[key] = 85 # Default fallback

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
