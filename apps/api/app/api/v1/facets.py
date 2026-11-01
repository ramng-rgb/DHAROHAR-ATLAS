from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.site_service import SiteService
from app.schemas.schemas import FacetResponse

router = APIRouter(prefix="/facets", tags=["Facets"])

@router.get("", response_model=FacetResponse)
async def get_facets(
    q: Optional[str] = Query(None),
    site_type: Optional[List[str]] = Query(None),
    state: Optional[List[str]] = Query(None),
    dynasty: Optional[List[str]] = Query(None),
    tag: Optional[List[str]] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    bbox: Optional[str] = Query(None),
    data_confidence: Optional[List[str]] = Query(None),
    has_3d_model: Optional[bool] = Query(None, description="Filter by presence of 3D model"),
    db: AsyncSession = Depends(get_db)
):
    service = SiteService(db)
    return await service.get_facets(
        q=q,
        site_types=site_type,
        states=state,
        dynasties=dynasty,
        tags=tag,
        year_from=year_from,
        year_to=year_to,
        bbox=bbox,
        data_confidence=data_confidence,
        has_3d_model=has_3d_model
    )
