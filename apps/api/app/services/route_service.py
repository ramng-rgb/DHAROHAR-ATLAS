from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.models import Route, RouteStop, Site

class RouteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _format_route(self, route: Route) -> Dict[str, Any]:
        stops_list = sorted(route.stops, key=lambda s: s.stop_order)
        coordinates = []
        formatted_stops = []

        for st in stops_list:
            if st.site:
                coordinates.append([st.site.longitude, st.site.latitude])
                formatted_stops.append({
                    "id": st.id,
                    "stop_order": st.stop_order,
                    "arrival_note": st.arrival_note or st.narrative,
                    "narrative": st.narrative,
                    "transit_mode": st.transit_mode or "caravan_trail",
                    "travel_note": st.travel_note,
                    "site": {
                        "id": st.site.id,
                        "name": st.site.name,
                        "slug": st.site.slug,
                        "name_hi": st.site.name_hi,
                        "name_gu": st.site.name_gu,
                        "summary": st.site.summary,
                        "site_type": st.site.site_type,
                        "era": st.site.era_label or st.site.era,
                        "era_label": st.site.era_label,
                        "era_start_year": st.site.period_start_year,
                        "era_end_year": st.site.period_end_year,
                        "period_start_year": st.site.period_start_year,
                        "period_end_year": st.site.period_end_year,
                        "dynasty": st.site.dynasty,
                        "state": st.site.state,
                        "district": st.site.district,
                        "latitude": st.site.latitude,
                        "longitude": st.site.longitude,
                        "hero_image": st.site.hero_image,
                        "hero_image_attribution": st.site.hero_image_attribution,
                        "hero_image_license": st.site.hero_image_license,
                        "architectural_style": st.site.architectural_style,
                        "data_confidence": st.site.data_confidence,
                        "source": st.site.source,
                        "tags": [],
                        "dynasties": []
                    }
                })

        geometry = None
        if len(coordinates) >= 2:
            geometry = {
                "type": "LineString",
                "coordinates": coordinates
            }

        return {
            "id": route.id,
            "title": route.title,
            "slug": route.slug,
            "summary": route.summary,
            "description": route.description or route.summary,
            "total_distance_km": route.total_distance_km,
            "estimated_duration_days": route.estimated_duration_days,
            "era_theme": route.era_theme,
            "geometry": geometry,
            "stops": formatted_stops
        }

    async def list_routes(self) -> List[Dict[str, Any]]:
        stmt = select(Route).options(
            selectinload(Route.stops).selectinload(RouteStop.site)
        )
        result = await self.db.execute(stmt)
        routes = result.scalars().all()
        return [self._format_route(r) for r in routes]

    async def get_route_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        stmt = (
            select(Route)
            .where(Route.slug == slug)
            .options(
                selectinload(Route.stops).selectinload(RouteStop.site)
            )
        )
        result = await self.db.execute(stmt)
        route = result.scalars().first()
        if not route:
            return None
        return self._format_route(route)
