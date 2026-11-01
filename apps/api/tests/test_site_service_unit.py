import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import settings
from app.services.site_service import SiteService, haversine_distance

@pytest.mark.asyncio
async def test_site_service_direct_unit():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        service = SiteService(session)

        # 1. Test listing with pagination and filters
        items, total, next_cursor = await service.list_sites(
            site_types=["stepwell"],
            states=["Gujarat"],
            year_from=500,
            year_to=1600,
            limit=5,
            offset=0
        )
        assert total >= 3
        assert len(items) <= 5
        assert all(it["site_type"] == "stepwell" for it in items)

        # 2. Test bbox filtering
        items_bbox, total_bbox, _ = await service.list_sites(
            bbox="68.0,20.0,74.5,24.5",
            limit=50
        )
        assert total_bbox >= 10

        # 3. Test get_site_by_slug
        site = await service.get_site_by_slug("rani-ki-vav")
        assert site is not None
        assert site["name"] == "Rani ki Vav (The Queen's Stepwell)"
        assert "Solanki" in str(site["dynasties"]) or site["dynasty"] is not None

        # 4. Test non-existent site
        non_existent = await service.get_site_by_slug("non-existent-ruin-xyz")
        assert non_existent is None

        # 5. Test GeoJSON clustering at low zoom
        geojson_clustered, etag_clustered = await service.get_geojson(zoom=3.0)
        assert geojson_clustered["type"] == "FeatureCollection"
        assert geojson_clustered["clustered"] is True
        assert etag_clustered.startswith('W/"')

        # 6. Test GeoJSON unclustered at high zoom
        geojson_detailed, etag_detailed = await service.get_geojson(zoom=12.0)
        assert geojson_detailed["type"] == "FeatureCollection"
        assert geojson_detailed["clustered"] is False
        assert len(geojson_detailed["features"]) >= 20

        # 7. Test facets computation
        facets = await service.get_facets(states=["Gujarat"])
        assert facets["total_sites"] >= 10
        assert "stepwell" in facets["site_type"]
        assert len(facets["timeline_histogram"]) > 0

        # 8. Test distance calculation
        dist = haversine_distance(23.8589, 72.1017, 23.5836, 72.1333)
        assert 25.0 < dist < 35.0

    await engine.dispose()
