import math
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_
from app.models.models import Site, SiteMedia, Model3D, Hotspot, FolkloreItem, ArchitecturalObservation, Document

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class SiteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_sites(
        self,
        site_type: Optional[str] = None,
        era: Optional[str] = None,
        dynasty: Optional[str] = None,
        state: Optional[str] = None,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_lng: Optional[float] = None,
        max_lng: Optional[float] = None,
        search_term: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Site]:
        stmt = select(Site).options(
            selectinload(Site.media),
            selectinload(Site.models_3d)
        )

        conditions = []
        if site_type:
            conditions.append(Site.site_type.ilike(f"%{site_type}%"))
        if era:
            conditions.append(Site.era.ilike(f"%{era}%"))
        if dynasty:
            conditions.append(Site.dynasty.ilike(f"%{dynasty}%"))
        if state:
            conditions.append(Site.state.ilike(f"%{state}%"))
        if start_year is not None:
            conditions.append(Site.era_end_year >= start_year)
        if end_year is not None:
            conditions.append(Site.era_start_year <= end_year)
        if min_lat is not None and max_lat is not None:
            conditions.append(and_(Site.latitude >= min_lat, Site.latitude <= max_lat))
        if min_lng is not None and max_lng is not None:
            conditions.append(and_(Site.longitude >= min_lng, Site.longitude <= max_lng))
        if search_term:
            t = f"%{search_term}%"
            conditions.append(or_(Site.name.ilike(t), Site.description.ilike(t), Site.architectural_style.ilike(t)))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(Site.name.asc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_site_by_slug(self, slug: str) -> Optional[Site]:
        stmt = (
            select(Site)
            .where(Site.slug == slug)
            .options(
                selectinload(Site.media),
                selectinload(Site.models_3d).selectinload(Model3D.hotspots),
                selectinload(Site.folklore),
                selectinload(Site.observations)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_nearby_sites(self, site: Site, max_distance_km: float = 300.0, limit: int = 4) -> List[Dict[str, Any]]:
        stmt = select(Site).where(Site.id != site.id)
        result = await self.db.execute(stmt)
        all_other = result.scalars().all()

        nearby = []
        for other in all_other:
            dist = haversine_distance(site.latitude, site.longitude, other.latitude, other.longitude)
            if dist <= max_distance_km:
                nearby.append({
                    "id": other.id,
                    "name": other.name,
                    "slug": other.slug,
                    "site_type": other.site_type,
                    "era": other.era,
                    "state": other.state,
                    "hero_image": other.hero_image,
                    "distance_km": round(dist, 1)
                })

        nearby.sort(key=lambda x: x["distance_km"])
        return nearby[:limit]
