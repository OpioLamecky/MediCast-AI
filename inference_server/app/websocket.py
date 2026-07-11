import os
import json
import logging
import redis.asyncio as redis_async
from typing import Dict, Any

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")

async def get_redis():
    if not REDIS_URL:
        return None
    if not hasattr(get_redis, 'client') or get_redis.client is None:
        try:
            get_redis.client = await redis_async.from_url(REDIS_URL)
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return None
    return get_redis.client

async def publish_analysis(session_id: str, data: Dict[str, Any]):
    redis = await get_redis()
    if not redis:
        # If no Redis, just log it as a fallback
        logger.info(f"Mock publish to session {session_id}: {data}")
        return
    
    try:
        channel = f"session_{session_id}"
        await redis.publish(channel, json.dumps(data))
    except Exception as e:
        logger.error(f"Failed to publish analysis to Redis: {e}")
