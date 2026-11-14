import os, time, json, litellm
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_db_pool

router = APIRouter(prefix="/api/anatomy", tags=["anatomy"])

class ScanReq(BaseModel):
    image_base64: str
    region: Optional[str] = "Abdominal / Laparoscopic"
    scan_mode: Optional[str] = "surface"
    notes: Optional[str] = ""
    actor_email: Optional[str] = "clinician@medicast.local"

@router.post("/scan")
async def scan_anatomy(body: ScanReq):
    if not body.image_base64.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Expected base64 image")
    t0 = time.time()
    model = os.getenv("VISION_MODEL", "openai/qwen3.8-27b")
    focus = "CT/MRI/X-ray/ultrasound slice (label organs, vessels, bones)" if body.scan_mode == "medical_imaging" else "external surface anatomy only"
    prompt = f"Pre-op surgical assistant reviewing {focus}. Region: {body.region}. Notes: {body.notes or 'None'}. Return ONLY JSON: anatomical_region, visible_landmarks (array), positioning_and_lighting, reference_zones (array), uncertainty_notes."
    try:
        r = await litellm.acompletion(model=model, messages=[{"role":"user","content":[{"type":"text","text":prompt},{"type":"image_url","image_url":{"url":body.image_base64}}]}], max_tokens=700)
        raw = r.choices[0].message.content.strip().strip("`").lstrip("json").strip()
        try: parsed = json.loads(raw)
        except Exception: parsed = {"anatomical_region": body.region, "visible_landmarks": [raw], "positioning_and_lighting": "See summary", "reference_zones": [], "uncertainty_notes": "Non-diagnostic; verify clinically."}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    ms = int((time.time() - t0) * 1000)
    pool = await get_db_pool()
    if pool:
        try:
            async with pool.acquire() as c:
                await c.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1,'anatomy_scan',$2,$3)", (body.actor_email or "user").lower(), f"{body.scan_mode}:{body.region}", f"{ms}ms")
        except Exception: pass
    return {"status": "ok", "model": model, "latency_ms": ms, "analysis": parsed}
from fastapi import UploadFile, File, Form
import io, base64, numpy as np, pydicom
from PIL import Image

@router.post("/scan-dicom")
async def scan_dicom(file: UploadFile = File(...), region: str = Form("Abdominal / Laparoscopic"), notes: str = Form(""), actor_email: str = Form("clinician@medicast.local")):
    raw_bytes = await file.read()
    try:
        ds = pydicom.dcmread(io.BytesIO(raw_bytes))
        arr = ds.pixel_array.astype(float)
        if arr.ndim == 3:
            arr = arr[arr.shape[0] // 2]
        arr = ((arr - arr.min()) / max(arr.max() - arr.min(), 1e-5) * 255.0).astype(np.uint8)
        buf = io.BytesIO()
        Image.fromarray(arr).convert("RGB").save(buf, format="PNG")
        data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid DICOM file: {e}")
    res = await scan_anatomy(ScanReq(image_base64=data_url, region=region, scan_mode="medical_imaging", notes=notes, actor_email=actor_email))
    res["preview_data_url"] = data_url
    return res
