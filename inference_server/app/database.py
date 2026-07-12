import os
import json
import logging
from typing import List, Dict, Any, Optional
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL")

logger = logging.getLogger(__name__)

async def get_db_pool():
    if not DATABASE_URL:
        return None
    if not hasattr(get_db_pool, 'pool') or get_db_pool.pool is None:
        try:
            get_db_pool.pool = await asyncpg.create_pool(DATABASE_URL)
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return None
    return get_db_pool.pool

async def create_session(session_id: str, video_url: str):
    pool = await get_db_pool()
    if not pool: return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO sessions (id, video_url, status) VALUES ($1, $2, 'created') ON CONFLICT (id) DO NOTHING",
                session_id, video_url
            )
    except Exception as e:
        logger.error(f"DB Error create_session: {e}")

async def update_session_status(session_id: str, status: str):
    pool = await get_db_pool()
    if not pool: return
    try:
        async with pool.acquire() as conn:
            await conn.execute("UPDATE sessions SET status = $1 WHERE id = $2", status, session_id)
    except Exception as e:
        logger.error(f"DB Error update_session_status: {e}")

async def insert_frame_analysis(session_id: str, timestamp: float, data: dict):
    pool = await get_db_pool()
    if not pool: return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO frame_analyses (session_id, timestamp, data) VALUES ($1, $2, $3)",
                session_id, timestamp, json.dumps(data)
            )
    except Exception as e:
        logger.error(f"DB Error insert_frame_analysis: {e}")

async def insert_black_box_entry(session_id: str, entry: dict):
    pool = await get_db_pool()
    if not pool: return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO black_box_entries (session_id, entry_data) VALUES ($1, $2)",
                session_id, json.dumps(entry)
            )
    except Exception as e:
        logger.error(f"DB Error insert_black_box_entry: {e}")

async def get_clinical_report(session_id: str) -> Optional[str]:
    pool = await get_db_pool()
    if not pool: return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT report FROM clinical_reports WHERE session_id = $1", session_id)
            if row:
                return row['report']
    except Exception as e:
        logger.error(f"DB Error get_clinical_report: {e}")
    return None

async def save_clinical_report(session_id: str, report: str):
    pool = await get_db_pool()
    if not pool: return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO clinical_reports (session_id, report) VALUES ($1, $2) ON CONFLICT (session_id) DO UPDATE SET report = EXCLUDED.report",
                session_id, report
            )
    except Exception as e:
        logger.error(f"DB Error save_clinical_report: {e}")

async def get_frame_analyses(session_id: str) -> List[dict]:
    pool = await get_db_pool()
    if not pool: return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT data FROM frame_analyses WHERE session_id = $1 ORDER BY timestamp ASC", session_id)
            return [json.loads(row['data']) for row in rows]
    except Exception as e:
        logger.error(f"DB Error get_frame_analyses: {e}")
    return []

async def get_black_box_entries(session_id: str) -> List[dict]:
    pool = await get_db_pool()
    if not pool: return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT entry_data FROM black_box_entries WHERE session_id = $1 ORDER BY created_at ASC", session_id)
            return [json.loads(row['entry_data']) for row in rows]
    except Exception as e:
        logger.error(f"DB Error get_black_box_entries: {e}")
    return []

async def cleanup_old_data_task():
    import asyncio
    while True:
        try:
            pool = await get_db_pool()
            if pool:
                async with pool.acquire() as conn:
                    # Clean up old videos from storage bucket
                    await conn.execute("""
                        DELETE FROM storage.objects 
                        WHERE bucket_id = 'videos' 
                        AND name IN (
                            SELECT split_part(video_url, '/', -1)
                            FROM public."SurgeryVideo"
                            WHERE created_date < timezone('utc'::text, now()) - interval '8 hours'
                            AND video_url IS NOT NULL
                        )
                    """)
                    # Delete the video records (AnalysisResult cascades)
                    deleted = await conn.execute("""
                        DELETE FROM public."SurgeryVideo" 
                        WHERE created_date < timezone('utc'::text, now()) - interval '8 hours'
                    """)
                    logger.info(f"Cleanup task completed: {deleted} videos/analyses older than 8 hours deleted")
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)
