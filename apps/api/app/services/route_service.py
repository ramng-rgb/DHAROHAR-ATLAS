from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.models import Route, RouteStop, Site

class RouteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_routes(self) -> List[Route]:
        stmt = select(Route).options(
            selectinload(Route.stops).selectinload(RouteStop.site)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_route_by_slug(self, slug: str) -> Optional[Route]:
        stmt = (
            select(Route)
            .where(Route.slug == slug)
            .options(
                selectinload(Route.stops).selectinload(RouteStop.site)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
