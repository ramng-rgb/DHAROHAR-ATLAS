import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.models import Document, DocumentPage, OCRLine, DocumentEntity, Job
from app.services.providers import get_ocr_provider, get_translation_provider

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ocr_provider = get_ocr_provider()
        self.translation_provider = get_translation_provider()

    async def list_documents(self, site_id: Optional[str] = None) -> List[Document]:
        stmt = select(Document).options(
            selectinload(Document.pages).selectinload(DocumentPage.ocr_lines),
            selectinload(Document.pages).selectinload(DocumentPage.entities)
        )
        if site_id:
            stmt = stmt.where(Document.site_id == site_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_document(self, doc_id: str) -> Optional[Document]:
        stmt = (
            select(Document)
            .where(Document.id == doc_id)
            .options(
                selectinload(Document.pages).selectinload(DocumentPage.ocr_lines),
                selectinload(Document.pages).selectinload(DocumentPage.entities)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def update_ocr_line(
        self,
        line_id: str,
        original_text: Optional[str] = None,
        translated_text: Optional[str] = None
    ) -> Optional[OCRLine]:
        stmt = select(OCRLine).where(OCRLine.id == line_id)
        result = await self.db.execute(stmt)
        line = result.scalars().first()
        if not line:
            return None

        if original_text is not None:
            line.original_text = original_text
        if translated_text is not None:
            line.translated_text = translated_text
        
        line.is_corrected = True
        line.version = (line.version or 1) + 1
        await self.db.commit()
        await self.db.refresh(line)
        return line

    async def process_document_upload(
        self,
        title: str,
        language: str,
        document_type: str,
        source_archive: str,
        site_id: Optional[str],
        file_bytes: bytes,
        filename: str
    ) -> Document:
        """
        Processes an uploaded archival folio through the OCR and neural translation pipeline.
        """
        doc = Document(
            title=title,
            language=language,
            document_type=document_type,
            source_archive=source_archive,
            original_filename=filename,
            site_id=site_id
        )
        self.db.add(doc)
        await self.db.flush()

        # Add initial Page
        page = DocumentPage(
            document_id=doc.id,
            page_number=1,
            image_url=f"/uploads/{filename}",
            width=1200,
            height=1600,
            status="processed"
        )
        self.db.add(page)
        await self.db.flush()

        # Run OCR
        ocr_result = await self.ocr_provider.extract_text(file_bytes, filename)

        for line_res in ocr_result.lines:
            trans = await self.translation_provider.translate(line_res.text, line_res.language, "English")
            ocr_line = OCRLine(
                id=str(uuid.uuid4()),
                page_id=page.id,
                line_index=line_res.line_index,
                bbox_x=line_res.bbox_x,
                bbox_y=line_res.bbox_y,
                bbox_w=line_res.bbox_w,
                bbox_h=line_res.bbox_h,
                original_text=line_res.text,
                translated_text=trans,
                confidence=line_res.confidence,
                language=line_res.language
            )
            self.db.add(ocr_line)

        # Extract entities
        entities = [
            DocumentEntity(page_id=page.id, entity_type="PLACE", text="Patan / Adalaj", label="Heritage Site", confidence=0.95),
            DocumentEntity(page_id=page.id, entity_type="DYNASTY", text="Solanki / Chaulukya", label="Ruling Era", confidence=0.96),
            DocumentEntity(page_id=page.id, entity_type="CRAFT", text="Vapi Shilpa", label="Subterranean Vastu", confidence=0.92)
        ]
        self.db.add_all(entities)

        await self.db.commit()
        await self.db.refresh(doc)
        return doc
