# Multi-Tier Caching & CDN Strategy

## 1. Caching Matrix & Invalidation Protocol

Dharohar Atlas enforces a strict multi-tier caching hierarchy across Edge CDN, Redis memory cache, and browser HTTP caches.

| Resource / Layer | Cache Store | Default TTL | Cache Key Pattern | Invalidation Mechanism | Cache-Control Header |
|---|---|---|---|---|---|
| **Static Assets (JS/CSS/Fonts)** | CDN / Browser | 1 Year (Immutable) | `/_next/static/[buildId]/[hash].[ext]` | Content hash in asset filename | `public, max-age=31536000, immutable` |
| **3D GLB Monument Models** | CDN / Browser | 30 Days | `/models/[slug].glb` | Asset digest / version query param | `public, max-age=2592000, stale-while-revalidate=86400` |
| **GeoJSON Journey Routes** | Redis / Browser | 1 Hour | `route:journey:[slug]` | Cache eviction on route edit; ETag matching via `If-None-Match` (304 Not Modified) | `public, max-age=3600, stale-while-revalidate=600` |
| **Search Facets Aggregations** | Redis | 15 Minutes | `facets:[active_filters_hash]` | Evicted on document ingestion or status transition | `public, max-age=900` |
| **Hybrid Search Results** | Redis | 5 Minutes | `search:[q_hash]:[lang]:[filters]` | Evicted upon text correction (`reindex.py`) | `public, max-age=300` |
| **Monument Detail SSR** | CDN / Next.js ISR | 1 Hour | `/sites/[slug]` | On-demand revalidation via web hook | `public, s-maxage=3600, stale-while-revalidate=60` |
| **Authenticated / Private Drafts**| NONE (Client only) | 0 Seconds | N/A | **NEVER CACHED AT SHARED LAYER** | `private, no-cache, no-store, must-revalidate` |

---

## 2. Exemplar HTTP Response Headers (Measured Live)

### A. Static Asset (`/_next/static/css/...`)
```http
HTTP/1.1 200 OK
Content-Type: text/css; charset=utf-8
Cache-Control: public, max-age=31536000, immutable
ETag: "1a8f-2837bc"
```

### B. Public Page (`GET /sites/rani-ki-vav`)
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: s-maxage=3600, stale-while-revalidate
X-Matched-Path: /sites/[slug]
```

### C. Public API Response (`GET /api/v1/routes/gujarat-stepwell-trail/journey`)
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600, stale-while-revalidate=600
ETag: "w/e94d82f7a01"
X-Request-ID: 8a93e3d4-28b9-4f76-9d5a-fc81b1c73a0e
X-Content-Type-Options: nosniff
```

### D. Authenticated / Private API Response (`GET /api/v1/documents/{draft_id}`)
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
X-Request-ID: b48f2190-6712-4211-89d1-c1e089201a4e
X-Content-Type-Options: nosniff
```

---

## 3. Cache Invalidation & Draft Isolation Rules

1. **Anti-Pollution Guarantee:** A document with `status = "draft"` or `is_published = False` is filtered out before cache key generation. Public search queries and public archive hubs never read from or write draft metadata into shared Redis keys.
2. **Atomic Write Invalidation:** When an editor submits a transcription correction via `PATCH /api/v1/lines/{id}`, the service invalidates all cached search queries for that document's site ID and flushes `facets:*`.
