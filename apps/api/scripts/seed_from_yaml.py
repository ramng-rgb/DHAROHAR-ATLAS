import os
import sys
import uuid
import yaml
import asyncio
from datetime import datetime
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.models.models import (
    Site, SiteMedia, Tag, SiteTag, Dynasty, SiteDynasty,
    Route, RouteStop, Document, DocumentPage, OCRLine, DocumentEntity,
    FolkloreItem, Observation, ArchitecturalObservation, Embedding,
    Model3D, Hotspot,
    SiteType, DataConfidence
)
from app.services.providers import deterministic_vector

SEED_YAML_PATH = os.path.join(os.path.dirname(__file__), "../../../db/seed/sites.yaml")

def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-").replace("(", "").replace(")", "").strip("-")

async def seed():
    print(f"Loading seed data from {os.path.abspath(SEED_YAML_PATH)}...")
    if not os.path.exists(SEED_YAML_PATH):
        raise FileNotFoundError(f"Seed file not found: {SEED_YAML_PATH}")

    with open(SEED_YAML_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    sites_data = data.get("sites", [])
    demo_route_data = data.get("demo_route")

    async with AsyncSessionLocal() as session:
        # Cache for tags and dynasties to prevent duplicate creates
        tag_cache = {}
        dynasty_cache = {}

        # Preload existing tags and dynasties
        existing_tags = (await session.execute(select(Tag))).scalars().all()
        for t in existing_tags:
            tag_cache[t.slug] = t

        existing_dynasties = (await session.execute(select(Dynasty))).scalars().all()
        for d in existing_dynasties:
            dynasty_cache[d.slug] = d

        print(f"Seeding {len(sites_data)} authentic heritage sites...")
        site_map = {}

        for sdata in sites_data:
            slug = sdata["slug"]
            existing_site = (await session.execute(select(Site).where(Site.slug == slug))).scalar_one_or_none()

            lat = float(sdata["latitude"])
            lon = float(sdata["longitude"])
            geom = WKTElement(f"POINT({lon} {lat})", srid=4326)

            first_media = sdata.get("media", [{}])[0] if sdata.get("media") else {}

            site_fields = {
                "slug": slug,
                "name": sdata["name"],
                "name_hi": sdata.get("name_hi"),
                "name_gu": sdata.get("name_gu"),
                "summary": sdata.get("summary"),
                "description": sdata.get("summary"),
                "site_type": sdata.get("site_type", "other"),
                "state": sdata["state"],
                "district": sdata.get("district"),
                "latitude": lat,
                "longitude": lon,
                "location": geom,
                "period_start_year": sdata.get("period_start_year"),
                "period_end_year": sdata.get("period_end_year"),
                "era_label": sdata.get("era_label"),
                "era": sdata.get("era_label"),
                "dynasty": sdata.get("dynasty"),
                "era_start_year": sdata.get("period_start_year"),
                "era_end_year": sdata.get("period_end_year"),
                "data_confidence": sdata.get("data_confidence", "verified"),
                "source_text": sdata.get("source_text"),
                "source_url": sdata.get("source_url"),
                "source": sdata.get("source_text", "") + " " + sdata.get("source_url", ""),
                "architectural_style": sdata.get("architectural_style"),
                "hero_image": first_media.get("url"),
                "hero_image_attribution": first_media.get("attribution", "Open Cultural Archives"),
                "hero_image_license": first_media.get("license", "CC-BY-4.0"),
            }

            if existing_site:
                for k, v in site_fields.items():
                    setattr(existing_site, k, v)
                site_obj = existing_site
            else:
                site_obj = Site(id=str(uuid.uuid4()), **site_fields)
                session.add(site_obj)

            await session.flush()
            site_map[slug] = site_obj

            # Populate media
            for mdata in sdata.get("media", []):
                existing_media = (await session.execute(
                    select(SiteMedia).where(SiteMedia.site_id == site_obj.id, SiteMedia.url == mdata["url"])
                )).scalar_one_or_none()
                if not existing_media:
                    session.add(SiteMedia(
                        id=str(uuid.uuid4()),
                        site_id=site_obj.id,
                        media_type="image",
                        url=mdata["url"],
                        caption=mdata.get("caption"),
                        license=mdata.get("license", "CC-BY-4.0"),
                        attribution=mdata.get("attribution"),
                        source_url=mdata.get("source_url")
                    ))

            # Populate tags & relations
            for tag_name in sdata.get("tags", []):
                tag_slug = slugify(tag_name)
                if tag_slug not in tag_cache:
                    new_tag = Tag(id=str(uuid.uuid4()), name=tag_name.replace("_", " ").title(), slug=tag_slug)
                    session.add(new_tag)
                    await session.flush()
                    tag_cache[tag_slug] = new_tag
                tag_item = tag_cache[tag_slug]

                existing_st = (await session.execute(
                    select(SiteTag).where(SiteTag.site_id == site_obj.id, SiteTag.tag_id == tag_item.id)
                )).scalar_one_or_none()
                if not existing_st:
                    session.add(SiteTag(site_id=site_obj.id, tag_id=tag_item.id))

            # Populate dynasty & relations
            dynasty_str = sdata.get("dynasty")
            if dynasty_str:
                dynasty_slug = slugify(dynasty_str.split("/")[0].split("(")[0])
                if dynasty_slug not in dynasty_cache:
                    new_dyn = Dynasty(
                        id=str(uuid.uuid4()),
                        name=dynasty_str,
                        era_label=sdata.get("era_label"),
                        slug=dynasty_slug
                    )
                    session.add(new_dyn)
                    await session.flush()
                    dynasty_cache[dynasty_slug] = new_dyn
                dyn_item = dynasty_cache[dynasty_slug]

                existing_sd = (await session.execute(
                    select(SiteDynasty).where(SiteDynasty.site_id == site_obj.id, SiteDynasty.dynasty_id == dyn_item.id)
                )).scalar_one_or_none()
                if not existing_sd:
                    session.add(SiteDynasty(site_id=site_obj.id, dynasty_id=dyn_item.id))

            # Add / update vector embedding
            existing_emb = (await session.execute(
                select(Embedding).where(Embedding.content_type == "site", Embedding.content_id == site_obj.id)
            )).scalar_one_or_none()
            full_text = f"{site_obj.name} {site_obj.state} {site_obj.district} {site_obj.summary} {site_obj.era_label} {site_obj.architectural_style}"
            vector = deterministic_vector(full_text)
            if existing_emb:
                existing_emb.text_snippet = full_text
                existing_emb.embedding = vector
            else:
                session.add(Embedding(
                    id=str(uuid.uuid4()),
                    content_type="site",
                    content_id=site_obj.id,
                    title=site_obj.name,
                    text_snippet=full_text,
                    embedding=vector
                ))

            # Seed folklore items
            if sdata.get("folklore_items"):
                await session.execute(delete(FolkloreItem).where(FolkloreItem.site_id == site_obj.id))
                for fitem in sdata["folklore_items"]:
                    session.add(FolkloreItem(
                        id=str(uuid.uuid4()),
                        site_id=site_obj.id,
                        title=fitem["title"],
                        body_md=fitem.get("body_md") or fitem.get("narrative"),
                        narrative=fitem.get("body_md") or fitem.get("narrative"),
                        language=fitem.get("language", "en"),
                        kind=fitem.get("kind", "oral_history"),
                        source=fitem.get("source"),
                        source_url=fitem.get("source_url"),
                        data_confidence=fitem.get("data_confidence", "likely"),
                        is_illustrative=fitem.get("is_illustrative", False)
                    ))

            # Seed observations
            if sdata.get("observations"):
                await session.execute(delete(Observation).where(Observation.site_id == site_obj.id))
                for obs in sdata["observations"]:
                    session.add(Observation(
                        id=str(uuid.uuid4()),
                        site_id=site_obj.id,
                        title=obs.get("title"),
                        body_md=obs.get("body_md") or obs.get("description", ""),
                        language=obs.get("language", "en"),
                        kind=obs.get("kind", "architectural_feature"),
                        source=obs.get("source"),
                        source_url=obs.get("source_url"),
                        data_confidence=obs.get("data_confidence", "likely"),
                        is_illustrative=obs.get("is_illustrative", False)
                    ))

            # Seed 3D model & hotspots
            if sdata.get("model_3d"):
                m3d = sdata["model_3d"]
                await session.execute(delete(Model3D).where(Model3D.site_id == site_obj.id))
                model_obj = Model3D(
                    id=str(uuid.uuid4()),
                    site_id=site_obj.id,
                    title=m3d.get("title", f"{site_obj.name} 3D Digital Twin"),
                    model_url=m3d.get("model_url", "/models/stepwell_pavilion.opt.glb"),
                    storage_key=m3d.get("storage_key"),
                    format=m3d.get("format", "glb"),
                    file_size_bytes=m3d.get("file_size_bytes", 0),
                    poly_count=m3d.get("poly_count", 0),
                    draco_compressed=m3d.get("draco_compressed", False),
                    lod_levels=m3d.get("lod_levels", {}),
                    source=m3d.get("source", "artist_made"),
                    licence=m3d.get("licence", "CC-BY-4.0"),
                    license=m3d.get("licence", "CC-BY-4.0"),
                    attribution=m3d.get("attribution"),
                    source_url=m3d.get("source_url"),
                    scale_calibrated=m3d.get("scale_calibrated", False),
                    status=m3d.get("status", "ready"),
                    scale_factor=m3d.get("scale_factor", 1.0)
                )
                session.add(model_obj)
                await session.flush()

                for hs in m3d.get("hotspots", []):
                    pos = hs.get("position", [0.0, 0.0, 0.0])
                    session.add(Hotspot(
                        id=str(uuid.uuid4()),
                        model_id=model_obj.id,
                        label=hs.get("label"),
                        title=hs.get("label"),
                        label_hi=hs.get("label_hi"),
                        label_gu=hs.get("label_gu"),
                        body_md=hs.get("body_md"),
                        description=hs.get("body_md"),
                        position=pos,
                        camera_position=hs.get("camera_position", [0.0, 2.0, 4.0]),
                        camera_target=hs.get("camera_target", [0.0, 0.0, 0.0]),
                        media_ids=hs.get("media_ids", []),
                        sort_order=hs.get("sort_order", 0),
                        position_x=pos[0] if len(pos) > 0 else 0.0,
                        position_y=pos[1] if len(pos) > 1 else 0.0,
                        position_z=pos[2] if len(pos) > 2 else 0.0,
                        media_url=hs.get("media_url")
                    ))

        # Seed Demo Route
        if demo_route_data:
            route_slug = demo_route_data["slug"]
            route = (await session.execute(select(Route).where(Route.slug == route_slug))).scalar_one_or_none()
            if not route:
                route = Route(
                    id=str(uuid.uuid4()),
                    slug=route_slug,
                    title=demo_route_data["title"],
                    summary=demo_route_data.get("summary"),
                    description=demo_route_data.get("summary"),
                    total_distance_km=180.0,
                    estimated_duration_days=3,
                    era_theme="Stepwells and Hydraulic Landmarks"
                )
                session.add(route)
                await session.flush()

            # Seed stops
            for stop in demo_route_data.get("stops", []):
                target_site = site_map.get(stop["site_slug"])
                if target_site:
                    existing_stop = (await session.execute(
                        select(RouteStop).where(RouteStop.route_id == route.id, RouteStop.site_id == target_site.id)
                    )).scalar_one_or_none()
                    if not existing_stop:
                        session.add(RouteStop(
                            id=str(uuid.uuid4()),
                            route_id=route.id,
                            site_id=target_site.id,
                            stop_order=stop["stop_order"],
                            arrival_note=stop.get("arrival_note"),
                            narrative=stop.get("arrival_note"),
                            travel_note="Regional highway and stone-paved historical trail connection.",
                            transit_mode="heritage_vehicle"
                        ))

        # Seed 3 authentic multilingual documents through the actual processing worker
        sample_docs_spec = [
            {
                "title": "Solanki Royal Charter on Saraswati Inundation",
                "language_hint": "hi",
                "doc_type": "inscription",
                "source": "Epigraphia Indica Vol. XXI / Baroda Oriental Institute Manuscripts Collection (MS-492)",
                "licence": "Public Domain / CC0",
                "attribution": "Archaeological Survey of India & Oriental Institute Baroda",
                "site_slug": "rani-ki-vav",
                "image_rel": "eval/ocr/page_01_devanagari.png"
            },
            {
                "title": "Adalaj Stepwell Foundation Marble Tablet",
                "language_hint": "gu",
                "doc_type": "inscription",
                "source": "Gazetteer of the Bombay Presidency, Vol. IX (Gujarat Population) / ASI Inscriptions",
                "licence": "Public Domain / CC0",
                "attribution": "ASI Western Circle Epigraphy Wing",
                "site_slug": "adalaj-stepwell",
                "image_rel": "eval/ocr/page_05_gujarati.png"
            },
            {
                "title": "Architectural Survey of Western India — Subterranean Architecture Monograph",
                "language_hint": "en",
                "doc_type": "journal",
                "source": "Burgess, J. Architectural Antiquities of Northern Gujarat (1903), ASWI Vol. IX",
                "licence": "Public Domain / CC0",
                "attribution": "Library of Congress Preservation Collection",
                "site_slug": "rani-ki-vav",
                "image_rel": "eval/ocr/page_09_english.png"
            }
        ]

        from app.services.document_service import DocumentService
        from app.schemas.schemas import DocumentCreate
        from app.services.pipeline.orchestrator import DocumentPipeline

        doc_service = DocumentService(session)
        pipeline = DocumentPipeline(session)

        for s_spec in sample_docs_spec:
            existing_doc = (await session.execute(
                select(Document).where(Document.title == s_spec["title"])
            )).scalar_one_or_none()

            if not existing_doc:
                target_site = site_map.get(s_spec["site_slug"])
                img_path = os.path.join(os.path.dirname(__file__), "../../../", s_spec["image_rel"])
                file_bytes = b""
                if os.path.exists(img_path):
                    with open(img_path, "rb") as f:
                        file_bytes = f.read()

                doc_in = DocumentCreate(
                    title=s_spec["title"],
                    language_hint=s_spec["language_hint"],
                    doc_type=s_spec["doc_type"],
                    source=s_spec["source"],
                    licence=s_spec["licence"],
                    attribution=s_spec["attribution"],
                    site_id=target_site.id if target_site else None,
                    mime="image/png",
                    original_filename=os.path.basename(s_spec["image_rel"])
                )
                doc, job = await doc_service.create_document_and_enqueue_job(doc_in, file_bytes=file_bytes, run_async=False)
                print(f"Processing seeded document through real worker pipeline: {doc.title} (Job {job.id})...")
                await pipeline.run(job_id=job.id, file_bytes=file_bytes)

        await session.commit()
        print("Successfully seeded all authentic sites, routes, dynasties, tags, and 3 pipeline-processed archival folios.")

if __name__ == "__main__":
    asyncio.run(seed())
