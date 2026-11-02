import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.models.models import (
    Document, DocumentPage, OCRLine, Translation, TextVersion,
    Entity, Job, JobStatus, DocStatus
)
from app.schemas.schemas import DocumentCreate, OCRLineUpdate, TranslationUpdate, RevertRequest
from app.services.document_service import DocumentService
from app.services.pipeline.orchestrator import DocumentPipeline
from app.services.pipeline.export import (
    export_document_as_txt,
    export_document_as_json,
    export_document_as_alto_xml
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_test_session():
    await engine.dispose()
    async with AsyncSessionLocal() as session:
        yield session
    await engine.dispose()

@pytest.mark.asyncio
async def test_full_pipeline_upload_to_ready():
    async with get_test_session() as session:
        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        # 1. Create document
        doc_in = DocumentCreate(
            title="Adalaj Foundation Tablet Test",
            language_hint="gu",
            doc_type="inscription",
            source="ASI Field Survey Epigraphy Series",
            licence="CC-BY-4.0",
            mime="image/jpeg",
            ocr_engine="fake",
            translation_engine="fake"
        )
        fake_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 200

        doc, job = await doc_service.create_document_and_enqueue_job(doc_in, file_bytes=fake_bytes, run_async=False)
        assert doc.id is not None
        assert job.id is not None
        assert job.status == JobStatus.queued.value

        # 2. Run pipeline
        finished_job = await pipeline.run(job_id=job.id, file_bytes=fake_bytes)
        assert finished_job.status == JobStatus.succeeded.value
        assert finished_job.progress == 100
        assert finished_job.stage == "done"

        # 3. Verify Document and child records in DB
        doc_fetched = await doc_service.get_document(doc.id)
        assert doc_fetched is not None
        assert doc_fetched.status in (DocStatus.ready.value, DocStatus.needs_review.value)
        assert len(doc_fetched.pages) >= 1

        page = doc_fetched.pages[0]
        assert len(page.ocr_lines) >= 4
        # Verify bounding box is normalized [0, 1]
        for l in page.ocr_lines:
            assert 0.0 <= l.bbox_x <= 1.0
            assert 0.0 <= l.bbox_y <= 1.0
            assert 0.0 <= l.bbox_w <= 1.0
            assert 0.0 <= l.bbox_h <= 1.0
            assert l.confidence > 0.0

        # Verify translations created
        assert len(page.translations) >= 4
        assert "Adalaj" in page.translations[1].text or "1555" in page.translations[0].text

@pytest.mark.asyncio
async def test_pipeline_idempotency_checkpoints():
    async with get_test_session() as session:
        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        doc_in = DocumentCreate(
            title="Idempotency Validation Folio",
            language_hint="hi",
            doc_type="printed",
            source="Test Idempotency Source",
            ocr_engine="fake",
            translation_engine="fake"
        )
        doc, job = await doc_service.create_document_and_enqueue_job(doc_in, run_async=False)

        # First run
        await pipeline.run(job_id=job.id)

        # Check line count
        doc1 = await doc_service.get_document(doc.id)
        count1 = sum(len(p.ocr_lines) for p in doc1.pages)
        assert count1 >= 4

        # Second run (simulating resume / idempotent re-trigger)
        # Reset job status to retrying to simulate resume
        job_db = (await session.execute(select(Job).where(Job.id == job.id))).scalars().first()
        job_db.status = "retrying"
        await session.commit()

        await pipeline.run(job_id=job.id)

        # Check line count did not duplicate!
        doc2 = await doc_service.get_document(doc.id)
        count2 = sum(len(p.ocr_lines) for p in doc2.pages)
        assert count1 == count2, f"Lines were duplicated: {count1} vs {count2}"

@pytest.mark.asyncio
async def test_dead_letter_queue_on_fatal_failure():
    async with get_test_session() as session:
        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        # Document with invalid file payload to force failure
        doc_in = DocumentCreate(
            title="Corrupted File Folio",
            language_hint="hi",
            doc_type="printed",
            source="Corrupted Input"
        )
        doc, job = await doc_service.create_document_and_enqueue_job(doc_in, run_async=False)

        # Set attempts to 2 so next failure exceeds threshold (3) -> lands in DLQ ('dead')
        job_db = (await session.execute(select(Job).where(Job.id == job.id))).scalars().first()
        job_db.attempts = 2
        # Point to non-existent document_id in payload to trigger exception
        job_db.payload = {"document_id": "non_existent_uuid"}
        await session.commit()

        with pytest.raises(ValueError):
            await pipeline.run(job_id=job.id)

        # Verify job landed in DLQ (dead)
        job_reloaded = (await session.execute(select(Job).where(Job.id == job.id))).scalars().first()
        assert job_reloaded.status == JobStatus.dead.value
        assert job_reloaded.attempts >= 3

@pytest.mark.asyncio
async def test_corrections_versioning_and_revert():
    async with get_test_session() as session:
        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        doc_in = DocumentCreate(
            title="Folio for Corrections & Versions Test",
            language_hint="hi",
            doc_type="printed",
            source="Epigraphy Wing",
            ocr_engine="fake",
            translation_engine="fake"
        )
        doc, job = await doc_service.create_document_and_enqueue_job(doc_in, run_async=False)
        await pipeline.run(job_id=job.id)

        doc_loaded = await doc_service.get_document(doc.id)
        target_line = doc_loaded.pages[0].ocr_lines[0]
        original_text = target_line.text

        # 1. Human inline correction
        corrected_text = "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय [संशोधित संस्करण]"
        update_res = await doc_service.update_line_text(
            line_id=target_line.id,
            update_data=OCRLineUpdate(
                text=corrected_text,
                reason="Corrected conjunct consonant ligature",
                edited_by="senior_epigraphist"
            )
        )

        assert update_res.text == corrected_text
        assert update_res.is_corrected is True
        assert update_res.version == 2

        # 2. Check text_versions audit row
        history = await doc_service.get_document_version_history(doc.id)
        assert len(history) >= 1
        assert history[0].entity_type == "line"
        assert history[0].version_no == 1
        assert history[0].text == original_text
        assert history[0].edited_by == "senior_epigraphist"

        # 3. Revert to version 1
        revert_success = await doc_service.revert_version(
            RevertRequest(
                entity_type="line",
                entity_id=target_line.id,
                version_no=1,
                reason="Reverting to raw OCR baseline"
            )
        )
        assert revert_success is True

        # Verify line text restored to original
        doc_reverted = await doc_service.get_document(doc.id)
        line_restored = doc_reverted.pages[0].ocr_lines[0]
        assert line_restored.text == original_text
        assert line_restored.version == 3

@pytest.mark.asyncio
async def test_export_formats_txt_json_alto():
    async with get_test_session() as session:
        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        doc_in = DocumentCreate(
            title="Export Validation Manuscript",
            language_hint="hi",
            doc_type="printed",
            source="ASI Rare Book Repository",
            ocr_engine="fake",
            translation_engine="fake"
        )
        doc, job = await doc_service.create_document_and_enqueue_job(doc_in, run_async=False)
        await pipeline.run(job_id=job.id)

        doc_loaded = await doc_service.get_document(doc.id)

        # TXT
        txt_out = export_document_as_txt(doc_loaded)
        assert "# Export Validation Manuscript" in txt_out
        assert "[01]" in txt_out

        # JSON
        json_out = export_document_as_json(doc_loaded)
        assert '"title": "Export Validation Manuscript"' in json_out
        assert '"bbox"' in json_out

        # ALTO-XML
        xml_out = export_document_as_alto_xml(doc_loaded)
        assert '<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#"' in xml_out
        assert "<TextBlock" in xml_out
        assert "<TextLine" in xml_out
        assert "<String" in xml_out
