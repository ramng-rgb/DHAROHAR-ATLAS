# ADR 0006: Server-Side Spatial Grid Clustering & Viewport GeoJSON vs. Vector Tiles

- **Status:** Accepted (Implemented in M1)
- **Deciders:** Principal Engineering & Architecture Team
- **Date:** 2026-10-31

---

## Context & Problem Statement

Dharohar Atlas requires a high-performance geospatial exploration interface capable of:
1. Rendering interactive historical monuments spanning ancient India (3000 BCE to 1900 CE).
2. Supporting dynamic, compound filtering in real time across monument types, administrative states, dynasties, academic confidence tiers, and chronological year spans.
3. Synchronizing live dynamic facet counts (`/api/v1/facets`) with map viewport markers and timeline histograms without UI lag or stale state.
4. Architecturally scaling from the initial curated seed dataset of 25–40 monuments up to 100,000+ archaeological sites across the subcontinent.

The architectural decision is choosing between **Viewport-based GeoJSON with Server-Side Clustering** versus **Pre-rendered Vector Tiles (MVT / Mapbox Vector Tiles via pg_tileserv / Martin)**.

---

## Decision Drivers

- **Dynamic Compound Filtering:** Filtering by variable year intervals (-3000 to 1900), multiple multi-select enums, and live text queries must immediately reflect on marker clustering without waiting for tile regenerations.
- **Dynamic Facet Counts Synchronization:** The frontend requires precise facet counts for the current filter criteria across the active bounding box.
- **Client Footprint & Protocol Simplicity:** Zero external tile servers or paid third-party proprietary services required for local development, automated CI evaluation, and offline air-gapped deployments.
- **Latency & Cacheability:** Bounding-box and zoom queries must be cacheable via Redis and support HTTP conditional requests (`ETag` and `If-None-Match`).

---

## Considered Options

1. **Option A: Static/Dynamic Vector Tiles (PostGIS `ST_AsMVT` via pg_tileserv / Martin)**
2. **Option B: Viewport GeoJSON with Server-Side Spatial Grid Clustering (`ST_SnapToGrid` / PostGIS geography) and Async Redis Caching (Selected)**
3. **Option C: Client-Side Supercluster with Full Dataset Download**

---

## Decision & Implementation Details

We chose **Option B: Viewport GeoJSON with Server-Side Spatial Grid Clustering**.

### Architecture:
1. **Low Zoom Levels (< 7.0):**
   - The API uses PostGIS spatial grid aggregation:
     ```sql
     ST_SnapToGrid(location::geometry, :grid_size)
     ```
   - Features sharing a grid cell are collapsed into a cluster feature carrying `cluster: true`, `point_count: N`, and representative centroid coordinates (`ST_Centroid(ST_Collect(location::geometry))`).
   - Cluster payloads remain lightweight (< 15 KB), eliminating over-the-wire serialization bottlenecks and DOM marker saturation.

2. **High Zoom Levels (≥ 7.0):**
   - The API executes spatial index lookups using PostGIS GiST index on `location geography(Point, 4326)`:
     ```sql
     ST_Intersects(location, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography)
     ```
   - Returns individual monument features with full metadata (`slug`, `name`, `name_hi`, `name_gu`, `site_type`, `period_start_year`, `era_label`, `data_confidence`).

3. **Multi-Tier Caching:**
   - **Async Redis Cache:** Normalised query fingerprints (`geojson:bbox:...:z:...:filters:...`) are cached in Redis with a 1-hour TTL.
   - **HTTP ETag & Cache-Control:** API emits SHA-256 ETags and `Cache-Control: public, max-age=300`. Responses return `304 Not Modified` on client revalidation.

---

## Planned Upgrade Path (Scale Horizon > 500,000 geometries)

When the archive scales beyond 500,000 spatial records:
1. **PostGIS `ST_AsMVT` Integration:** Add endpoint `GET /api/v1/tiles/{z}/{x}/{y}.pbf` utilizing PostGIS native binary MVT generation.
2. **Hybrid Protocol:** Maintain the current GeoJSON endpoint for filtered interactive search and live facets, while MapLibre GL renders background base density layers via binary MVT vector tiles.
3. **Materialized Spatial MVT Caching:** Cache base historical eras as pre-computed MVT tile layers in Cloudflare / Fastly CDN edge caches.
