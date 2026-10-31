from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.site_service import SiteService
from app.schemas.schemas import SiteBrief, SiteDetail

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("", response_model=List[SiteBrief])
async def list_sites(
    site_type: Optional[str] = Query(None, description="Filter by site type (Stepwell, Fort, Temple)"),
    era: Optional[str] = Query(None, description="Filter by era"),
    dynasty: Optional[str] = Query(None, description="Filter by dynasty (Solanki, Vaghela, Rajput)"),
    state: Optional[str] = Query(None, description="Filter by state (Gujarat, Rajasthan)"),
    start_year: Optional[int] = Query(None, description="Filter sites starting at or after year CE"),
    end_year: Optional[int] = Query(None, description="Filter sites starting at or before year CE"),
    min_lat: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    min_lng: Optional[float] = Query(None),
    max_lng: Optional[float] = Query(None),
    search: Optional[str] = Query(None, description="Search term in name or description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    service = SiteService(db)
    return await service.list_sites(
        site_type=site_type,
        era=era,
        dynasty=dynasty,
        state=state,
        start_year=start_year,
        end_year=end_year,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        search_term=search,
        limit=limit,
        offset=offset
    )

@router.get("/{slug}", response_model=SiteDetail)
async def get_site(slug: str, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    site = await service.get_site_by_slug(slug)
    if not site:
        raise HTTPException(status_code=404, detail="Heritage site not found")
    return site

@router.get("/{slug}/nearby")
async def get_nearby(slug: str, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    site = await service.get_site_by_slug(slug)
    if not site:
        raise HTTPException(status_code=404, detail="Heritage site not found")
    return await service.get_nearby_sites(site)
