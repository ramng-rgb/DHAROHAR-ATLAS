import json
import asyncio
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db, AsyncSessionLocal
from app.models.models import Job, JobStatus
from app.schemas.schemas import JobResponse
from app.services.pipeline.orchestrator import (
    register_job_listener,
    unregister_job_listener,
    DocumentPipeline
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@router.get("/{job_id}/events")
async def stream_job_events(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Server-Sent Events (SSE) streaming pipeline stage and progress updates in real-time.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    async def event_generator() -> AsyncGenerator[str, None]:
        q = register_job_listener(job_id)
        try:
            # Yield initial snapshot immediately
            init_event = {
                "job_id": job.id,
                "status": job.status,
                "stage": job.stage or "queued",
                "progress": job.progress or 0,
                "error": job.error,
                "result": job.result
            }
            yield f"data: {json.dumps(init_event)}\n\n"

            if job.status in ("succeeded", "dead"):
                return

            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("status") in ("succeeded", "dead"):
                        break
                except asyncio.TimeoutError:
                    # Heartbeat ping
                    yield f": keep-alive\n\n"
        finally:
            unregister_job_listener(job_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/{job_id}/requeue", response_model=JobResponse)
async def requeue_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Admin endpoint to requeue failed or dead-letter jobs.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job.status = JobStatus.queued.value
    job.attempts = 0
    job.error = None
    job.progress = 0
    job.stage = "queued"
    await db.commit()
    await db.refresh(job)

    # Spawn background resumption
    async def _resume():
        async with AsyncSessionLocal() as session:
            pipeline = DocumentPipeline(session)
            try:
                await pipeline.run(job_id=job.id)
            except Exception as e:
                logger.error("Requeued job %s failed: %s", job.id, e)

    asyncio.create_task(_resume())
    return job
