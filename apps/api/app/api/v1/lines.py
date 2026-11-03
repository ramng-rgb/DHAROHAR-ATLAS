from app.core.database import get_db
from app.schemas.schemas import OCRLineResponse, OCRLineUpdate
from app.services.document_service import DocumentService
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/lines", tags=["Corrections"])

@router.patch("/{line_id}", response_model=OCRLineResponse)
async def patch_ocr_line(
    line_id: str = Path(..., pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"),
    update_data: OCRLineUpdate = ...,
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    line = await service.update_line_text(line_id, update_data)
    if not line:
        raise HTTPException(status_code=404, detail="OCR line not found.")
    return line
