from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.document_service import DocumentService
from app.schemas.schemas import OCRLineResponse, OCRLineUpdate

router = APIRouter(prefix="/lines", tags=["Corrections"])

@router.patch("/{line_id}", response_model=OCRLineResponse)
async def patch_ocr_line(
    line_id: str,
    update_data: OCRLineUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    line = await service.update_line_text(line_id, update_data)
    if not line:
        raise HTTPException(status_code=404, detail="OCR line not found.")
    return line
