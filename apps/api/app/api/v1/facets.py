import hashlib
import json
from app.core.database import get_db
from app.core.redis_cache import get_cache, set_cache
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
    # Targeted Optimization: Redis Facet Cache Layer
    params_str = f"q={q}&types={site_type}&states={state}&dyn={dynasty}&tags={tag}&yf={year_from}&yt={year_to}&bb={bbox}&dc={data_confidence}&3d={has_3d_model}"
    cache_key = f"cache:facets:{hashlib.md5(params_str.encode()).hexdigest()}"
    
    cached = await get_cache(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    service = SiteService(db)
    result = await service.get_facets(
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
    
    try:
        await set_cache(cache_key, json.dumps(result), ttl=300)
    except Exception:
        pass

    return result
