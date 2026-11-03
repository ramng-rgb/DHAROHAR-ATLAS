import hashlib
import json

from app.core.database import get_db
from app.core.redis_cache import get_cache, set_cache
from app.schemas.schemas import JourneyResponse, RouteResponse
from app.services.route_service import RouteService
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("", response_model=list[RouteResponse])
async def list_routes(db: AsyncSession = Depends(get_db)):
    service = RouteService(db)
    return await service.list_routes()

@router.get("/{slug}", response_model=RouteResponse)
async def get_route(slug: str, db: AsyncSession = Depends(get_db)):
    service = RouteService(db)
    route = await service.get_route_by_slug(slug)
    if not route:
        raise HTTPException(status_code=404, detail="Heritage travel route not found")
    return route

@router.get("/{slug}/journey", response_model=JourneyResponse)
async def get_journey(slug: str, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    cache_key = f"journey:{slug}"
    cached = await get_cache(cache_key)
    
    if cached:
        data = json.loads(cached)
    else:
        service = RouteService(db)
        data = await service.get_journey_by_slug(slug)
        if not data:
            raise HTTPException(status_code=404, detail=f"Journey route '{slug}' not found")
        await set_cache(cache_key, json.dumps(data), ttl=3600)

    # Compute ETag
    content_bytes = json.dumps(data, sort_keys=True).encode("utf-8")
    etag = f'"{hashlib.md5(content_bytes).hexdigest()}"'
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"

    # Handle If-None-Match
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            }
        )

    return data
