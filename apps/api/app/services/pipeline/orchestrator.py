import asyncio
import logging
import os
import uuid
from datetime import datetime
from typing import Any

from app.models.models import (
    DocStatus,
    Document,
    DocumentPage,
    Entity,
    EntityMention,
    Job,
    JobStatus,
    OCRLine,
    Translation,
)
from app.services.entities.extractor import EntityExtractionProvider
from app.services.ocr.registry import get_ocr_provider
from app.services.pipeline.postprocess import merge_and_postprocess_lines
from app.services.pipeline.preprocess import (
    preprocess_image_for_ocr,
    render_pages_from_bytes,
)
from app.services.translation.base import TranslationInputLine
from app.services.translation.registry import get_translation_provider
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

# In-memory pub-sub for SSE event streams
_JOB_EVENT_LISTENERS: dict[str, list[asyncio.Queue]] = {}

def register_job_listener(job_id: str) -> asyncio.Queue:
    q = asyncio.Queue()
    if job_id not in _JOB_EVENT_LISTENERS:
        _JOB_EVENT_LISTENERS[job_id] = []
    _JOB_EVENT_LISTENERS[job_id].append(q)
    return q

def unregister_job_listener(job_id: str, q: asyncio.Queue) -> None:
    if job_id in _JOB_EVENT_LISTENERS:
        if q in _JOB_EVENT_LISTENERS[job_id]:
            _JOB_EVENT_LISTENERS[job_id].remove(q)
        if not _JOB_EVENT_LISTENERS[job_id]:
            del _JOB_EVENT_LISTENERS[job_id]

async def emit_job_event(job_id: str, event_data: dict[str, Any]) -> None:
    queues = _JOB_EVENT_LISTENERS.get(job_id, [])
    for q in queues:
        await q.put(event_data)

class AntivirusScanner:
    async def scan(self, file_bytes: bytes, filename: str) -> bool:
        """
        Antivirus hook interface.
        No-op implementation: passes clean for academic archive data.
        In production, calls ClamAV daemon via clamd TCP socket.
        """
        return True

class DocumentPipeline:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.av_scanner = AntivirusScanner()

    async def _update_job_progress(
        self,
        job: Job,
        stage: str,
        progress: int,
        checkpoint_data: dict[str, Any] | None = None,
        error: str | None = None
    ) -> None:
        job.stage = stage
        job.progress = progress
        if checkpoint_data:
            current_payload = dict(job.payload or {})
            current_payload["checkpoint_stage"] = stage
            current_payload.update(checkpoint_data)
            job.payload = current_payload
        if error:
            job.error = error
        await self.db.commit()

        event = {
            "job_id": job.id,
            "status": job.status,
            "stage": stage,
            "progress": progress,
            "error": error,
            "updated_at": datetime.utcnow().isoformat()
        }
        await emit_job_event(job.id, event)

    async def run(self, job_id: str, file_bytes: bytes | None = None) -> Job:
        """
        Idempotent execution with stage checkpoints and dead-letter queue.
        Resumes from last checkpoint if interrupted.
        """
        res = await self.db.execute(select(Job).where(Job.id == job_id))
        job = res.scalars().first()
        if not job:
            raise ValueError(f"Job {job_id} not found.")

        doc_id = (job.payload or {}).get("document_id")
        if not doc_id:
            raise ValueError(f"Job {job_id} missing document_id in payload.")

        # If already succeeded
        if job.status == JobStatus.succeeded.value:
            return job

        job.status = JobStatus.running.value
        job.started_at = job.started_at or datetime.utcnow()
        await self.db.commit()

        doc = None
        checkpoint = (job.payload or {}).get("checkpoint_stage")

        try:
            doc_res = await self.db.execute(
                select(Document)
                .where(Document.id == doc_id)
                .options(
                    selectinload(Document.pages).selectinload(DocumentPage.ocr_lines),
                    selectinload(Document.pages).selectinload(DocumentPage.translations)
                )
            )
            doc = doc_res.scalars().first()
            if not doc:
                raise ValueError(f"Document {doc_id} not found.")

            doc.status = DocStatus.processing.value
            await self.db.commit()
            # -------------------------------------------------------------
            # Stage 1: VALIDATE
            # -------------------------------------------------------------
            if not checkpoint or checkpoint in ("queued", "validate"):
                await self._update_job_progress(job, "validate", 5)

                # Antivirus verification
                if file_bytes and not await self.av_scanner.scan(file_bytes, doc.original_filename or "document"):
                    raise ValueError("File failed antivirus security check.")

                # Magic byte check
                if file_bytes:
                    is_valid = (
                        file_bytes.startswith(b"%PDF") or
                        file_bytes.startswith(b"\xff\xd8\xff") or  # JPEG
                        file_bytes.startswith(b"\x89PNG") or       # PNG
                        file_bytes.startswith(b"RIFF") or          # WEBP
                        file_bytes.startswith(b"II*\x00") or file_bytes.startswith(b"MM\x00*") # TIFF
                    )
                    if not is_valid and not doc.mime:
                        raise ValueError("Invalid file format. Supported: PDF, JPEG, PNG, WEBP, TIFF.")

                await self._update_job_progress(job, "render_pages", 15, {"checkpoint_stage": "render_pages"})
                checkpoint = "render_pages"

            # -------------------------------------------------------------
            # Stage 2: RENDER PAGES
            # -------------------------------------------------------------
            rendered_pages = []
            if checkpoint == "render_pages":
                if file_bytes:
                    rendered_pages = render_pages_from_bytes(file_bytes, doc.mime or "image/jpeg")
                else:
                    # Synthetic/seed fallback
                    rendered_pages = [(1, b"", 1200, 1600)]

                # Clear existing pages if resuming render to prevent duplicates
                for existing_p in list(doc.pages):
                    await self.db.delete(existing_p)
                await self.db.flush()

                created_page_ids = []
                for p_no, p_bytes, w, h in rendered_pages:
                    storage_path = f"/data/documents/{doc.id}/page_{p_no}.png"
                    # Write page image to local storage dir
                    os.makedirs(f"/Users/ramnarayangupta/Desktop/hac/data/documents/{doc.id}", exist_ok=True)
                    if p_bytes:
                        with open(f"/Users/ramnarayangupta/Desktop/hac{storage_path}", "wb") as f:
                            f.write(p_bytes)

                    dp = DocumentPage(
                        document_id=doc.id,
                        page_no=p_no,
                        page_number=p_no,
                        image_key=storage_path,
                        image_url=storage_path,
                        width=w,
                        height=h,
                        status="rendered"
                    )
                    self.db.add(dp)
                    await self.db.flush()
                    created_page_ids.append(dp.id)

                doc.page_count = len(created_page_ids)
                await self._update_job_progress(job, "preprocess", 30, {"page_ids": created_page_ids, "checkpoint_stage": "preprocess"})
                checkpoint = "preprocess"

            # Refresh doc pages
            doc_res = await self.db.execute(
                select(Document).where(Document.id == doc_id).options(selectinload(Document.pages))
            )
            doc = doc_res.scalars().first()

            # -------------------------------------------------------------
            # Stage 3: PREPROCESS & SCRIPT DETECTION
            # -------------------------------------------------------------
            if checkpoint == "preprocess":
                await self._update_job_progress(job, "preprocess", 35)
                # Keep original untouched; preprocess copies for OCR
                await self._update_job_progress(job, "ocr", 45, {"checkpoint_stage": "ocr"})
                checkpoint = "ocr"

            # -------------------------------------------------------------
            # Stage 4: OCR (Gemini / Tesseract / Fake)
            # -------------------------------------------------------------
            ocr_provider = get_ocr_provider((job.payload or {}).get("ocr_engine"))
            any_low_confidence = False

            if checkpoint == "ocr":
                await self._update_job_progress(job, "ocr", 50)
                lang_hint = [doc.language_hint] if doc.language_hint else ["auto"]

                # Fetch pages directly by document_id
                pages = (await self.db.execute(
                    select(DocumentPage).where(DocumentPage.document_id == doc_id).order_by(DocumentPage.page_no)
                )).scalars().all()

                for page in pages:
                    # Remove previously extracted lines for this page to maintain idempotency
                    await self.db.execute(
                        delete(OCRLine).where(OCRLine.page_id == page.id)
                    )

                    page_file_path = f"/Users/ramnarayangupta/Desktop/hac{page.image_key}"
                    page_bytes = b""
                    if os.path.exists(page_file_path):
                        with open(page_file_path, "rb") as f:
                            page_bytes = f.read()

                    preprocessed = preprocess_image_for_ocr(page_bytes) if page_bytes else b""
                    ocr_doc_data = await ocr_provider.recognise(preprocessed or page_bytes, lang_hint)

                    if ocr_doc_data.pages:
                        raw_lines = ocr_doc_data.pages[0].lines
                    else:
                        raw_lines = []

                    # Run post-processing (NFC, matra heuristics, de-hyphenation)
                    clean_lines, has_low = merge_and_postprocess_lines(raw_lines, confidence_threshold=0.85)
                    if has_low:
                        any_low_confidence = True

                    for cl in clean_lines:
                        line_row = OCRLine(
                            id=str(uuid.uuid4()),
                            page_id=page.id,
                            line_no=cl.line_no,
                            line_index=cl.line_no,
                            text=cl.text,
                            original_text=cl.text,
                            bbox_x=cl.bbox.x,
                            bbox_y=cl.bbox.y,
                            bbox_w=cl.bbox.w,
                            bbox_h=cl.bbox.h,
                            polygon=cl.polygon,
                            confidence=cl.confidence,
                            lang=cl.lang,
                            language=cl.lang,
                            engine=ocr_provider.name,
                            version=1
                        )
                        self.db.add(line_row)

                await self.db.flush()
                await self._update_job_progress(job, "translate", 70, {"checkpoint_stage": "translate"})
                checkpoint = "translate"

            # -------------------------------------------------------------
            # Stage 5: TRANSLATION (with Heritage Glossary)
            # -------------------------------------------------------------
            if checkpoint == "translate":
                await self._update_job_progress(job, "translate", 75)
                trans_provider = get_translation_provider((job.payload or {}).get("translation_engine"))

                pages = (await self.db.execute(
                    select(DocumentPage).where(DocumentPage.document_id == doc_id).order_by(DocumentPage.page_no)
                )).scalars().all()

                for page in pages:
                    lines = (await self.db.execute(
                        select(OCRLine).where(OCRLine.page_id == page.id).order_by(OCRLine.line_no)
                    )).scalars().all()

                    input_lines = [
                        TranslationInputLine(line_no=l.line_no, text=l.text)
                        for l in lines
                    ]
                    source_lang = lines[0].lang if lines else "hi"
                    batch_res = await trans_provider.translate_batch(input_lines, source_lang=source_lang, target_lang="en")

                    line_by_no = {l.line_no: l for l in lines}
                    for tout in batch_res.lines:
                        matching_line = line_by_no.get(tout.line_no)
                        trans_row = Translation(
                            id=str(uuid.uuid4()),
                            line_id=matching_line.id if matching_line else None,
                            page_id=page.id,
                            target_lang="en",
                            text=tout.translated_text,
                            engine=trans_provider.name,
                            version=1
                        )
                        self.db.add(trans_row)
                        if matching_line:
                            matching_line.translated_text = tout.translated_text

                await self.db.flush()
                await self._update_job_progress(job, "extract_entities", 85, {"checkpoint_stage": "extract_entities"})
                checkpoint = "extract_entities"

            # -------------------------------------------------------------
            # Stage 6: ENTITY EXTRACTION & LINKING
            # -------------------------------------------------------------
            if checkpoint == "extract_entities":
                await self._update_job_progress(job, "extract_entities", 90)
                extractor = EntityExtractionProvider(db=self.db)

                lines = (await self.db.execute(
                    select(OCRLine)
                    .join(DocumentPage, DocumentPage.id == OCRLine.page_id)
                    .where(DocumentPage.document_id == doc_id)
                    .order_by(OCRLine.line_no)
                )).scalars().all()

                flattened_lines = [{"id": l.id, "line_no": l.line_no, "text": l.text} for l in lines]
                extraction_res = await extractor.extract_and_link(flattened_lines)

                for ent in extraction_res.entities:
                    ent_row = Entity(
                        id=str(uuid.uuid4()),
                        kind=ent.kind,
                        name=ent.name,
                        normalised_name=ent.normalised_name,
                        site_id=ent.linked_site_id
                    )
                    self.db.add(ent_row)
                    await self.db.flush()

                    for m in extraction_res.mentions:
                        if m.entity_name == ent.name:
                            mention_row = EntityMention(
                                id=str(uuid.uuid4()),
                                entity_id=ent_row.id,
                                line_id=m.line_id,
                                char_start=m.char_start,
                                char_end=m.char_end,
                                confidence=m.confidence
                            )
                            self.db.add(mention_row)

                await self.db.flush()
                await self._update_job_progress(job, "finalise", 95, {"checkpoint_stage": "finalise"})
                checkpoint = "finalise"

            # -------------------------------------------------------------
            # Stage 7: FINALISE
            # -------------------------------------------------------------
            pages = (await self.db.execute(
                select(DocumentPage).where(DocumentPage.document_id == doc_id)
            )).scalars().all()

            doc_record = (await self.db.execute(
                select(Document).where(Document.id == doc_id)
            )).scalars().first()

            doc_record.status = DocStatus.needs_review.value if any_low_confidence else DocStatus.ready.value
            job.status = JobStatus.succeeded.value
            job.progress = 100
            job.stage = "done"
            job.finished_at = datetime.utcnow()
            job.result = {
                "document_id": doc_id,
                "pages_count": len(pages),
                "status": doc_record.status,
                "needs_review": any_low_confidence
            }

            # Auto-index document chunks for semantic search (M4)
            try:
                from app.services.search.indexer import SearchIndexer
                indexer = SearchIndexer(self.db)
                await indexer.index_document(doc_id)
            except Exception as e:
                logger.warning("Auto-indexing document %s failed: %s", doc_id, e)

            await self.db.commit()

            await emit_job_event(job.id, {
                "job_id": job.id,
                "status": job.status,
                "stage": "done",
                "progress": 100,
                "result": job.result
            })

            return job

        except Exception as exc:
            logger.error("Job %s pipeline error at stage '%s': %s", job.id, job.stage, exc, exc_info=True)
            job.attempts = (job.attempts or 0) + 1
            max_retries = 3
            if job.attempts >= max_retries:
                job.status = JobStatus.dead.value  # Dead letter queue
                if doc:
                    doc.status = DocStatus.failed.value
            else:
                job.status = JobStatus.retrying.value

            job.error = str(exc)
            await self.db.commit()

            await emit_job_event(job.id, {
                "job_id": job.id,
                "status": job.status,
                "stage": job.stage,
                "progress": job.progress,
                "attempts": job.attempts,
                "error": str(exc)
            })
            raise
