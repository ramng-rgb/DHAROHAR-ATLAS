from app.core.database import get_db
from app.schemas.schemas import TranslationResponse, TranslationUpdate
from app.services.document_service import DocumentService
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/translations", tags=["Corrections"])

@router.patch("/{translation_id}", response_model=TranslationResponse)
async def patch_translation(
    translation_id: str = Path(..., pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"),
    update_data: TranslationUpdate = ...,
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    trans = await service.update_translation_text(translation_id, update_data)
    if not trans:
        raise HTTPException(status_code=404, detail="Translation record not found.")
    return trans
