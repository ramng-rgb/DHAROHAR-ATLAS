# Dharohar Atlas — Retroactive System Design Specification

## 1. Executive Summary & Purpose
Dharohar Atlas is an open-access, AI-augmented digital heritage preservation and exploration platform for Indian archaeological monuments, historic stepwells, temple complexes, and epigraphic manuscripts. The system synthesizes spatial GIS data, photogrammetric 3D digital twins, multilingual archival OCR, and hybrid semantic retrieval into an integrated platform for researchers, students, and the public.

---

## 2. User Personas & Role-Based Permissions

The platform uses a role-based access control (RBAC) model combined with **ownership-scoped resource isolation**:

| Role | Target Persona | Capabilities & Permissions | Ownership Boundaries |
| :--- | :--- | :--- | :--- |
| **`viewer`** | General Public, Tourist, Student | Read-only access to published heritage sites, 3D digital twins, public documents, hybrid search, Ask-the-Archive Q&A, and curated journeys. | Cannot create or mutate any records. |
| **`contributor`** | Field Researcher, Epigraphy Student | Can upload manuscript folios, trigger OCR ingestion pipelines, and propose line-level corrections. | **Strict Ownership Scoping:** Can only read/edit/delete their own unpublished uploads, jobs, and correction drafts. Attempting to access another user's draft returns `404 Not Found`. |
| **`curator`** | Institutional Archivist (e.g. ASI, State Archives) | Can review, approve, or reject proposed transcript corrections; edit site monographs, upload 3D assets, curate journey routes, and publish documents. | Global operational scope across all documents, sites, and journeys. |
| **`admin`** | Platform Administrator / Lead Engineer | All curator permissions plus user account management, quota and rate limit overrides, system reindexing, and internal telemetry access. | Full global access. |

---

## 3. Tenancy & Ownership Model
- **Single-Tenant Open Archive:** Unlike multi-tenant B2B SaaS platforms where data is partitioned by `organization_id`, Dharohar Atlas is an open-access public cultural repository.
- **Ownership Scoping in Place of Org Scoping:** Any entity in a draft or pending state (such as an unverified document upload or an unreviewed line edit) is strictly partitioned by `owner_id`. A contributor cannot enumerate or manipulate drafts submitted by other contributors. Once a curator publishes an entity, it transitions to the public read model with an immutable audit history.

---

## 4. The 5 Core System Flows

### Flow 1: Geospatial Exploration (M1)
- **Objective:** Enable smooth interactive exploration of hundreds of heritage sites across the Indian subcontinent.
- **Architecture:** Client sends viewport bounding box coordinates (`min_lng, min_lat, max_lng, max_lat`), zoom level, and optional historical era/typology filters to `GET /api/v1/sites/geojson`.
- **Database:** PostGIS `ST_MakeEnvelope` spatial index query executes in `< 30ms`. When zoom `< 8`, the backend groups nearby coordinates using server-side grid clustering to prevent client-side DOM overhead.
- **Caching:** Cache-Control headers enable edge and browser caching with dynamic `ETag` generation.

### Flow 2: Site Detail & 3D Digital Twin Viewer (M2)
- **Objective:** Provide immersive architectural monographs with interactive 3D photogrammetric inspection.
- **Architecture:** `GET /api/v1/sites/{slug}` delivers site metadata, architectural style, historical timeline, folklore narratives, and asset URLs.
- **3D Pipeline:** The browser streams optimized GLB models into a React Three Fiber / Drei canvas. Interactive hotspots reveal architectural details with calipers for real-world metric measurements. Citations can be exported in APA, Chicago, or BibTeX formats.

### Flow 3: Archival Ingestion & Human-in-the-Loop OCR (M3)
- **Objective:** Digitize ancient inscriptions and manuscripts in Devanagari, Sanskrit, and Gujarati with verifiable precision.
- **Architecture:**
  1. Contributor uploads high-resolution page scan (`POST /api/v1/documents`). File is validated for magic bytes, size limits (< 20MB), and format (PNG, JPEG, PDF, TIFF).
  2. API enqueues an asynchronous ingestion task in Redis and returns `202 Accepted` with a `job_id`.
  3. Worker extracts text lines with bounding boxes, character-level confidence scores, and script detection via Google Gemini Vision or local PyTesseract fallback.
  4. Worker generates initial English translations and named entity tags (people, dynasties, architectural elements).
  5. A 3-pane interactive viewer presents the folio image, transcription, and translation in synchronization. Lines below 75% confidence are flagged for human review.
  6. Contributors propose corrections with optimistic UI updates and server rollback upon failure.

### Flow 4: Hybrid Search & Grounded Retrieval (M4)
- **Objective:** Deliver sub-100ms discovery across heritage sites and manuscript folios with hallucination-resistant Q&A.
- **Architecture:**
  - **Lexical Search:** PostgreSQL `pg_trgm` and `unaccent` indexes perform fuzzy matching across Indic and romanized terminology.
  - **Semantic Search:** Text chunks are embedded into 768-dimensional vectors via `text-embedding-004` (or offline heuristic embeddings) and indexed using `pgvector` HNSW index.
  - **Reciprocal Rank Fusion (RRF):** Queries run concurrently across lexical and vector indexes; results are merged via RRF formula:
    $$RRF(d) = \sum_{m \in \{lexical, vector\}} \frac{1}{60 + \text{rank}_m(d)}$$
  - **Ask-the-Archive Q&A:** Grounded RAG synthesizes responses strictly from retrieved passage context. Responses stream via Server-Sent Events (SSE) and cite source folios with direct links. Queries outside archival scope trigger safe refusal.

### Flow 5: Curated Journeys & Walkthroughs (M5)
- **Objective:** Guide users through thematic heritage trails (e.g. "Solanki Stepwells of Gujarat") with interactive storytelling.
- **Architecture:** Waypoint sequence defines route coordinates, historical commentary, and associated 3D models. MapLibre GL smoothly interpolates camera pitch, bearing, and zoom between waypoints while rendering progressive GeoJSON route traces. An accessible plain-text alternative ensures full screen-reader compliance.

---

## 5. Functional Requirements
1. **FR-1 (Geospatial):** Filter sites by typology (stepwell, temple, fort, cave), historical era (BCE to 19th century), and current geographic viewport.
2. **FR-2 (3D Visualization):** Render photogrammetric models with 60 FPS performance, orbit controls, hotspot inspection, and metric calipers.
3. **FR-3 (Ingestion):** Accept multi-page manuscripts, process asynchronous OCR, preserve bounding-box coordinate geometry, and support line-level editing.
4. **FR-4 (Search & Grounding):** Sub-150ms hybrid retrieval across multilingual transliterated text with verifiable citation links.
5. **FR-5 (Resilience):** Continuous platform operation with zero runtime crashes even when third-party cloud APIs are unreachable.

---

## 6. Non-Functional Requirements
1. **NFR-1 (Performance):** Geospatial GeoJSON viewport queries p95 < 50ms; hybrid search p95 < 120ms; streaming Ask TTFT p95 < 200ms.
2. **NFR-2 (Security):** Strict boundary schema validation rejecting unknown fields; zero hardcoded secrets; private raw upload storage; no unescaped user or OCR text.
3. **NFR-3 (Availability & Scalability):** Stateless application tier horizontally scalable across container replicas; Redis-backed distributed rate limiting and caching.
4. **NFR-4 (Accessibility):** WCAG 2.1 Level AA compliance, automated axe-core validation, keyboard-only navigable workflows.

---

## 7. Out-of-Scope Boundaries (Explicit)
1. **Commercial Billing & Subscription Plans:** The platform is an open-access public resource; no Stripe/Razorpay integrations, plan tiers, or paywalls will be built.
2. **Multi-Tenant Corporate Organizations:** No company workspaces or inter-tenant billing isolation. Replaced by granular user ownership scoping.
3. **Real-Time Collaborative Editing:** Line-level epigraphic corrections follow asynchronous submission, version history, and curator moderation rather than Operational Transformation (OT) or CRDTs.
4. **Custom 3D Reconstruction Pipeline in Cloud:** Photogrammetry model generation is performed offline via COLMAP / Gaussian Splatting workflows; the platform acts as an optimized delivery and interaction engine for processed GLB assets.

---

## 8. Open Questions & Roadmap Considerations
1. **Offline PWA Support:** Should offline cached tile packages be supported for field researchers in remote archaeological zones with zero connectivity? *(Designated for v2.0 roadmap).*
2. **Decentralized Verification:** Should archival transcript approval stamps be cryptographically anchored to a public ledger for immutable provenance? *(Designated for v2.0 roadmap).*
