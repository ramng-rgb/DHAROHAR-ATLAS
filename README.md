# DHAROHAR ATLAS (धरोहर ज्ञान सेतु)
> **The Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives**
> *Developed for Blithchron '27, IIT Gandhinagar (Hackathon Problem: HC26-CULT01)*

[![CI Pipeline](https://github.com/dharohar-atlas/dharohar-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/dharohar-atlas/dharohar-atlas/actions)
[![License: CC-BY-4.0](https://img.shields.io/badge/License-CC--BY--4.0-gold.svg)](https://creativecommons.org/licenses/by/4.0/)
[![PostgreSQL 17 + PostGIS](https://img.shields.io/badge/PostgreSQL-17%20%2B%20PostGIS%203.7-blue.svg)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%20Async-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![Three.js & R3F](https://img.shields.io/badge/3D%20Digital%20Twin-React%20Three%20Fiber%20%2B%20Drei-orange.svg)](https://docs.pmnd.rs/react-three-fiber)

---

## 1. Executive Summary & Capabilities

Across India, thousands of heritage surveys, subterranean stepwell photographs, and Devanagari/Old Gujarati manuscripts sit trapped in static PowerPoint decks and inaccessible cloud storage folders.

**Dharohar Atlas** revitalises this unstructured archive into a unified, interactive platform:
- **Milestone 1 — Geospatial Explorer (`/explore`):** Full-screen historical GIS (MapLibre GL) featuring 25 authentic Indian heritage sites (strong Gujarat & Rajasthan focus: Rani ki Vav, Adalaj Vav, Dada Harir, Modhera Sun Temple, Champaner, Dholavira, Lothal, Chand Baori, Hampi).
- **Milestone 2 — Site Page & 3D Digital Twin Viewer (`/sites/[slug]`):** Server-rendered monument monograph featuring an interactive 3D digital twin of Rani ki Vav, annotated spatial hotspots, tour stepper with autoplay, measurement caliper tool, lighting presets (Day, Dusk, Night) with sun-angle shadow casting, wireframe toggle, watermark screenshot export, trilingual names (EN, HI, GU), masonry photo gallery with accessible lightbox, living folklore with "Illustrative sample" badges, PostGIS nearby trail calculator, and multi-format citation exporter (BibTeX, APA, RIS, CSL-JSON).
- **Cinematic Map → Site Transition:** Selecting a monument in the Explorer preview drawer triggers a smooth MapLibre `flyTo` camera sweep into the coordinates before navigating to `/sites/[slug]`, automatically falling back to an instant fade when `prefers-reduced-motion` is active.
- **Dual-Handle Timeline Scrubber:** Non-linear chronological scrub across **3000 BCE to 1900 CE** with historical era presets (Indus, Maurya, Solanki, Sultanate, Mughal, Colonial) and dynamic histogram density.
- **Accessible Screen Reader Mode:** Toggleable "List View" alternative providing complete keyboard-navigable access to the entire monument archive.
- **Trilingual Localization:** Instant zero-reload switching between English (`EN`), Hindi (`HI`), and Gujarati (`GU`).

---

## 2. 3D Asset Pipeline & Engineering Architecture

### 2.1 Optimization Pipeline (`make optimize-models`)
Photogrammetric models are processed via `scripts/optimize_models.py` (`@gltf-transform/cli`):
- **Raw Asset:** `stepwell_pavilion.glb` — 14.02 KB (14,352 bytes).
- **Optimized Asset:** `stepwell_pavilion.opt.glb` — 3.14 KB (3,216 bytes).
- **Compression Efficiency:** **-77.6% size reduction** via Meshopt quantization of vertex attributes and index deduplication.
- **Delivery Headers:** Served with `Cache-Control: public, max-age=31536000, immutable` and `Accept-Ranges: bytes` for zero bandwidth waste and chunked HTTP streaming.

### 2.2 Lazy-Loaded WebGL Isolation
To protect Lighthouse mobile scores and prevent bundle bloat:
- `DigitalTwinCanvas` is dynamically imported via `next/dynamic(..., { ssr: false })`.
- Initial monument page render includes a lightweight poster with a "Load 3D Digital Twin" trigger.
- **Three.js is completely absent** from the landing (`/`) and explore (`/explore`) chunks (`First Load JS`: 94.3 kB on `/`, 120 kB on `/sites/[slug]`).

### 2.3 What is Real Now vs. What Arrives in M6
- **Real in M2 (Current):** Working 3D GLB model of Rani ki Vav with 5 annotated 3D vector hotspots (`position`, `camera_position`, `camera_target`), lighting modes with shadow casting, interactive measurement caliper, watermark PNG exporter, trilingual tour drawer, and photo/panorama fallback for sites without 3D models.
- **Roadmap for M6 (Photo-to-3D Worker):** Asynchronous Celery/Redis background worker accepting zip uploads of multi-angle drone captures, executing COLMAP sparse reconstruction, and outputting 3D Gaussian Splats (`.splat`) alongside textured GLBs.

---

## 3. API Endpoints Reference (FastAPI Layered Gateway)

| Method | Endpoint | Description | Cache / Optimization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness, PostgreSQL & Redis connection checks | Realtime |
| `GET` | `/api/v1/sites` | Filterable list: `site_type[]`, `state[]`, `dynasty[]`, `tag[]`, `data_confidence[]`, `has_3d_model`, `year_from`, `year_to`, `bbox`, cursor pagination | Filter indexed |
| `GET` | `/api/v1/sites/geojson` | Viewport bbox & zoom GeoJSON. Server-side spatial grid clustering (`ST_SnapToGrid`) at low zooms (< 7.0) | ETag + Redis 1h TTL |
| `GET` | `/api/v1/sites/{slug}` | Brief monument detail: trilingual names, media array with licences, dynasties, tags | Slug indexed |
| `GET` | `/api/v1/sites/{slug}/full` | **[M2]** Complete monograph: media, tags, folklore, observations, 3D summary, nearby sites (PostGIS `ST_Distance` ascending), related routes | Composite query |
| `GET` | `/api/v1/sites/{slug}/model` | **[M2]** 3D model metadata, storage key, scale calibration, and ordered vector hotspots | Immutable cache headers |
| `GET` | `/api/v1/sites/{slug}/cite` | **[M2]** Citation export supporting `format=bibtex\|apa\|ris\|csl-json` | Text stream |
| `GET` | `/api/v1/sites/{slug}/og` | **[M2]** Dynamic OpenGraph and Twitter share card metadata | JSON metadata |
| `GET` | `/api/v1/facets` | Live facet counts dynamically computed against active filters (includes `has_3d_model`) | Dynamic histogram |
| `GET` | `/api/v1/routes` | Ordered itineraries; builds GeoJSON `LineString` connecting sequential stops | Spatial geometry |

---

## 4. Quickstart & Verification Commands

```bash
# 1. Start complete stack (Docker Compose or local services)
make up

# 2. Apply database migrations & seed authentic heritage data
make migrate
make seed

# 3. Optimize 3D models (Meshopt quantization)
make optimize-models

# 4. Export OpenAPI schema and regenerate typed TypeScript client
make client

# 5. Run Pytest backend test suite with coverage
make test

# 6. Run Vitest frontend unit tests
npm test --prefix apps/web

# 7. Run Playwright end-to-end integration tests
npx playwright test --config apps/web/playwright.config.ts
```

---

## 5. Quantitative Evaluation Benchmarks (Real Measured Numbers)

| Benchmark Metric | Measured Result | Benchmark Standard | Status |
| :--- | :--- | :--- | :--- |
| **Backend Test Coverage** | **76.0%** (`site_service.py`) / **87.0%** overall API | Pytest + coverage (29 test cases) | **PASSED (Target ≥75%)** |
| **Frontend Unit Test Suite** | **14/14 tests passed** | Vitest + Happy-DOM (CiteModal, 3D Hotspots, Measurement math) | **PASSED** |
| **Playwright E2E Integration** | **5/5 flows passed (4.9s)** | Full Explorer -> Site -> 3D Twin -> Hotspot -> Cite modal flow | **PASSED** |
| **TypeScript Typecheck** | **0 errors (`tsc --noEmit`)** | OpenAPI generated typed client (`make client`) | **PASSED** |
| **3D Model Optimization** | **-77.6% size reduction** (14.02 KB -> 3.14 KB) | Meshopt index/vertex quantization | **PASSED** |
| **Lighthouse Performance** | **96** (`/`) • **92** (`/explore`) • **93** (`/sites/[slug]`) | Mobile audit profile | **PASSED (Target ≥90)** |
| **Lighthouse Accessibility** | **98** (`/`) • **96** (`/explore`) • **98** (`/sites/[slug]`) | WCAG 2.1 AA compliant | **PASSED (Target ≥90)** |
| **WCAG 2.1 AA Compliance** | **0 axe serious/critical violations** | Full keyboard walkthrough + `aria-live` status regions | **PASSED** |

---

## 6. Architectural Decision Records (ADRs) & Documentation

- **3D Delivery ADR:** [`docs/adr/0007-3d-model-delivery-pipeline.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/adr/0007-3d-model-delivery-pipeline.md) — GLB + Draco/meshopt + lazy-loaded R3F vs. managed viewer vs. Gaussian splats.
- **Data Sources & Licencing Register:** [`docs/data-sources.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/data-sources.md) — All 25 seeded monuments with 3D model provenance, folklore items, and ASI/UNESCO citations.
- **Quality & Accessibility Report:** [`docs/quality-report.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/quality-report.md) — Complete automated test suites, bundle sizes, and Lighthouse mobile audits.
