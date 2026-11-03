#!/usr/bin/env python3
"""
Dharohar Atlas: Background Async Worker
Pulls pending document processing jobs from the database/queue and executes the DocumentPipeline.
"""

import asyncio
import logging
import signal
import sys
from app.core.database import AsyncSessionLocal
from app.models.models import Job, JobStatus
from app.services.pipeline.orchestrator import DocumentPipeline
from sqlalchemy.future import select

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [worker] %(message)s"
)
logger = logging.getLogger("dharohar.worker")

_RUNNING = True

def handle_stop_signal(sig, frame):
    global _RUNNING
    logger.info("Received termination signal %s. Shutting down worker gracefully...", sig)
    _RUNNING = False

async def worker_loop():
    logger.info("Dharohar Atlas async worker initialized. Polling for queued extraction jobs...")
    
    while _RUNNING:
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Job).where(Job.status == JobStatus.QUEUED).limit(1)
                res = await session.execute(stmt)
                job = res.scalars().first()
                
                if job:
                    logger.info("Dispatched queued job %s (document_id=%s)", job.id, job.document_id)
                    pipeline = DocumentPipeline(session)
                    await pipeline.run(job.id)
                    logger.info("Completed job %s (status=%s)", job.id, job.status.value)
                else:
                    await asyncio.sleep(2.0)
        except Exception as e:
            logger.error("Error in worker loop: %s", e, exc_info=True)
            await asyncio.sleep(5.0)

    logger.info("Worker process exited cleanly.")

def main():
    signal.signal(signal.SIGINT, handle_stop_signal)
    signal.signal(signal.SIGTERM, handle_stop_signal)
    asyncio.run(worker_loop())

if __name__ == "__main__":
    main()
