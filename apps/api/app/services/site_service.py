import hashlib
import json
import math
from datetime import datetime
from typing import Any

from app.core.redis_cache import get_cache, set_cache
from app.models.models import (
    Model3D,
    Route,
    RouteStop,
    Site,
    SiteDynasty,
    SiteTag,
    Tag,
)
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

HISTOGRAM_BUCKETS = [
    {"year_start": -3000, "year_end": -1500, "era_label": "Indus Valley (3000-1500 BCE)"},
    {"year_start": -1500, "year_end": -600, "era_label": "Vedic / Early Iron (1500-600 BCE)"},
    {"year_start": -600, "year_end": -200, "era_label": "Maurya / Early Historic (600-200 BCE)"},
    {"year_start": -200, "year_end": 300, "era_label": "Classical Dynasties (200 BCE-300 CE)"},
    {"year_start": 300, "year_end": 750, "era_label": "Gupta & Maitraka (300-750 CE)"},
    {"year_start": 750, "year_end": 1200, "era_label": "Solanki & Medieval (750-1200 CE)"},
    {"year_start": 1200, "year_end": 1526, "era_label": "Sultanate Era (1200-1526 CE)"},
    {"year_start": 1526, "year_end": 1750, "era_label": "Mughal & Regional (1526-1750 CE)"},
    {"year_start": 1750, "year_end": 1947, "era_label": "Colonial & Princely (1750-1947 CE)"},
]

class SiteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _build_filter_conditions(
        self,
        q: str | None = None,
        site_types: list[str] | None = None,
        states: list[str] | None = None,
        dynasties: list[str] | None = None,
        tags: list[str] | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        bbox: str | None = None,
        data_confidence: list[str] | None = None,
        has_3d_model: bool | None = None,
    ) -> list[Any]:
        conditions = [Site.deleted_at.is_(None)]

        if q:
            term = f"%{q.strip()}%"
            conditions.append(
                or_(
                    Site.name.ilike(term),
                    Site.name_hi.ilike(term),
                    Site.name_gu.ilike(term),
                    Site.summary.ilike(term),
                    Site.district.ilike(term),
                    Site.architectural_style.ilike(term)
                )
            )

        if site_types:
            clean_types = [t.lower().strip() for t in site_types if t.strip()]
            if clean_types:
                conditions.append(Site.site_type.in_(clean_types))

        if states:
            clean_states = [s.strip() for s in states if s.strip()]
            if clean_states:
                conditions.append(Site.state.in_(clean_states))

        if dynasties:
            clean_dynasties = [d.strip() for d in dynasties if d.strip()]
            if clean_dynasties:
                conditions.append(
                    or_(*[Site.dynasty.ilike(f"%{d}%") for d in clean_dynasties])
                )

        if data_confidence:
            clean_conf = [c.lower().strip() for c in data_confidence if c.strip()]
            if clean_conf:
                conditions.append(Site.data_confidence.in_(clean_conf))

        if has_3d_model is True:
            conditions.append(Site.models_3d.any(and_(Model3D.status == "ready", Model3D.id.isnot(None))))
        elif has_3d_model is False:
            conditions.append(~Site.models_3d.any(Model3D.status == "ready"))

        # Year range overlap:
        # Site active if period_start_year <= year_to AND period_end_year >= year_from
        if year_from is not None:
            conditions.append(
                or_(
                    Site.period_end_year.is_(None),
                    Site.period_end_year >= year_from
                )
            )
        if year_to is not None:
            conditions.append(
                or_(
                    Site.period_start_year.is_(None),
                    Site.period_start_year <= year_to
                )
            )

        if bbox:
            try:
                parts = [float(p.strip()) for p in bbox.split(",")]
                if len(parts) == 4:
                    min_lng, min_lat, max_lng, max_lat = parts
                    conditions.append(
                        and_(
                            Site.latitude >= min_lat,
                            Site.latitude <= max_lat,
                            Site.longitude >= min_lng,
                            Site.longitude <= max_lng
                        )
                    )
            except Exception:
                pass

        if tags:
            clean_tags = [t.lower().strip() for t in tags if t.strip()]
            if clean_tags:
                conditions.append(
                    Site.site_tags.any(
                        SiteTag.tag.has(Tag.slug.in_(clean_tags))
                    )
                )

        return conditions

    async def list_sites(
        self,
        q: str | None = None,
        site_types: list[str] | None = None,
        states: list[str] | None = None,
        dynasties: list[str] | None = None,
        tags: list[str] | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        bbox: str | None = None,
        data_confidence: list[str] | None = None,
        has_3d_model: bool | None = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[list[dict[str, Any]], int, str | None]:
        conditions = self._build_filter_conditions(
            q=q,
            site_types=site_types,
            states=states,
            dynasties=dynasties,
            tags=tags,
            year_from=year_from,
            year_to=year_to,
            bbox=bbox,
            data_confidence=data_confidence,
            has_3d_model=has_3d_model
        )

        # Count total
        count_stmt = select(func.count(Site.id)).where(and_(*conditions))
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # Query items
        stmt = (
            select(Site)
            .where(and_(*conditions))
            .options(
                selectinload(Site.site_tags).selectinload(SiteTag.tag),
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty),
                selectinload(Site.models_3d)
            )
            .order_by(Site.period_start_year.asc().nullslast(), Site.name.asc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(stmt)
        sites = result.scalars().all()

        items = []
        for s in sites:
            has_3d = bool(s.models_3d and any(m.status == "ready" for m in s.models_3d))
            items.append({
                "id": s.id,
                "name": s.name,
                "slug": s.slug,
                "name_hi": s.name_hi,
                "name_gu": s.name_gu,
                "summary": s.summary,
                "site_type": s.site_type,
                "era": s.era_label or s.era,
                "era_label": s.era_label,
                "era_start_year": s.period_start_year,
                "era_end_year": s.period_end_year,
                "period_start_year": s.period_start_year,
                "period_end_year": s.period_end_year,
                "dynasty": s.dynasty,
                "state": s.state,
                "district": s.district,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "hero_image": s.hero_image,
                "hero_image_attribution": s.hero_image_attribution,
                "hero_image_license": s.hero_image_license,
                "architectural_style": s.architectural_style,
                "data_confidence": s.data_confidence,
                "source_text": s.source_text,
                "source_url": s.source_url,
                "source": s.source,
                "tags": [st.tag.name for st in s.site_tags if st.tag],
                "dynasties": [sd.dynasty.name for sd in s.site_dynasties if sd.dynasty],
                "has_3d_model": has_3d
            })

        next_cursor = str(offset + limit) if (offset + limit) < total else None
        return items, total, next_cursor

    async def get_site_by_slug(self, slug: str) -> dict[str, Any] | None:
        stmt = (
            select(Site)
            .where(
                and_(
                    or_(Site.slug == slug, Site.slug == slug.replace("-patan", ""), Site.slug == f"{slug}-patan"),
                    Site.deleted_at.is_(None)
                )
            )
            .options(
                selectinload(Site.media),
                selectinload(Site.models_3d).selectinload(Model3D.hotspots),
                selectinload(Site.folklore),
                selectinload(Site.observations),
                selectinload(Site.site_tags).selectinload(SiteTag.tag),
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty)
            )
        )
        result = await self.db.execute(stmt)
        s = result.scalars().first()
        if not s:
            return None

        return {
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "name_hi": s.name_hi,
            "name_gu": s.name_gu,
            "summary": s.summary,
            "description": s.description or s.summary,
            "site_type": s.site_type,
            "era": s.era_label or s.era,
            "era_label": s.era_label,
            "era_start_year": s.period_start_year,
            "era_end_year": s.period_end_year,
            "period_start_year": s.period_start_year,
            "period_end_year": s.period_end_year,
            "dynasty": s.dynasty,
            "state": s.state,
            "district": s.district,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "hero_image": s.hero_image,
            "hero_image_attribution": s.hero_image_attribution,
            "hero_image_license": s.hero_image_license,
            "architectural_style": s.architectural_style,
            "data_confidence": s.data_confidence,
            "source_text": s.source_text,
            "source_url": s.source_url,
            "source": s.source,
            "significance": s.significance,
            "alternative_names": s.alternative_names or [],
            "media": [
                {
                    "id": m.id,
                    "media_type": m.media_type,
                    "kind": getattr(m, "kind", "gallery") or "gallery",
                    "url": m.url,
                    "thumbnail_url": m.thumbnail_url,
                    "storage_key": getattr(m, "storage_key", None),
                    "remote_url": getattr(m, "remote_url", None),
                    "width": getattr(m, "width", None),
                    "height": getattr(m, "height", None),
                    "dominant_colour": getattr(m, "dominant_colour", None),
                    "blurhash": getattr(m, "blurhash", None),
                    "caption": m.caption,
                    "license": getattr(m, "license", "CC-BY-SA-4.0") or "CC-BY-SA-4.0",
                    "licence_short": getattr(m, "licence_short", getattr(m, "license", "CC-BY-SA-4.0")) or "CC-BY-SA-4.0",
                    "licence_url": getattr(m, "licence_url", None),
                    "author": getattr(m, "author", None),
                    "credit": getattr(m, "credit", None),
                    "attribution": m.attribution or getattr(m, "credit", None),
                    "source_url": m.source_url,
                    "original_filename": getattr(m, "original_filename", None),
                    "is_placeholder": getattr(m, "is_placeholder", False) or False,
                    "verified": getattr(m, "verified", True) if getattr(m, "verified", None) is not None else True,
                    "sort_order": getattr(m, "sort_order", 0) or 0,
                    "provenance": m.provenance
                } for m in s.media
            ],
            "models_3d": [
                {
                    "id": m.id,
                    "title": m.title,
                    "model_url": m.model_url,
                    "format": m.format,
                    "poly_count": m.poly_count,
                    "scale_factor": m.scale_factor,
                    "license": m.license,
                    "attribution": m.attribution,
                    "hotspots": [
                        {
                            "id": h.id,
                            "title": h.title,
                            "description": h.description,
                            "position_x": h.position_x,
                            "position_y": h.position_y,
                            "position_z": h.position_z,
                            "normal_x": h.normal_x,
                            "normal_y": h.normal_y,
                            "normal_z": h.normal_z,
                            "media_url": h.media_url
                        } for h in m.hotspots
                    ]
                } for m in s.models_3d
            ],
            "folklore": [
                {
                    "id": f.id,
                    "title": f.title,
                    "narrative": getattr(f, "body_md", None) or getattr(f, "narrative", "") or "",
                    "language": getattr(f, "language", "en") or "en",
                    "source_tradition": getattr(f, "source", None) or getattr(f, "source_tradition", "") or "",
                    "authenticity_status": getattr(f, "authenticity_status", "verified") or ("illustrative" if getattr(f, "is_illustrative", False) else "verified")
                } for f in s.folklore
            ],
            "observations": [
                {
                    "id": o.id,
                    "title": o.title,
                    "element_type": getattr(o, "element_type", getattr(o, "kind", "architectural_feature")),
                    "description": getattr(o, "body_md", None) or getattr(o, "description", "") or "",
                    "masonry_detail": getattr(o, "masonry_detail", None),
                    "preservation_status": getattr(o, "preservation_status", "Documented"),
                    "recorded_by": getattr(o, "recorded_by", getattr(o, "source", "Dharohar Archives"))
                } for o in s.observations
            ],
            "tags": [st.tag.name for st in s.site_tags if st.tag],
            "dynasties": [sd.dynasty.name for sd in s.site_dynasties if sd.dynasty]
        }

    async def get_geojson(
        self,
        bbox: str | None = None,
        zoom: float | None = None,
        q: str | None = None,
        site_types: list[str] | None = None,
        states: list[str] | None = None,
        dynasties: list[str] | None = None,
        tags: list[str] | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        data_confidence: list[str] | None = None,
        has_3d_model: bool | None = None
    ) -> tuple[dict[str, Any], str]:
        # Cache key construction
        params_str = f"{bbox}_{zoom}_{q}_{site_types}_{states}_{dynasties}_{tags}_{year_from}_{year_to}_{data_confidence}_{has_3d_model}"
        cache_hash = hashlib.sha256(params_str.encode()).hexdigest()
        cache_key = f"geojson:{cache_hash}"

        cached_data = await get_cache(cache_key)
        if cached_data:
            return json.loads(cached_data), f'W/"{cache_hash}"'

        conditions = self._build_filter_conditions(
            q=q,
            site_types=site_types,
            states=states,
            dynasties=dynasties,
            tags=tags,
            year_from=year_from,
            year_to=year_to,
            bbox=bbox,
            data_confidence=data_confidence,
            has_3d_model=has_3d_model
        )

        stmt = select(Site).where(and_(*conditions)).options(selectinload(Site.models_3d))
        result = await self.db.execute(stmt)
        sites = result.scalars().all()

        features = []
        is_clustered = False

        # If zoom is low (< 7.0) and there are sites, apply server-side grid clustering
        if zoom is not None and zoom < 7.0 and len(sites) > 5:
            is_clustered = True
            grid_size = 2.0 if zoom < 5.0 else 1.0

            clusters = {}
            for s in sites:
                gx = round(s.longitude / grid_size) * grid_size
                gy = round(s.latitude / grid_size) * grid_size
                cell = (gx, gy)
                if cell not in clusters:
                    clusters[cell] = []
                clusters[cell].append(s)

            for cell, cell_sites in clusters.items():
                if len(cell_sites) == 1:
                    s = cell_sites[0]
                    has_3d = bool(s.models_3d and any(m.status == "ready" for m in s.models_3d))
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [s.longitude, s.latitude]
                        },
                        "properties": {
                            "id": s.id,
                            "slug": s.slug,
                            "name": s.name,
                            "name_hi": s.name_hi,
                            "name_gu": s.name_gu,
                            "site_type": s.site_type,
                            "state": s.state,
                            "district": s.district,
                            "period_start_year": s.period_start_year,
                            "period_end_year": s.period_end_year,
                            "era_label": s.era_label,
                            "data_confidence": s.data_confidence,
                            "hero_image": s.hero_image,
                            "has_3d_model": has_3d,
                            "cluster": False
                        }
                    })
                else:
                    avg_lng = sum(s.longitude for s in cell_sites) / len(cell_sites)
                    avg_lat = sum(s.latitude for s in cell_sites) / len(cell_sites)
                    types = list(set(s.site_type for s in cell_sites))
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [round(avg_lng, 4), round(avg_lat, 4)]
                        },
                        "properties": {
                            "cluster": True,
                            "point_count": len(cell_sites),
                            "point_count_abbreviated": str(len(cell_sites)),
                            "site_types": types,
                            "primary_type": types[0] if types else "heritage"
                        }
                    })
        else:
            for s in sites:
                has_3d = bool(s.models_3d and any(m.status == "ready" for m in s.models_3d))
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [s.longitude, s.latitude]
                    },
                    "properties": {
                        "id": s.id,
                        "slug": s.slug,
                        "name": s.name,
                        "name_hi": s.name_hi,
                        "name_gu": s.name_gu,
                        "site_type": s.site_type,
                        "state": s.state,
                        "district": s.district,
                        "period_start_year": s.period_start_year,
                        "period_end_year": s.period_end_year,
                        "era_label": s.era_label,
                        "data_confidence": s.data_confidence,
                        "hero_image": s.hero_image,
                        "has_3d_model": has_3d,
                        "cluster": False
                    }
                })

        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "total": len(sites),
            "clustered": is_clustered
        }

        # Store in redis cache with 120s TTL
        await set_cache(cache_key, json.dumps(geojson), expire_seconds=120)
        return geojson, f'W/"{cache_hash}"'

    async def get_facets(
        self,
        q: str | None = None,
        site_types: list[str] | None = None,
        states: list[str] | None = None,
        dynasties: list[str] | None = None,
        tags: list[str] | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        bbox: str | None = None,
        data_confidence: list[str] | None = None,
        has_3d_model: bool | None = None
    ) -> dict[str, Any]:
        conditions = self._build_filter_conditions(
            q=q,
            site_types=site_types,
            states=states,
            dynasties=dynasties,
            tags=tags,
            year_from=year_from,
            year_to=year_to,
            bbox=bbox,
            data_confidence=data_confidence,
            has_3d_model=has_3d_model
        )

        stmt = (
            select(Site)
            .where(and_(*conditions))
            .options(
                selectinload(Site.site_tags).selectinload(SiteTag.tag),
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty),
                selectinload(Site.models_3d)
            )
        )
        result = await self.db.execute(stmt)
        sites = result.scalars().all()

        type_counts = {}
        state_counts = {}
        dynasty_counts = {}
        era_counts = {}
        tag_counts = {}
        conf_counts = {}

        has_3d_count = sum(1 for s in sites if s.models_3d and any(m.status == "ready" for m in s.models_3d))
        has_3d_counts = {
            "true": has_3d_count,
            "false": len(sites) - has_3d_count
        }

        for s in sites:
            type_counts[s.site_type] = type_counts.get(s.site_type, 0) + 1
            state_counts[s.state] = state_counts.get(s.state, 0) + 1
            if s.dynasty:
                dynasty_counts[s.dynasty] = dynasty_counts.get(s.dynasty, 0) + 1
            if s.era_label:
                era_counts[s.era_label] = era_counts.get(s.era_label, 0) + 1
            conf_counts[s.data_confidence] = conf_counts.get(s.data_confidence, 0) + 1

            for st in s.site_tags:
                if st.tag:
                    tag_counts[st.tag.slug] = tag_counts.get(st.tag.slug, 0) + 1

        histogram = []
        for bucket in HISTOGRAM_BUCKETS:
            b_start = bucket["year_start"]
            b_end = bucket["year_end"]
            count = sum(
                1 for s in sites
                if (s.period_start_year is not None and s.period_start_year <= b_end) and
                   (s.period_end_year is None or s.period_end_year >= b_start)
            )
            histogram.append({
                "year_start": b_start,
                "year_end": b_end,
                "era_label": bucket["era_label"],
                "count": count
            })

        return {
            "site_type": type_counts,
            "state": state_counts,
            "dynasty": dynasty_counts,
            "era": era_counts,
            "tag": tag_counts,
            "data_confidence": conf_counts,
            "has_3d_model": has_3d_counts,
            "timeline_histogram": histogram,
            "total_sites": len(sites)
        }

    async def get_site_full(self, slug: str) -> dict[str, Any] | None:
        cache_key = f"site_full:{slug}"
        cached_json = await get_cache(cache_key)
        if cached_json:
            try:
                return json.loads(cached_json)
            except Exception:
                pass

        stmt = (
            select(Site)
            .where(
                and_(
                    or_(Site.slug == slug, Site.slug == slug.replace("-patan", ""), Site.slug == f"{slug}-patan"),
                    Site.deleted_at.is_(None)
                )
            )
            .options(
                selectinload(Site.media),
                selectinload(Site.models_3d).selectinload(Model3D.hotspots),
                selectinload(Site.folklore),
                selectinload(Site.observations),
                selectinload(Site.site_tags).selectinload(SiteTag.tag),
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty)
            )
        )
        result = await self.db.execute(stmt)
        s = result.scalars().first()
        if not s:
            return None

        # Determine 3D model availability and summary
        has_3d = False
        model_summary = None
        ready_models = [m for m in s.models_3d if m.status == "ready"]
        if ready_models:
            has_3d = True
            m = ready_models[0]
            model_summary = {
                "id": m.id,
                "title": m.title or f"{s.name} 3D Digital Twin",
                "format": m.format or "glb",
                "file_size_bytes": m.file_size_bytes or 0,
                "poly_count": m.poly_count or 0,
                "draco_compressed": m.draco_compressed or False,
                "source": m.source or "artist_made",
                "licence": m.licence or m.license or "CC-BY-4.0",
                "attribution": m.attribution or "Dharohar Heritage Team",
                "source_url": m.source_url,
                "scale_calibrated": m.scale_calibrated or False,
                "status": m.status or "ready",
                "model_url": m.model_url or "/models/stepwell_pavilion.opt.glb",
                "hotspots_count": len(m.hotspots)
            }

        # Nearby sites using PostGIS ST_Distance & ST_DWithin (limit 6)
        dist_expr = func.ST_Distance(Site.location, s.location)
        nearby_stmt = (
            select(Site, dist_expr.label("dist_meters"))
            .where(
                Site.id != s.id,
                Site.deleted_at.is_(None),
                func.ST_DWithin(Site.location, s.location, 2000000.0)
            )
            .options(selectinload(Site.models_3d))
            .order_by("dist_meters")
            .limit(6)
        )
        nearby_res = await self.db.execute(nearby_stmt)
        nearby_sites = []
        for n_site, dist_m in nearby_res.all():
            dist_km = round(dist_m / 1000.0, 1) if dist_m is not None else 0.0
            n_has_3d = bool(n_site.models_3d and any(m.status == "ready" for m in n_site.models_3d))
            nearby_sites.append({
                "id": n_site.id,
                "name": n_site.name,
                "slug": n_site.slug,
                "name_hi": n_site.name_hi,
                "name_gu": n_site.name_gu,
                "site_type": n_site.site_type,
                "state": n_site.state,
                "district": n_site.district,
                "era_label": n_site.era_label,
                "hero_image": n_site.hero_image,
                "distance_km": dist_km,
                "has_3d_model": n_has_3d
            })

        # Related routes
        route_stmt = (
            select(Route, RouteStop)
            .join(RouteStop, Route.id == RouteStop.route_id)
            .where(RouteStop.site_id == s.id)
            .order_by(RouteStop.stop_order)
        )
        route_res = await self.db.execute(route_stmt)
        related_routes = []
        for r, rs in route_res.all():
            related_routes.append({
                "id": r.id,
                "slug": r.slug,
                "title": r.title,
                "summary": r.summary,
                "total_distance_km": r.total_distance_km or 0.0,
                "estimated_duration_days": r.estimated_duration_days or 1,
                "stop_order": rs.stop_order,
                "arrival_note": rs.arrival_note
            })

        # Folklore items
        folklore_items = [
            {
                "id": f.id,
                "site_id": f.site_id,
                "title": f.title,
                "body_md": f.body_md or f.narrative or "",
                "language": f.language or "en",
                "kind": f.kind or "oral_history",
                "source": f.source or f.source_tradition,
                "source_url": f.source_url,
                "data_confidence": f.data_confidence or "likely",
                "is_illustrative": f.is_illustrative or False,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in (s.folklore or [])
        ]

        # Observations
        observation_items = [
            {
                "id": o.id,
                "site_id": o.site_id,
                "title": o.title,
                "body_md": getattr(o, "body_md", None) or getattr(o, "description", "") or "",
                "language": getattr(o, "language", "en") or "en",
                "kind": getattr(o, "kind", "architectural_feature") or "architectural_feature",
                "source": getattr(o, "source", None),
                "source_url": getattr(o, "source_url", None),
                "data_confidence": getattr(o, "data_confidence", "likely") or "likely",
                "is_illustrative": getattr(o, "is_illustrative", False) or False,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in (s.observations or [])
        ]

        full_data = {
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "name_hi": s.name_hi,
            "name_gu": s.name_gu,
            "summary": s.summary,
            "description": s.description or s.summary,
            "site_type": s.site_type,
            "era": s.era_label or s.era,
            "era_label": s.era_label,
            "era_start_year": s.period_start_year,
            "era_end_year": s.period_end_year,
            "period_start_year": s.period_start_year,
            "period_end_year": s.period_end_year,
            "dynasty": s.dynasty,
            "state": s.state,
            "district": s.district,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "hero_image": s.hero_image,
            "hero_image_attribution": s.hero_image_attribution,
            "hero_image_license": s.hero_image_license,
            "architectural_style": s.architectural_style,
            "data_confidence": s.data_confidence,
            "source_text": s.source_text,
            "source_url": s.source_url,
            "source": s.source,
            "significance": s.significance,
            "alternative_names": s.alternative_names or [],
            "media": [
                {
                    "id": m.id,
                    "media_type": m.media_type,
                    "url": m.url,
                    "thumbnail_url": m.thumbnail_url,
                    "caption": m.caption,
                    "license": m.license,
                    "attribution": m.attribution,
                    "source_url": m.source_url,
                    "provenance": m.provenance
                } for m in s.media
            ],
            "models_3d": [
                {
                    "id": m.id,
                    "title": m.title,
                    "model_url": m.model_url,
                    "format": m.format,
                    "poly_count": m.poly_count,
                    "scale_factor": m.scale_factor,
                    "license": m.license or m.licence,
                    "attribution": m.attribution,
                    "hotspots": [
                        {
                            "id": h.id,
                            "title": h.label or h.title,
                            "description": h.body_md or h.description,
                            "position_x": h.position_x,
                            "position_y": h.position_y,
                            "position_z": h.position_z,
                            "normal_x": h.normal_x,
                            "normal_y": h.normal_y,
                            "normal_z": h.normal_z,
                            "media_url": h.media_url
                        } for h in m.hotspots
                    ]
                } for m in s.models_3d
            ],
            "folklore": [
                {
                    "id": f.id,
                    "title": f.title,
                    "narrative": f.body_md or f.narrative or "",
                    "language": f.language,
                    "source_tradition": f.source_tradition or f.source or "",
                    "authenticity_status": f.authenticity_status or ("illustrative" if f.is_illustrative else "verified")
                } for f in s.folklore
            ],
            "observations": [
                {
                    "id": o.id,
                    "title": o.title,
                    "element_type": getattr(o, "element_type", getattr(o, "kind", "feature")),
                    "description": getattr(o, "body_md", getattr(o, "description", "")),
                    "masonry_detail": getattr(o, "masonry_detail", None),
                    "preservation_status": getattr(o, "preservation_status", "Documented"),
                    "recorded_by": getattr(o, "recorded_by", getattr(o, "source", "Dharohar Archives"))
                } for o in s.observations
            ],
            "tags": [st.tag.name for st in s.site_tags if st.tag],
            "dynasties": [sd.dynasty.name for sd in s.site_dynasties if sd.dynasty],
            "has_3d_model": has_3d,
            "model_summary": model_summary,
            "folklore_items": folklore_items,
            "observation_items": observation_items,
            "nearby_sites": nearby_sites,
            "related_routes": related_routes
        }

        # Cache in Redis with 300s TTL
        await set_cache(cache_key, json.dumps(full_data), expire_seconds=300)
        return full_data

    async def get_site_model(self, slug: str) -> dict[str, Any] | None:
        stmt = (
            select(Site)
            .where(
                and_(
                    or_(Site.slug == slug, Site.slug == slug.replace("-patan", ""), Site.slug == f"{slug}-patan"),
                    Site.deleted_at.is_(None)
                )
            )
            .options(
                selectinload(Site.models_3d).selectinload(Model3D.hotspots)
            )
        )
        result = await self.db.execute(stmt)
        s = result.scalars().first()
        if not s or not s.models_3d:
            return None

        ready_models = [m for m in s.models_3d if m.status == "ready"]
        if not ready_models:
            return None
        m = ready_models[0]

        sorted_hotspots = sorted(m.hotspots, key=lambda h: (h.sort_order if h.sort_order is not None else 0))
        hotspots_data = []
        for h in sorted_hotspots:
            pos = h.position if (h.position and isinstance(h.position, list)) else [h.position_x or 0.0, h.position_y or 0.0, h.position_z or 0.0]
            cam_pos = h.camera_position if (h.camera_position and isinstance(h.camera_position, list)) else [0.0, 2.0, 4.0]
            cam_tar = h.camera_target if (h.camera_target and isinstance(h.camera_target, list)) else [0.0, 0.0, 0.0]
            hotspots_data.append({
                "id": h.id,
                "model_id": h.model_id,
                "label": h.label or h.title or "Hotspot",
                "label_hi": h.label_hi,
                "label_gu": h.label_gu,
                "body_md": h.body_md or h.description or "",
                "position": pos,
                "camera_position": cam_pos,
                "camera_target": cam_tar,
                "media_ids": h.media_ids or [],
                "sort_order": h.sort_order or 0,
                "media_url": h.media_url
            })

        return {
            "id": m.id,
            "site_id": s.id,
            "title": m.title or f"{s.name} 3D Digital Twin",
            "format": m.format or "glb",
            "storage_key": m.storage_key,
            "file_size_bytes": m.file_size_bytes or 0,
            "poly_count": m.poly_count or 0,
            "draco_compressed": m.draco_compressed or False,
            "lod_levels": m.lod_levels or {},
            "source": m.source or "artist_made",
            "licence": m.licence or m.license or "CC-BY-4.0",
            "attribution": m.attribution or "Dharohar Heritage Team",
            "source_url": m.source_url,
            "scale_calibrated": m.scale_calibrated or False,
            "scale_factor": m.scale_factor or 1.0,
            "status": m.status or "ready",
            "model_url": m.model_url or "/models/stepwell_pavilion.opt.glb",
            "hotspots": hotspots_data
        }

    async def get_site_citation(self, slug: str, format_type: str = "bibtex") -> tuple[str, str, Any] | None:
        site_dict = await self.get_site_by_slug(slug)
        if not site_dict:
            return None

        today = datetime.utcnow()
        today_str = today.strftime("%Y-%m-%d")
        today_year = today.year
        month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        month_name = month_names[today.month - 1]
        formatted_date_apa = f"{month_name} {today.day}, {today.year}"

        canonical_url = f"https://dharohar-atlas.org/sites/{site_dict['slug']}"
        site_name = site_dict["name"]
        licence = site_dict.get("hero_image_license") or "CC-BY-4.0"
        source = site_dict.get("source_text") or site_dict.get("source") or "Dharohar Atlas Cultural Heritage Archives"
        summary = site_dict.get("summary") or ""
        cite_key = f"{site_dict['slug']}-{today_year}"

        fmt = format_type.lower().strip()
        if fmt == "bibtex":
            content = f"""@misc{{{cite_key},
  author = {{{{Dharohar Atlas Cultural Heritage Archives}}}},
  title = {{{site_name}}},
  year = {{{today_year}}},
  howpublished = {{\\url{{{canonical_url}}}}},
  note = {{Accessed: {today_str}. Licenced under {licence}. Source: {source}}}
}}"""
            return "application/x-bibtex; charset=utf-8", f"{cite_key}.bib", content

        elif fmt == "apa":
            content = f"Dharohar Atlas. ({today_year}). {site_name}. Dharohar Atlas Cultural Heritage Archives. Retrieved {formatted_date_apa}, from {canonical_url}. Source: {source}. Licence: {licence}."
            return "text/plain; charset=utf-8", f"{cite_key}.txt", content

        elif fmt == "ris":
            content = f"""TY  - ELEC
TI  - {site_name}
AU  - Dharohar Atlas Cultural Heritage Archives
PY  - {today_year}
UR  - {canonical_url}
Y2  - {today.strftime('%Y/%m/%d')}
AB  - {summary}
N1  - Source: {source}. Licence: {licence}.
ER  - 
"""
            return "application/x-research-info-systems; charset=utf-8", f"{cite_key}.ris", content

        elif fmt == "csl-json":
            content = {
                "id": site_dict["slug"],
                "type": "webpage",
                "title": site_name,
                "author": [{"family": "Dharohar Atlas Archives"}],
                "issued": {"date-parts": [[today_year]]},
                "accessed": {"date-parts": [[today.year, today.month, today.day]]},
                "URL": canonical_url,
                "publisher": "Dharohar Atlas Cultural Heritage Archives",
                "license": licence,
                "source": source
            }
            return "application/json; charset=utf-8", f"{cite_key}.json", content
        else:
            return None

    async def get_site_og(self, slug: str) -> dict[str, Any] | None:
        site_dict = await self.get_site_by_slug(slug)
        if not site_dict:
            return None
        has_3d = False
        if site_dict.get("models_3d"):
            has_3d = True

        return {
            "title": f"{site_dict['name']} | Dharohar Atlas",
            "description": site_dict.get("summary") or "Digital Revitalisation of Cultural Heritage Archives",
            "image": site_dict.get("hero_image"),
            "url": f"https://dharohar-atlas.org/sites/{site_dict['slug']}",
            "site_name": "Dharohar Atlas",
            "type": "article",
            "locale": "en_IN",
            "era": site_dict.get("era_label"),
            "state": site_dict.get("state"),
            "has_3d_model": has_3d
        }
