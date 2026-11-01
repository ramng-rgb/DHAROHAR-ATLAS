from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.site_service import SiteService
from app.schemas.schemas import SiteBrief, SiteLight, SiteDetail, GeoJSONFeatureCollection

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("", response_model=List[Union[SiteBrief, SiteLight]])
async def list_sites(
    q: Optional[str] = Query(None, description="Search term in name, regional names or summary"),
    site_type: Optional[List[str]] = Query(None, description="Filter by site type"),
    state: Optional[List[str]] = Query(None, description="Filter by state"),
    dynasty: Optional[List[str]] = Query(None, description="Filter by dynasty"),
    tag: Optional[List[str]] = Query(None, description="Filter by tag slug"),
    year_from: Optional[int] = Query(None, description="Filter sites dating at or after year (negative = BCE)"),
    year_to: Optional[int] = Query(None, description="Filter sites dating at or before year (negative = BCE)"),
    bbox: Optional[str] = Query(None, description="Bounding box 'min_lng,min_lat,max_lng,max_lat'"),
    data_confidence: Optional[List[str]] = Query(None, description="Filter by data confidence ('verified', 'likely', 'unverified')"),
    fields: Optional[str] = Query(None, description="Field selection, e.g. 'light' for map markers"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    service = SiteService(db)
    items, total, next_cursor = await service.list_sites(
        q=q,
        site_types=site_type,
        states=state,
        dynasties=dynasty,
        tags=tag,
        year_from=year_from,
        year_to=year_to,
        bbox=bbox,
        data_confidence=data_confidence,
        limit=limit,
        offset=offset
    )
    if fields == "light":
        return [SiteLight(**item) for item in items]
    return [SiteBrief(**item) for item in items]

@router.get("/geojson", response_model=GeoJSONFeatureCollection)
async def get_sites_geojson(
    response: Response,
    bbox: Optional[str] = Query(None, description="Viewport bounding box 'min_lng,min_lat,max_lng,max_lat'"),
    zoom: Optional[float] = Query(None, description="Map zoom level for server-side clustering"),
    q: Optional[str] = Query(None),
    site_type: Optional[List[str]] = Query(None),
    state: Optional[List[str]] = Query(None),
    dynasty: Optional[List[str]] = Query(None),
    tag: Optional[List[str]] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    data_confidence: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    service = SiteService(db)
    geojson_data, etag = await service.get_geojson(
        bbox=bbox,
        zoom=zoom,
        q=q,
        site_types=site_type,
        states=state,
        dynasties=dynasty,
        tags=tag,
        year_from=year_from,
        year_to=year_to,
        data_confidence=data_confidence
    )
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=60"
    return geoJSON_result(geojson_data)

def geoJSON_result(data: dict) -> GeoJSONFeatureCollection:
    return GeoJSONFeatureCollection(**data)

@router.get("/{slug}", response_model=SiteDetail)
async def get_site(slug: str, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    site = await service.get_site_by_slug(slug)
    if not site:
        raise HTTPException(status_code=404, detail="Heritage site not found")
    return site
