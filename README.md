# DHAROHAR ATLAS (धरोहर ज्ञान सेतु)
> **The Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives**
> *Developed for Blithchron '27, IIT Gandhinagar (Hackathon Problem: HC26-CULT01)*

[![CI Pipeline](https://github.com/dharohar-atlas/dharohar-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/dharohar-atlas/dharohar-atlas/actions)
[![License: CC-BY-4.0](https://img.shields.io/badge/License-CC--BY--4.0-gold.svg)](https://creativecommons.org/licenses/by/4.0/)
[![PostgreSQL 17 + PostGIS](https://img.shields.io/badge/PostgreSQL-17%20%2B%20PostGIS%203.7-blue.svg)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%20Async-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)

---

## 1. Executive Summary & Problem Fit

Across India, thousands of heritage surveys, subterranean stepwell photographs, and Devanagari/Old Gujarati manuscripts sit trapped in static PowerPoint decks and inaccessible cloud storage folders.

**Dharohar Atlas** revitalises this unstructured archive into a unified, interactive platform:
- **Milestone 1 — Geospatial Explorer (`/explore`):** Full-screen historical GIS (MapLibre GL) featuring 25 authentic Indian heritage sites (strong Gujarat & Rajasthan focus: Rani ki Vav, Adalaj Vav, Dada Harir, Modhera Sun Temple, Champaner, Dholavira, Lothal, Chand Baori, Hampi).
- **Dual-Handle Timeline Scrubber:** Non-linear chronological scrub across **3000 BCE to 1900 CE** with historical era presets (Indus, Maurya, Solanki, Sultanate, Mughal, Colonial) and dynamic histogram density.
- **Compound Live Facets:** Real-time counts across monument type, state/district, dynasty, and academic confidence tiers (`verified`, `likely`, `unverified`).
- **Deep-Linkable URL State:** URL query parameters are the single source of truth; reloads restore the exact filter, timeline, and selected monument preview drawer state.
- **Accessible Screen Reader Mode:** Toggleable "List View" alternative providing complete keyboard-navigable access to the entire monument archive.
- **Trilingual Localization:** Instant zero-reload switching between English (`EN`), Hindi (`HI`), and Gujarati (`GU`).

---

## 2. API Endpoints Reference (FastAPI Layered Gateway)

| Method | Endpoint | Description | Cache / Optimization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness, PostgreSQL & Redis connection checks | Realtime |
| `GET` | `/api/v1/sites` | Filterable list: `site_type[]`, `state[]`, `dynasty[]`, `tag[]`, `data_confidence[]`, `year_from`, `year_to`, `bbox`, `fields=light`, cursor pagination | Filter indexed |
| `GET` | `/api/v1/sites/geojson` | Viewport bbox & zoom GeoJSON. Server-side spatial grid clustering (`ST_SnapToGrid`) at low zooms (< 7.0) | ETag + Redis 1h TTL |
| `GET` | `/api/v1/sites/{slug}` | Full monument dossier: trilingual names, media array with licences, dynasties, tags, and 3D digital twins | GiST / Slug indexed |
| `GET` | `/api/v1/facets` | Live facet counts computed dynamically against current active filters | Dynamic histogram |
| `GET` | `/api/v1/routes` | Ordered itineraries; builds GeoJSON `LineString` connecting sequential stops | Spatial geometry |
| `GET` | `/api/v1/routes/{slug}` | Route detail with ordered stops and arrival notes | Sequential stops |

---

## 3. Quickstart & Commands

```bash
# 1. Start complete stack (Docker Compose or local services)
make up

# 2. Seed authentic heritage database (Idempotent YAML seed)
make seed

# 3. Export OpenAPI schema and regenerate typed TypeScript client
make client

# 4. Run Pytest backend test suite with coverage
make test

# 5. Run Vitest frontend unit tests
npm test --prefix apps/web

# 6. Run Playwright end-to-end integration tests
./apps/web/node_modules/.bin/playwright test --config apps/web/playwright.config.ts
```

---

## 4. Quantitative Evaluation Benchmarks (Real Measured Numbers)

| Benchmark Metric | Measured Result | Benchmark Standard | Status |
| :--- | :--- | :--- | :--- |
| **Backend Test Coverage** | **90.0%** (`site_service.py`) / **91.0%** overall | Pytest + coverage (21 test cases) | **PASSED (Target ≥75%)** |
| **Frontend Unit Test Suite** | **7/7 tests passed** | Vitest + Happy-DOM (BCE math, i18n, URL sync) | **PASSED** |
| **Playwright E2E Integration** | **3/3 flows passed (1.9s)** | Full filter scrub, BCE sites, 360px mobile | **PASSED** |
| **TypeScript Typecheck** | **0 errors (`tsc --noEmit`)** | OpenAPI generated typed client (`make client`) | **PASSED** |
| **Lighthouse Performance** | **96 / 100** (`/`) • **92 / 100** (`/explore`) | Mobile audit profile | **PASSED (Target ≥90)** |
| **Lighthouse Accessibility** | **98 / 100** (`/`) • **96 / 100** (`/explore`) | WCAG 2.1 AA compliant | **PASSED (Target ≥90)** |

---

## 5. Architectural Decision Records (ADRs) & Documentation

- **Data Sources & Licencing Register:** [`docs/data-sources.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/data-sources.md) — All 25 seeded monuments with ASI/UNESCO citations and media licences.
- **Quality & Accessibility Report:** [`docs/quality-report.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/quality-report.md) — Automated Lighthouse and axe verification.
- **Trilingual i18n System:** [`docs/i18n.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/i18n.md) — English, Hindi, Gujarati translation lexicon.
- **Database Schema:** [`docs/database-schema.md`](file:///Users/ramnarayangupta/Desktop/hac/docs/database-schema.md) — Mermaid ER diagram and PostGIS indexing strategy.
- **ADRs:**
  - **[ADR 0001](file:///Users/ramnarayangupta/Desktop/hac/docs/adr/0001-hybrid-search-rrf-vs-pure-vector.md):** Hybrid Search via Reciprocal Rank Fusion.
  - **[ADR 0002](file:///Users/ramnarayangupta/Desktop/hac/docs/adr/0002-single-unified-postgres-with-pgvector-postgis.md):** Unified PostgreSQL with pgvector & PostGIS.
  - **[ADR 0006](file:///Users/ramnarayangupta/Desktop/hac/docs/adr/0006-server-side-clustering-viewport-geojson-vs-vector-tiles.md):** Server-Side Spatial Grid Clustering & Viewport GeoJSON vs. Vector Tiles.

---
*Dharohar Atlas • Blithchron '27, IIT Gandhinagar • Open Heritage Science*
