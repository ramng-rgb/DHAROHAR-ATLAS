# Dharohar Atlas: System Architecture Specification

## 1. Architectural Overview

Dharohar Atlas is an event-driven, micro-modular web platform engineered to transform unstructured cultural and architectural heritage archives into a structured, searchable knowledge layer.

```mermaid
graph TD
    Client[Next.js 14 App Router Frontend] -->|REST / JSON-RPC| API[FastAPI Async API Gateway]
    API -->|Session Pooling| DB[(PostgreSQL 16 + PostGIS + pgvector)]
    API -->|Async Job Dispatch| Redis[(Redis 7 Cache & Broker)]
    Redis --> Worker[Asynchronous Pipeline Workers]
    Worker -->|OCR / Translation| Adapters[ML Provider Adapters]
    Worker -->|Photogrammetry SfM| 3DProc[COLMAP / Mesh Engine]
    3DProc --> Storage[Object Storage: S3 / MinIO]
    DB --> Client
```

---

## 2. Layered Component Architecture

### 2.1 Presentation Tier (`apps/web`)
- **Next.js 14 App Router:** Server-rendered initial pages with client components for rich interactive experiences.
- **MapLibre GL JS:** Hardware-accelerated WebGL vector map rendering clustered archaeological monuments with custom canvas layers and progressive GeoJSON route line drawing.
- **Journey Mode Player (`/journeys/[slug]`):** Hardware-accelerated dynamic vector camera sweeps (`flyTo` with pitch/bearing), story card overlays, playback state machine (pause/scrub/speed), and accessible plain-text alternative.
- **Guided Demo Tour (`DemoTourOverlay`):** 9-step curated walkthrough driven by `GET /api/v1/demo/script` with element spotlighting, step progression, and keyboard focus trap.
- **React Three Fiber & Drei:** WebGL 3D rendering pipeline loading GLB photogrammetric models with directional lighting, spatial hotspot raycasting, and metric measurement calipers.
- **Interactive Bounding Box Canvas:** High-precision SVG/DOM overlay aligning machine OCR bounding boxes with archival folios.

### 2.2 Backend & Service Tier (`apps/api`)
- **Clean Layered Separation:**
  - `api/v1/`: HTTP routers handling validation, ETag headers, and status codes (zero business logic).
  - `services/`: Encapsulated domain business logic (`SiteService`, `SearchService`, `DocumentService`, `RouteService`, `DemoScriptService`).
  - `providers/`: ML and OCR adapter abstraction layer (Gemini, Tesseract, pgvector, Fake providers for CI).
  - `models/`: SQLAlchemy 2.0 ORM entities with PostGIS geography, pgvector columns, and enriched route relationships.

### 2.3 Storage & Retrieval Tier
- **PostgreSQL 16:** Single unified datastore hosting relational metadata, geospatial geography, trigram lexical indexes, and HNSW vector graphs.
- **Redis 7:** Multi-tier query caching layer (journey routes, search autocomplete, facets) with ETag / 304 Not Modified validation, and job broker for asynchronous pipelines.

---

## 3. Ingestion Sequence

```mermaid
sequenceDiagram
    participant User as Contributor / Archivist
    participant API as FastAPI Ingest Gateway
    participant Queue as Redis Job Queue
    participant Worker as Async Pipeline Worker
    participant ML as ML Provider Adapter
    participant DB as PostgreSQL (pgvector)

    User->>API: Upload Archival Folio / Photos
    API->>Queue: Enqueue Extraction Job (job_id)
    API-->>User: Return 202 Accepted (job_id)
    Queue->>Worker: Consume Ingest Task
    Worker->>ML: Extract Multilingual OCR & Bounding Boxes
    ML-->>Worker: Lines, Confidence & Language
    Worker->>ML: Translate to English & Extract Named Entities
    ML-->>Worker: Translations & NER Tags
    Worker->>DB: Persist Page, Lines, Entities & Vector Embeddings
    Worker->>DB: Mark Job Status = Completed
    User->>API: Poll / SSE Stream on /api/v1/jobs/{job_id}
    API-->>User: Progress 100% & Published Record
```
