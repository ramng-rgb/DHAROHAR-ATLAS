from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.document_service import DocumentService
from app.schemas.schemas import DocumentResponse, OCRLineResponse, OCRLineUpdate

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("", response_model=List[DocumentResponse])
async def list_documents(site_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    return await service.list_documents(site_id)

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Archival document not found")
    return doc

@router.put("/ocr-lines/{line_id}", response_model=OCRLineResponse)
async def update_ocr_line(
    line_id: str,
    update_data: OCRLineUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    line = await service.update_ocr_line(
        line_id=line_id,
        original_text=update_data.original_text,
        translated_text=update_data.translated_text
    )
    if not line:
        raise HTTPException(status_code=404, detail="OCR line not found")
    return line

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    language: str = Form("Sanskrit / Devanagari"),
    document_type: str = Form("manuscript_folio"),
    source_archive: str = Form("Field Contribution Archive"),
    site_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    content = await file.read()
    return await service.process_document_upload(
        title=title,
        language=language,
        document_type=document_type,
        source_archive=source_archive,
        site_id=site_id,
        file_bytes=content,
        filename=file.filename or "uploaded_folio.jpg"
    )
