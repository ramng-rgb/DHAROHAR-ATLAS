import hashlib
import json
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.site_service import SiteService
from app.schemas.schemas import (
    SiteBrief, SiteLight, SiteDetail, GeoJSONFeatureCollection,
    SiteFullDetail, Model3DDetail, SiteOGMetadata
)

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
    has_3d_model: Optional[bool] = Query(None, description="Filter by presence of 3D digital twin"),
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
        has_3d_model=has_3d_model,
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
    has_3d_model: Optional[bool] = Query(None, description="Filter by presence of 3D digital twin"),
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
        data_confidence=data_confidence,
        has_3d_model=has_3d_model
    )
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=60"
    return geoJSON_result(geojson_data)

def geoJSON_result(data: dict) -> GeoJSONFeatureCollection:
    return GeoJSONFeatureCollection(**data)

@router.get("/{slug}/full", response_model=SiteFullDetail)
async def get_site_full(slug: str, response: Response, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    site_full = await service.get_site_full(slug)
    if not site_full:
        raise HTTPException(status_code=404, detail="Heritage site record not found")
    etag = hashlib.sha256(f"{slug}_{site_full.get('id')}_{len(site_full.get('media', []))}".encode()).hexdigest()
    response.headers["ETag"] = f'W/"{etag}"'
    response.headers["Cache-Control"] = "public, max-age=120"
    return site_full

@router.get("/{slug}/model", response_model=Model3DDetail)
async def get_site_model(slug: str, response: Response, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    model = await service.get_site_model(slug)
    if not model:
        raise HTTPException(status_code=404, detail="3D Digital Twin model not found for this site")
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    response.headers["Accept-Ranges"] = "bytes"
    return model

@router.get("/{slug}/cite")
async def get_site_citation(
    slug: str,
    format: str = Query("bibtex", pattern="^(bibtex|apa|ris|csl-json)$", description="Citation format: bibtex, apa, ris, csl-json"),
    db: AsyncSession = Depends(get_db)
):
    service = SiteService(db)
    res = await service.get_site_citation(slug, format_type=format)
    if not res:
        raise HTTPException(status_code=404, detail="Site citation could not be generated")
    media_type, filename, content = res
    if format == "csl-json":
        return Response(content=json.dumps(content, indent=2), media_type=media_type, headers={"Content-Disposition": f'inline; filename="{filename}"'})
    return Response(content=content, media_type=media_type, headers={"Content-Disposition": f'inline; filename="{filename}"'})

@router.get("/{slug}/og", response_model=SiteOGMetadata)
async def get_site_og(slug: str, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    og_data = await service.get_site_og(slug)
    if not og_data:
        raise HTTPException(status_code=404, detail="OG metadata not found")
    return og_data

@router.get("/{slug}", response_model=SiteDetail)
async def get_site(slug: str, db: AsyncSession = Depends(get_db)):
    service = SiteService(db)
    site = await service.get_site_by_slug(slug)
    if not site:
        raise HTTPException(status_code=404, detail="Heritage site not found")
    return site
