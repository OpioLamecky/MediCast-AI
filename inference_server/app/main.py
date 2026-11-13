import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env variables with override=True so it picks up changes immediately!
load_dotenv(override=True)

from .analyze import router as analyze_router
from .ai_assistant import router as ai_router
from .payment import router as payment_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MediCast Inference Server",
    description="Autonomous Surgical Video Intelligence API"
)

# Allow all origins for the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "https://155.138.162.68.sslip.io").split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(payment_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

from .database import cleanup_old_data_task
import asyncio

@app.on_event("startup")
async def startup_event():
    logger.info("Starting MediCast Inference Server...")
    asyncio.create_task(cleanup_old_data_task())
