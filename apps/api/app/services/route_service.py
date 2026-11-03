from typing import Any

from app.models.models import Route, RouteStop
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload


class RouteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _format_route(self, route: Route) -> dict[str, Any]:
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

    async def list_routes(self) -> list[dict[str, Any]]:
        stmt = select(Route).options(
            selectinload(Route.stops).selectinload(RouteStop.site)
        )
        result = await self.db.execute(stmt)
        routes = result.scalars().all()
        return [self._format_route(r) for r in routes]

    async def get_route_by_slug(self, slug: str) -> dict[str, Any] | None:
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

    async def get_journey_by_slug(self, slug: str) -> dict[str, Any] | None:
        import math

        from app.models.models import Document, FolkloreItem, Model3D, Observation

        def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371.0
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dlambda = math.radians(lon2 - lon1)
            y = math.sin(dlambda) * math.cos(phi2)
            x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
            return round((math.degrees(math.atan2(y, x)) + 360) % 360, 1)

        def interpolate(lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 12) -> list[list[float]]:
            pts = []
            for i in range(steps + 1):
                t = i / steps
                pts.append([round(lon1 + (lon2 - lon1) * t, 6), round(lat1 + (lat2 - lat1) * t, 6)])
            return pts

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

        sorted_stops = sorted(route.stops, key=lambda s: s.stop_order)
        journey_stops = []
        full_coords = []
        cumulative_dist = 0.0

        for idx, st in enumerate(sorted_stops):
            site = st.site
            if not site:
                continue

            full_coords.append([site.longitude, site.latitude])

            # Leg distance and bearing
            leg_dist = 0.0
            leg_geom = None
            brg = None

            if idx > 0:
                prev_site = sorted_stops[idx - 1].site
                if prev_site:
                    leg_dist = round(haversine(prev_site.latitude, prev_site.longitude, site.latitude, site.longitude), 1)
                    cumulative_dist += leg_dist

            if idx < len(sorted_stops) - 1:
                next_site = sorted_stops[idx + 1].site
                if next_site:
                    brg = bearing(site.latitude, site.longitude, next_site.latitude, next_site.longitude)
                    leg_coords = interpolate(site.latitude, site.longitude, next_site.latitude, next_site.longitude)
                    leg_geom = {
                        "type": "LineString",
                        "coordinates": leg_coords
                    }
            elif idx > 0 and len(sorted_stops) > 1:
                # Last stop bearing matches incoming direction
                prev_site = sorted_stops[idx - 1].site
                if prev_site:
                    brg = bearing(prev_site.latitude, prev_site.longitude, site.latitude, site.longitude)

            # Query real linked records for this site
            folklore_rows = (await self.db.execute(
                select(FolkloreItem).where(FolkloreItem.site_id == site.id)
            )).scalars().all()
            linked_folk = [
                {
                    "id": f.id,
                    "title": f.title,
                    "body_md": f.body_md,
                    "kind": f.kind,
                    "source": f.source,
                    "is_illustrative": f.is_illustrative,
                    "data_confidence": f.data_confidence
                }
                for f in folklore_rows
            ]

            obs_rows = (await self.db.execute(
                select(Observation).where(Observation.site_id == site.id)
            )).scalars().all()
            linked_obs = [
                {
                    "id": o.id,
                    "title": o.title,
                    "body_md": o.body_md,
                    "kind": o.kind,
                    "source": o.source,
                    "is_illustrative": o.is_illustrative,
                    "data_confidence": o.data_confidence
                }
                for o in obs_rows
            ]

            doc_rows = (await self.db.execute(
                select(Document).where(Document.site_id == site.id, Document.deleted_at == None)
            )).scalars().all()
            linked_docs = [
                {
                    "id": d.id,
                    "title": d.title,
                    "doc_type": d.doc_type,
                    "source": d.source,
                    "licence": d.licence,
                    "page_count": d.page_count
                }
                for d in doc_rows
            ]

            model_row = (await self.db.execute(
                select(Model3D).where(Model3D.site_id == site.id)
            )).scalars().first()

            hero_media = {
                "url": site.hero_image or "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
                "caption": site.name,
                "attribution": site.hero_image_attribution or "Archaeological Survey Archives",
                "licence": site.hero_image_license or "CC-BY-4.0"
            }

            journey_stops.append({
                "id": st.id,
                "site_id": site.id,
                "site_slug": site.slug,
                "site_name": site.name,
                "site_name_hi": site.name_hi,
                "site_name_gu": site.name_gu,
                "site_type": site.site_type,
                "state": site.state,
                "district": site.district,
                "latitude": site.latitude,
                "longitude": site.longitude,
                "period_start_year": site.period_start_year,
                "period_end_year": site.period_end_year,
                "era_label": site.era_label,
                "stop_order": st.stop_order,
                "arrival_note": st.arrival_note or st.narrative,
                "arrival_note_source": st.arrival_note_source or "Archaeological Survey Records",
                "is_illustrative": st.is_illustrative or False,
                "dwell_seconds": st.dwell_seconds or 12,
                "hero_media": hero_media,
                "has_3d_model": model_row is not None,
                "model_3d_id": model_row.id if model_row else None,
                "linked_folklore": linked_folk,
                "linked_observations": linked_obs,
                "linked_documents": linked_docs,
                "leg_distance_km": leg_dist,
                "cumulative_distance_km": round(cumulative_dist, 1),
                "leg_geometry": leg_geom,
                "bearing_deg": brg
            })

        total_distance = round(cumulative_dist, 1) if cumulative_dist > 0 else route.total_distance_km

        return {
            "id": route.id,
            "slug": route.slug,
            "title": route.title,
            "title_hi": route.title_hi or route.title,
            "title_gu": route.title_gu or route.title,
            "summary": route.summary,
            "summary_hi": route.summary_hi or route.summary,
            "summary_gu": route.summary_gu or route.summary,
            "description": route.description or route.summary,
            "cover_media_url": journey_stops[0]["hero_media"]["url"] if journey_stops else None,
            "difficulty": route.difficulty or "Moderate",
            "era_theme": route.era_theme,
            "total_distance_km": total_distance,
            "estimated_duration_days": route.estimated_duration_days or max(1, round(total_distance / 120.0)),
            "full_geometry": {
                "type": "LineString",
                "coordinates": full_coords
            },
            "stops": journey_stops,
            "total_stops": len(journey_stops)
        }
