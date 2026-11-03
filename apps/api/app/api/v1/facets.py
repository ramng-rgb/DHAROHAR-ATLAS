
from app.core.database import get_db
from app.schemas.schemas import FacetResponse
from app.services.site_service import SiteService
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/facets", tags=["Facets"])

@router.get("", response_model=FacetResponse)
async def get_facets(
    q: str | None = Query(None),
    site_type: list[str] | None = Query(None),
    state: list[str] | None = Query(None),
    dynasty: list[str] | None = Query(None),
    tag: list[str] | None = Query(None),
    year_from: int | None = Query(None),
    year_to: int | None = Query(None),
    bbox: str | None = Query(None),
    data_confidence: list[str] | None = Query(None),
    has_3d_model: bool | None = Query(None, description="Filter by presence of 3D model"),
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
