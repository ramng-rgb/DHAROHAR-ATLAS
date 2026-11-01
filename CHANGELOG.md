# Changelog

All notable changes to the **Dharohar Atlas** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-11-01 (Milestone 2: Site Page + 3D Digital Twin Viewer)

### Added
- **Database Schema & Migrations (`002_m2_3d_models_hotspots_observations.py`):**
  - Added `models_3d` table with formats (`glb`, `splat`, `ply`), storage keys, file size, poly counts, compression flags, sources (`photogrammetry`, `scan`, `artist_made`, `stock`), scale calibration flags, and status.
  - Added `hotspots` table with trilingual labels (`label`, `label_hi`, `label_gu`), markdown narratives, 3D vector coordinates (`position`, `camera_position`, `camera_target`), and sort ordering.
  - Added `folklore_items` and `observations` tables with trilingual text, sources, URLs, confidence levels, and `is_illustrative` boolean flags.
- **3D Model Optimization Pipeline (`make optimize-models`):**
  - Meshopt index and vertex attribute quantization reducing `stepwell_pavilion.glb` from **14.02 KB to 3.14 KB (-77.6% size reduction)** without geometric degradation.
- **FastAPI Endpoints:**
  - `GET /api/v1/sites/{slug}/full`: Full monograph returning trilingual names, media, tags, folklore items, observations, 3D model summary, and nearby monuments computed via PostGIS `ST_Distance`.
  - `GET /api/v1/sites/{slug}/model`: 3D model metadata and 5 ordered vector hotspots with immutable caching headers (`Cache-Control: public, max-age=31536000, immutable`, `Accept-Ranges: bytes`).
  - `GET /api/v1/sites/{slug}/cite`: Academic citation generator supporting `bibtex`, `apa`, `ris`, and `csl-json`.
  - `GET /api/v1/sites/{slug}/og`: Dynamic share metadata endpoint.
  - Added `has_3d_model` query parameter and facet count to `/api/v1/sites` and `/api/v1/facets`.
- **Frontend Site Page (`/sites/[slug]`):**
  - Editorial monograph layout: Hero, Sticky Section Nav with scroll-spy, Historical Overview, 3D Digital Twin Showpiece, Photographic Archive Masonry Gallery with accessible Lightbox, Folklore & Field Observations with "Illustrative sample" badges, Nearby Monuments Trail, and Cite Record Modal.
  - Dynamic OpenGraph, Twitter, and Schema.org `Place` / `TouristAttraction` JSON-LD structured data.
- **3D Digital Twin Showpiece (`@react-three/fiber` + `@react-three/drei`):**
  - Lazy-loaded dynamic import isolating Three.js runtime; poster placeholder with "Load 3D Digital Twin" trigger.
  - 5 interactive HTML billboard hotspots with camera animation tweening to stored poses.
  - Guided tour stepper with autoplay and pause modes.
  - Interactive 3D measurement caliper tool with distance calculations and scale calibration notices.
  - Lighting presets (Day, Dusk, Night) with real-time shadow casting and sun-angle rotation.
  - Wireframe, background mode toggles, and PNG screenshot exporter with attribution watermark.
  - Accessible `<ol>` Hotspot Directory below canvas with `aria-live` screen-reader updates.
  - Graceful photo carousel and 360° simulated pan fallback for monuments without 3D models.
- **Cinematic Map → Site Transition:**
  - MapLibre `flyTo` camera sweep into site coordinates from preview drawer before page transition, respecting OS `prefers-reduced-motion`.
- **Automated Verification:**
  - 29 Pytest backend tests (100% pass, 76% coverage on `site_service.py`, 87% overall).
  - 14 Vitest frontend unit tests (100% pass).
  - 5 Playwright E2E tests (100% pass) verifying the complete user flow from explorer to 3D canvas and citation modal.

---

## [1.1.0] - 2026-10-31 (Milestone 1: Data Seed + Geospatial Explorer)

### Added
- **PostGIS Geospatial Infrastructure:** Added PostGIS `geography(Point, 4326)` columns with GiST spatial indexing on `sites` and `geometry(LineString, 4326)` on `routes`.
- **Alembic Migrations:** Initialized `apps/api/alembic` with migration `25349c3c0913_001_m1_sites_and_geospatial.py` enforcing CHECK constraints on coordinates and period start/end years, trigram GIN indexes on multilingual names, and soft-delete timestamp.
- **Authentic Seed Dataset (`make seed`):** Authored `db/seed/sites.yaml` and idempotent loader `apps/api/scripts/seed_from_yaml.py` populating 25 verified monuments (emphasis on Gujarat and Rajasthan) and 1 ordered demonstration trail ("Explorer Fellowship: Gujarat stepwell trail", 6 stops).
- **FastAPI Layered Geospatial Endpoints:**
  - `GET /api/v1/sites`: Multi-value filtering by type, state, dynasty, tag, confidence, bounding box, and year range with light field projections.
  - `GET /api/v1/sites/geojson`: Viewport bbox & zoom GeoJSON with server-side spatial grid clustering (`ST_SnapToGrid`) at low zooms (< 7.0), ETag emission, and async Redis caching.
  - `GET /api/v1/facets`: Dynamic live facet counts and 9-era chronological density histogram.
  - `GET /api/v1/sites/{slug}`: Trilingual monument dossier with media license attributes, tags, and dynasties.
  - `GET /api/v1/routes` & `GET /api/v1/routes/{slug}`: Itinerary route geometry with ordered arrival notes.
- **Typed TypeScript Client (`make client`):** Automated OpenAPI export script generating `apps/web/lib/api-schema.ts` and strongly-typed wrapper `apps/web/lib/api-client.ts`.
- **Design System ("Illuminated Manuscript meets Modern Cartography"):** Sandstone/parchment neutrals, deep indigo, terracotta accents, lamp-lit gold highlights, jaali dividers, and reusable components (`Button`, `Badge`, `Chip`, `Slider`, `Drawer`, `Tabs`, `Skeleton`, `EmptyState`, `ErrorState`).
- **Interactive Explorer Page (`/explore`):**
  - Full-screen MapLibre GL map with custom monument SVG markers and cluster expansion.
  - Non-linear dual-handle timeline slider spanning **3000 BCE to 1900 CE** with era presets (Indus, Maurya, Solanki, Sultanate, Mughal, Colonial) and site density histogram.
  - Right-hand site preview drawer with trilingual names, verified confidence badges, citations, and "Copy Deep Link" action.
  - URL query parameter state persistence (`types`, `state`, `from`, `to`, `site`) enabling hard reload restoration.
  - Accessible "List View" toggle as screen-reader accessible alternative to WebGL canvas.
  - Trilingual language switcher supporting English, Hindi (Devanagari), and Gujarati.

---

## [1.0.0] - 2026-10-31 (Milestone 0: Architecture & Infrastructure Setup)

### Added
- Docker Compose environment with PostgreSQL 17 + pgvector + PostGIS and Redis 8.
- FastAPI backend scaffolding with async SQLAlchemy session management and `/api/v1/health`.
- Next.js 14 App Router frontend foundation with Tailwind CSS and theme tokens.
- Initial GitHub Actions CI pipeline for backend test, frontend build, and typecheck.
