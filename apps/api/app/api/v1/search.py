from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.search_service import SearchService
from app.schemas.schemas import SearchResponse, AskArchiveRequest, AskArchiveResponse

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=SearchResponse)
async def search_archive(
    q: str = Query(..., min_length=1, description="Multilingual query (English/Hindi/Gujarati/Sanskrit)"),
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    service = SearchService(db)
    return await service.hybrid_search(query=q, limit=limit)

@router.post("/ask", response_model=AskArchiveResponse)
async def ask_the_archive(
    req: AskArchiveRequest,
    db: AsyncSession = Depends(get_db)
):
    service = SearchService(db)
    return await service.ask_archive(query=req.query)
