import os
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.models import (
    Document, DocumentPage, OCRLine, Translation, TextVersion,
    Entity, EntityMention, Job, JobStatus, DocStatus, Site
)
from app.schemas.schemas import DocumentCreate, OCRLineUpdate, TranslationUpdate, RevertRequest
from app.services.pipeline.orchestrator import DocumentPipeline

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_documents(
        self,
        site_id: Optional[str] = None,
        language: Optional[str] = None,
        status: Optional[str] = None,
        doc_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Document]:
        stmt = (
            select(Document)
            .where(Document.deleted_at.is_(None))
            .options(
                selectinload(Document.site),
                selectinload(Document.pages).selectinload(DocumentPage.ocr_lines).selectinload(OCRLine.translations),
                selectinload(Document.pages).selectinload(DocumentPage.translations),
                selectinload(Document.pages).selectinload(DocumentPage.entities)
            )
            .order_by(Document.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if site_id:
            stmt = stmt.where(Document.site_id == site_id)
        if language:
            stmt = stmt.where(Document.language_hint.ilike(f"%{language}%"))
        if status:
            stmt = stmt.where(Document.status == status)
        if doc_type:
            stmt = stmt.where(Document.doc_type == doc_type)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_document(self, doc_id: str) -> Optional[Document]:
        stmt = (
            select(Document)
            .execution_options(populate_existing=True)
            .where(Document.id == doc_id, Document.deleted_at.is_(None))
            .options(
                selectinload(Document.site),
                selectinload(Document.pages).selectinload(DocumentPage.ocr_lines).selectinload(OCRLine.translations),
                selectinload(Document.pages).selectinload(DocumentPage.translations),
                selectinload(Document.pages).selectinload(DocumentPage.entities)
            )
        )
        result = await self.db.execute(stmt)
        doc = result.scalars().first()
        if not doc:
            return None

        # Fetch associated entities by querying mentions in lines of this document
        line_ids = [l.id for p in doc.pages for l in p.ocr_lines]
        if line_ids:
            ent_stmt = (
                select(Entity)
                .join(EntityMention, EntityMention.entity_id == Entity.id)
                .where(EntityMention.line_id.in_(line_ids))
                .options(selectinload(Entity.mentions))
                .distinct()
            )
            ent_res = await self.db.execute(ent_stmt)
            doc.extracted_entities = ent_res.scalars().all()
        else:
            doc.extracted_entities = []

        return doc

    async def create_document_and_enqueue_job(
        self,
        doc_in: DocumentCreate,
        file_bytes: Optional[bytes] = None,
        run_async: bool = True
    ) -> Tuple[Document, Job]:
        doc_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())
        idempotency_key = f"ocr_{doc_id}_{int(datetime.utcnow().timestamp())}"

        doc = Document(
            id=doc_id,
            title=doc_in.title,
            language_hint=doc_in.language_hint,
            language=doc_in.language_hint,
            doc_type=doc_in.doc_type,
            document_type=doc_in.doc_type,
            status=DocStatus.uploaded.value,
            site_id=doc_in.site_id,
            uploaded_by=doc_in.uploaded_by,
            source=doc_in.source,
            source_archive=doc_in.source,
            licence=doc_in.licence,
            license=doc_in.licence,
            attribution=doc_in.attribution,
            storage_key=doc_in.storage_key,
            mime=doc_in.mime or "image/jpeg",
            original_filename=doc_in.original_filename or f"{doc_in.title}.jpg",
            page_count=1
        )
        self.db.add(doc)

        job = Job(
            id=job_id,
            kind="ocr_pipeline",
            job_type="ocr_pipeline",
            status=JobStatus.queued.value,
            progress=0,
            stage="queued",
            attempts=0,
            idempotency_key=idempotency_key,
            payload={
                "document_id": doc_id,
                "ocr_engine": doc_in.ocr_engine,
                "translation_engine": doc_in.translation_engine
            }
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(doc)
        await self.db.refresh(job)

        # Trigger async pipeline task in background if run_async is True
        if run_async:
            asyncio.create_task(self._run_pipeline_background(job_id, file_bytes))

        return doc, job

    async def _run_pipeline_background(self, job_id: str, file_bytes: Optional[bytes]):
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            pipeline = DocumentPipeline(session)
            try:
                await pipeline.run(job_id=job_id, file_bytes=file_bytes)
            except Exception as e:
                pass

    async def update_line_text(
        self,
        line_id: str,
        update_data: OCRLineUpdate
    ) -> Optional[OCRLine]:
        stmt = select(OCRLine).where(OCRLine.id == line_id).options(selectinload(OCRLine.translations))
        res = await self.db.execute(stmt)
        line = res.scalars().first()
        if not line:
            return None

        new_text = update_data.text or update_data.original_text
        if new_text and new_text != line.text:
            current_ver = line.version or 1
            next_ver = current_ver + 1

            # Append-only text_versions audit
            tv = TextVersion(
                id=str(uuid.uuid4()),
                entity_type="line",
                entity_id=line.id,
                version_no=current_ver,
                text=line.text,
                edited_by=update_data.edited_by or "curator",
                edited_at=datetime.utcnow(),
                reason=update_data.reason or "Human verification inline edit"
            )
            self.db.add(tv)

            line.text = new_text
            line.original_text = new_text
            line.version = next_ver
            line.is_corrected = True

        if update_data.translated_text and line.translations:
            line.translations[0].text = update_data.translated_text
            line.translated_text = update_data.translated_text

        await self.db.commit()
        await self.db.refresh(line)

        # Trigger incremental re-index of affected document chunks (M4)
        try:
            from app.services.search.indexer import SearchIndexer
            page_stmt = select(DocumentPage).where(DocumentPage.id == line.page_id)
            page_row = (await self.db.execute(page_stmt)).scalars().first()
            if page_row:
                indexer = SearchIndexer(self.db)
                await indexer.index_document(page_row.document_id)
                await self.db.commit()
        except Exception:
            pass

        return line

    async def update_translation_text(
        self,
        translation_id: str,
        update_data: TranslationUpdate
    ) -> Optional[Translation]:
        stmt = select(Translation).where(Translation.id == translation_id)
        res = await self.db.execute(stmt)
        trans = res.scalars().first()
        if not trans:
            return None

        current_ver = trans.version or 1
        next_ver = current_ver + 1

        # Append-only text_versions audit
        tv = TextVersion(
            id=str(uuid.uuid4()),
            entity_type="translation",
            entity_id=trans.id,
            version_no=current_ver,
            text=trans.text,
            edited_by=update_data.edited_by or "curator",
            edited_at=datetime.utcnow(),
            reason=update_data.reason or "Human verification translation edit"
        )
        self.db.add(tv)

        trans.text = update_data.text
        trans.version = next_ver

        await self.db.commit()
        await self.db.refresh(trans)

        # Trigger incremental re-index of affected document chunks (M4)
        try:
            from app.services.search.indexer import SearchIndexer
            page_id = trans.page_id
            if not page_id and trans.line_id:
                line_stmt = select(OCRLine).where(OCRLine.id == trans.line_id)
                line_row = (await self.db.execute(line_stmt)).scalars().first()
                if line_row:
                    page_id = line_row.page_id
            if page_id:
                page_stmt = select(DocumentPage).where(DocumentPage.id == page_id)
                page_row = (await self.db.execute(page_stmt)).scalars().first()
                if page_row:
                    indexer = SearchIndexer(self.db)
                    await indexer.index_document(page_row.document_id)
                    await self.db.commit()
        except Exception:
            pass

        # Also update matching OCRLine.translated_text if present
        if trans.line_id:
            line_stmt = select(OCRLine).where(OCRLine.id == trans.line_id)
            line_res = await self.db.execute(line_stmt)
            l = line_res.scalars().first()
            if l:
                l.translated_text = update_data.text
                await self.db.commit()

        return trans

    async def revert_version(self, req: RevertRequest) -> bool:
        """
        Reverts a line or translation to a previous version stored in text_versions.
        """
        stmt = (
            select(TextVersion)
            .where(
                TextVersion.entity_type == req.entity_type,
                TextVersion.entity_id == req.entity_id,
                TextVersion.version_no == req.version_no
            )
        )
        res = await self.db.execute(stmt)
        tv = res.scalars().first()
        if not tv:
            return False

        if req.entity_type == "line":
            line_res = await self.db.execute(select(OCRLine).where(OCRLine.id == req.entity_id))
            line = line_res.scalars().first()
            if not line:
                return False

            # Record current before revert
            revert_audit = TextVersion(
                id=str(uuid.uuid4()),
                entity_type="line",
                entity_id=line.id,
                version_no=line.version,
                text=line.text,
                edited_by="curator_revert",
                edited_at=datetime.utcnow(),
                reason=f"Reverted to version {req.version_no}"
            )
            self.db.add(revert_audit)

            line.text = tv.text
            line.original_text = tv.text
            line.version = (line.version or 1) + 1
            line.is_corrected = True

        elif req.entity_type == "translation":
            trans_res = await self.db.execute(select(Translation).where(Translation.id == req.entity_id))
            trans = trans_res.scalars().first()
            if not trans:
                return False

            revert_audit = TextVersion(
                id=str(uuid.uuid4()),
                entity_type="translation",
                entity_id=trans.id,
                version_no=trans.version,
                text=trans.text,
                edited_by="curator_revert",
                edited_at=datetime.utcnow(),
                reason=f"Reverted to version {req.version_no}"
            )
            self.db.add(revert_audit)

            trans.text = tv.text
            trans.version = (trans.version or 1) + 1

        await self.db.commit()
        return True

    async def get_document_version_history(self, doc_id: str) -> List[TextVersion]:
        doc = await self.get_document(doc_id)
        if not doc:
            return []

        line_ids = [l.id for p in doc.pages for l in p.ocr_lines]
        trans_ids = [t.id for p in doc.pages for t in p.translations]

        all_ids = line_ids + trans_ids
        if not all_ids:
            return []

        stmt = (
            select(TextVersion)
            .where(TextVersion.entity_id.in_(all_ids))
            .order_by(TextVersion.edited_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def link_entity_to_site(self, entity_id: str, site_id: str) -> Optional[Entity]:
        ent_res = await self.db.execute(select(Entity).where(Entity.id == entity_id))
        entity = ent_res.scalars().first()
        if not entity:
            return None

        entity.site_id = site_id
        await self.db.commit()
        await self.db.refresh(entity)
        return entity
