import os, uuid
from datetime import date
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.database import get_db_pool

router = APIRouter(prefix="/api/history", tags=["history"])
MEDIA_DIR = "/opt/MediCast-AI/media/operations"
os.makedirs(MEDIA_DIR, exist_ok=True)

async def ensure_history_table(pool):
    async with pool.acquire() as c:
        await c.execute("""
            CREATE TABLE IF NOT EXISTS operation_history (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                procedure_type TEXT DEFAULT 'General Surgery',
                source_type TEXT DEFAULT 'live',
                video_url TEXT NOT NULL,
                duration_sec INTEGER DEFAULT 0,
                safety_score INTEGER DEFAULT 0,
                actor_email TEXT DEFAULT '',
                operation_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

@router.post("/upload")
async def save_operation_video(
    file: UploadFile = File(...),
    title: str = Form("Surgical Operation"),
    procedure_type: str = Form("General Surgery"),
    source_type: str = Form("live"),
    operation_date: str = Form(""),
    duration_sec: int = Form(0),
    safety_score: int = Form(0),
    actor_email: str = Form("clinician@medicast.local"),
):
    ext = os.path.splitext(file.filename or "op.webm")[1] or ".webm"
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(MEDIA_DIR, fname)
    with open(fpath, "wb") as out:
        out.write(await file.read())
    vurl = f"/api/history/video/{fname}"
    op_date = date.fromisoformat(operation_date) if operation_date else date.today()
    pool = await get_db_pool()
    if pool:
        await ensure_history_table(pool)
        async with pool.acquire() as c:
            await c.execute(
                "INSERT INTO operation_history (title, procedure_type, source_type, video_url, duration_sec, safety_score, actor_email, operation_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                title, procedure_type, source_type, vurl, duration_sec, safety_score, actor_email.lower(), op_date
            )
    return {"status": "saved", "video_url": vurl, "operation_date": str(op_date)}

@router.get("/video/{fname}")
async def serve_video(fname: str):
    fpath = os.path.join(MEDIA_DIR, os.path.basename(fname))
    return FileResponse(fpath)

@router.get("")
async def list_history():
    pool = await get_db_pool()
    rows = []
    if pool:
        await ensure_history_table(pool)
        async with pool.acquire() as c:
            recs = await c.fetch("SELECT id, title, procedure_type, source_type, video_url, duration_sec, safety_score, actor_email, operation_date::text AS operation_date, created_at FROM operation_history ORDER BY operation_date DESC, created_at DESC")
            rows = [dict(r) for r in recs]
    grouped = {}
    for r in rows:
        grouped.setdefault(r["operation_date"], []).append(r)
    return {"dates": [{"date": d, "operations": ops} for d, ops in grouped.items()]}
