from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.route_service import RouteService
from app.schemas.schemas import RouteResponse

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("", response_model=List[RouteResponse])
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
