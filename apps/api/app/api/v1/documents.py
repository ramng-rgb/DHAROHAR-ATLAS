import os
import io
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.document_service import DocumentService
from app.services.pipeline.export import (
    export_document_as_txt,
    export_document_as_json,
    export_document_as_alto_xml
)
from app.schemas.schemas import (
    DocumentResponse,
    DocumentCreate,
    OCRLineResponse,
    OCRLineUpdate,
    TranslationResponse,
    TranslationUpdate,
    TextVersionResponse,
    RevertRequest,
    EntityResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

# -------------------------------------------------------------
# 1. Upload & Ingest Endpoints
# -------------------------------------------------------------
@router.post("/uploads")
async def upload_document_file(
    file: UploadFile = File(...)
):
    """
    Direct-to-storage upload endpoint with size check (<=25MB) and mime verification.
    """
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 25MB.")

    storage_filename = f"{uuid.uuid4().hex}_{file.filename or 'upload.jpg'}"
    storage_dir = "/Users/ramnarayangupta/Desktop/hac/data/uploads"
    os.makedirs(storage_dir, exist_ok=True)
    local_path = os.path.join(storage_dir, storage_filename)

    with open(local_path, "wb") as f:
        f.write(content)

    return {
        "storage_key": f"/data/uploads/{storage_filename}",
        "filename": file.filename,
        "mime": file.content_type or "image/jpeg",
        "size_bytes": len(content)
    }

@router.post("", response_model=dict)
async def create_document(
    doc_in: DocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates document metadata record and enqueues async OCR & translation job.
    """
    service = DocumentService(db)

    # Read bytes if local storage_key provided
    file_bytes = None
    if doc_in.storage_key:
        local_path = f"/Users/ramnarayangupta/Desktop/hac{doc_in.storage_key}"
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                file_bytes = f.read()

    doc, job = await service.create_document_and_enqueue_job(doc_in, file_bytes=file_bytes)
    return {
        "document_id": doc.id,
        "job_id": job.id,
        "status": doc.status,
        "title": doc.title
    }

# -------------------------------------------------------------
# 2. Document Query Endpoints
# -------------------------------------------------------------
@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    site_id: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    docs = await service.list_documents(
        site_id=site_id,
        language=language,
        status=status,
        doc_type=doc_type,
        limit=limit,
        offset=offset
    )
    return docs

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Archival document not found.")
    
    # Map extracted_entities if present
    entities_res = []
    if hasattr(doc, "extracted_entities"):
        for e in doc.extracted_entities:
            entities_res.append(e)
    
    resp = DocumentResponse.model_validate(doc)
    resp.entities = entities_res
    return resp

# -------------------------------------------------------------
# 3. Export Endpoints
# -------------------------------------------------------------
@router.get("/{doc_id}/export")
async def export_document(
    doc_id: str,
    format: str = Query("json", pattern="^(json|txt|alto-xml)$"),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Archival document not found.")

    if format == "txt":
        content = export_document_as_txt(doc)
        return PlainTextResponse(content, media_type="text/plain; charset=utf-8")
    elif format == "alto-xml":
        content = export_document_as_alto_xml(doc)
        return Response(content, media_type="application/xml; charset=utf-8")
    else:
        content = export_document_as_json(doc)
        return Response(content, media_type="application/json; charset=utf-8")

# -------------------------------------------------------------
# 4. Version History & Revert
# -------------------------------------------------------------
@router.get("/{doc_id}/versions", response_model=List[TextVersionResponse])
async def get_document_versions(doc_id: str, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    versions = await service.get_document_version_history(doc_id)
    return versions

@router.post("/{doc_id}/revert")
async def revert_document_version(
    doc_id: str,
    req: RevertRequest,
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    success = await service.revert_version(req)
    if not success:
        raise HTTPException(status_code=404, detail="Specified version could not be found or reverted.")
    return {"message": f"Successfully reverted {req.entity_type} to version {req.version_no}"}

@router.post("/entities/{entity_id}/link")
async def link_entity_to_site(
    entity_id: str,
    site_id: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    ent = await service.link_entity_to_site(entity_id, site_id)
    if not ent:
        raise HTTPException(status_code=404, detail="Entity not found.")
    return {"message": "Linked entity to site successfully", "entity_id": ent.id, "site_id": ent.site_id}
