import json
import math
import hashlib
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_, func, not_
from app.models.models import Site, SiteMedia, Model3D, Tag, SiteTag, Dynasty, SiteDynasty
from app.core.redis_cache import get_cache, set_cache

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
        q: Optional[str] = None,
        site_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        dynasties: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        bbox: Optional[str] = None,
        data_confidence: Optional[List[str]] = None,
    ) -> List[Any]:
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
        q: Optional[str] = None,
        site_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        dynasties: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        bbox: Optional[str] = None,
        data_confidence: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int, Optional[str]]:
        conditions = self._build_filter_conditions(
            q=q,
            site_types=site_types,
            states=states,
            dynasties=dynasties,
            tags=tags,
            year_from=year_from,
            year_to=year_to,
            bbox=bbox,
            data_confidence=data_confidence
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
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty)
            )
            .order_by(Site.period_start_year.asc().nullslast(), Site.name.asc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(stmt)
        sites = result.scalars().all()

        items = []
        for s in sites:
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
                "dynasties": [sd.dynasty.name for sd in s.site_dynasties if sd.dynasty]
            })

        next_cursor = str(offset + limit) if (offset + limit) < total else None
        return items, total, next_cursor

    async def get_site_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
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
                    "narrative": f.narrative,
                    "language": f.language,
                    "source_tradition": f.source_tradition,
                    "authenticity_status": f.authenticity_status
                } for f in s.folklore
            ],
            "observations": [
                {
                    "id": o.id,
                    "title": o.title,
                    "element_type": o.element_type,
                    "description": o.description,
                    "masonry_detail": o.masonry_detail,
                    "preservation_status": o.preservation_status,
                    "recorded_by": o.recorded_by
                } for o in s.observations
            ],
            "tags": [st.tag.name for st in s.site_tags if st.tag],
            "dynasties": [sd.dynasty.name for sd in s.site_dynasties if sd.dynasty]
        }

    async def get_geojson(
        self,
        bbox: Optional[str] = None,
        zoom: Optional[float] = None,
        q: Optional[str] = None,
        site_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        dynasties: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        data_confidence: Optional[List[str]] = None
    ) -> Tuple[Dict[str, Any], str]:
        # Cache key construction
        params_str = f"{bbox}_{zoom}_{q}_{site_types}_{states}_{dynasties}_{tags}_{year_from}_{year_to}_{data_confidence}"
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
            data_confidence=data_confidence
        )

        stmt = select(Site).where(and_(*conditions))
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
        q: Optional[str] = None,
        site_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        dynasties: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        bbox: Optional[str] = None,
        data_confidence: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        conditions = self._build_filter_conditions(
            q=q,
            site_types=site_types,
            states=states,
            dynasties=dynasties,
            tags=tags,
            year_from=year_from,
            year_to=year_to,
            bbox=bbox,
            data_confidence=data_confidence
        )

        stmt = (
            select(Site)
            .where(and_(*conditions))
            .options(
                selectinload(Site.site_tags).selectinload(SiteTag.tag),
                selectinload(Site.site_dynasties).selectinload(SiteDynasty.dynasty)
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
            "timeline_histogram": histogram,
            "total_sites": len(sites)
        }
