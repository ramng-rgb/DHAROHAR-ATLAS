# Changelog

All notable changes to the **Dharohar Atlas** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Automated Verification Tests:**
  - 21 Pytest backend tests (100% pass, 90% coverage on `site_service.py`, 91% overall).
  - 7 Vitest frontend unit tests (100% pass) verifying BCE calculations and URL state parsing.
  - 3 Playwright E2E integration tests (100% pass in 1.9s) testing filter-scrub-drawer-reload, BCE Indus sites, and 360px mobile viewports.

---

## [1.0.0] - 2026-10-31 (Milestone 0: Architecture & Infrastructure Setup)

### Added
- Docker Compose environment with PostgreSQL 17 + pgvector + PostGIS and Redis 8.
- FastAPI backend scaffolding with async SQLAlchemy session management and `/api/v1/health`.
- Next.js 14 App Router frontend foundation with Tailwind CSS and theme tokens.
- Initial GitHub Actions CI pipeline for backend test, frontend build, and typecheck.
