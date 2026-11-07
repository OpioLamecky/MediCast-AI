from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SessionCreate(BaseModel):
    videoUrl: str

class SessionResponse(BaseModel):
    sessionId: str
    status: str

class GPUMetrics(BaseModel):
    gpu_util: float = 0.0
    memory_used: float = 0.0
    temperature: float = 0.0

class LiveAlert(BaseModel):
    severity: str = "low"
    title: str = ""
    description: str = ""
    recommendation: str = ""
    timestamp: str = ""

class AnalysisResult(BaseModel):
    is_surgical_scene: bool = False
    feed_quality: str = "clear"
    scene_observed: str = ""
    phase: str = ""
    risk_level: str = "standby"
    safety_score: Optional[int] = None
    efficiency_score: Optional[int] = None
    skill_score: Optional[int] = None
    anatomy_identified: List[str] = []
    instruments_detected: List[str] = []
    safety_concerns: List[str] = []
    alerts: List[Dict[str, Any]] = []
    education_tips: List[str] = []
    guidance_tip: str = ""
    timestamp: float = 0.0

class FrameAnalysisRequest(BaseModel):
    sessionId: str
    timestamp: float
    imageBase64: str
    procedureType: Optional[str] = "Laparoscopic Cholecystectomy"
    surgeonName: Optional[str] = ""
    frameMetrics: Optional[Dict[str, Any]] = None

class FrameAnalysisResponse(BaseModel):
    timestamp: float
    analysis: AnalysisResult
    gpu_metrics: Optional[GPUMetrics] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    sessionId: str
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str

class ClinicalReportRequest(BaseModel):
    sessionId: str

class ClinicalReportResponse(BaseModel):
    report: str

class VideoAnalysisRequest(BaseModel):
    video_id: str
    video_details: Dict[str, Any]
