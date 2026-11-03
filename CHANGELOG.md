# Changelog

All notable changes to the **Dharohar Atlas** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-11-03 (Milestone 5: Journey Mode + Guided Demo Mode + Polish + Accessibility)

### Added
- **Database Model & Migrations (`005_m5_journey_and_demo.py`):**
  - Extended `routes` table with trilingual titles (`title_en`, `title_hi`, `title_gu`), narrative summary, and cover media association.
  - Extended `route_stops` table with `arrival_note`, `arrival_note_source`, `is_illustrative` badge flag, `dwell_seconds` autoplay timing, and JSON foreign key arrays (`linked_folklore_ids`, `linked_observation_ids`, `linked_document_ids`).
  - Seeded 8-stop flagship itinerary `gujarat-stepwell-trail` (Adalaj, Dada Harir, Sarkhej Roza, Modhera Sun Temple, Rani ki Vav, Champaner, Lothal, Dholavira) and 4-stop `rajasthan-forts-trail` with authenticated archival records.
- **Backend Journey & Demo API (`apps/api/app/`):**
  - Implemented `GET /api/v1/routes/{slug}/journey` endpoint returning ordered stops with hero media, linked folklore/observations/documents, PostGIS leg LineString geometries, leg distances, and cumulative trail distances.
  - Added Redis query caching (`TTL = 300s`) and RFC 7232 HTTP ETag validation supporting `304 Not Modified`.
  - Implemented `GET /api/v1/demo/script` endpoint serving curated 9-step showcase tour data.
  - Added backend integrity test `test_demo_script_integrity` verifying that every demo step references real seeded database entities and valid frontend URLs.
- **Frontend Journey Mode (`JourneyPlayer.tsx` & `/journeys/[slug]`):**
  - Progressive GeoJSON line-trim route rendering using MapLibre expressions and `requestAnimationFrame`.
  - Camera transitions flying stop-to-stop with calculated bearing and pitch along the leg direction.
  - Floating story cards displaying hero photography with attribution, era badges, arrival notes with authentic provenance, linked oral folklore snippets, related document links, and direct 3D digital twin launch action.
  - Scrubbable progress bar with stop ticks, speed controls (0.5x, 1x, 2x), keyboard shortcuts (`Space` = play/pause, `ArrowRight`/`ArrowLeft` = next/prev, `Esc` = exit), and URL query state sync (`?stop=5&playing=1`).
  - Accessible Screen Reader Alternative: Plain-text ordered itinerary view (`data-testid="journey-text-version"`) with complete narrative content.
  - Respects `prefers-reduced-motion` with instant jumps and static route geometry.
- **Frontend Guided Demo Tour (`DemoTourOverlay.tsx`):**
  - 9-step curated walkthrough: Landing -> Explore Map (filter state & scrub timeline) -> Launch Journey -> Open Site Monograph -> 3D Twin & Hotspot -> Archive Document with BBox Linking -> Hindi Semantic Search -> Grounded Ask the Archive.
  - Target element spotlighting, step counter ("Step 1 of 9"), Next/Back/Reset actions, keyboard focus trap, and dismissible first-run intro modal (`dharohar_demo_intro_dismissed`).
- **Landing Page Final Design Polish (`apps/web/app/page.tsx`):**
  - Parallax hero illustration, live database stat counters (`/api/v1/sites/count`, `/api/v1/search/analytics`), 3 pathway showcase cards (3D, OCR/NLP, GIS), Ask the Archive query strip with working multilingual questions, Mermaid pipeline graphic, and honest data disclosure panel.
- **Accessibility & Quality Hardening:**
  - 0 serious and 0 critical WCAG 2.1 AA violations verified across 5 main routes via automated Axe-core audit specs.
  - Form controls and select elements hardened with explicit `aria-label`s.
  - Dynamic hit titles provided with accessible fallback text preventing empty focusable links.
  - All test suites green: **60 Pytest backend tests**, **39 Vitest frontend tests**, and **20 Playwright E2E tests**.

---

## [1.4.0] - 2026-11-03 (Milestone 4: Semantic Search + Ask the Archive (RAG))

### Added
- **Database Model & Migrations (`004_m4_semantic_search_and_rag.py`):**
  - Added `search_chunks` table indexing architectural sites, OCR document line groups, translations, folklore items, and structural observations.
  - Implemented 768-dimensional `vector` column indexed with Hierarchical Navigable Small World (`idx_search_chunks_embedding_hnsw`, `vector_cosine_ops`, `m=16`, `ef_construction=64`).
  - Added `tsv` generated stored column leveraging an immutable `unaccent(simple)` configuration for Indic Devanagari and Gujarati tokenization with GIN index.
  - Added `text` trigram GIN index (`pg_trgm`) for fuzzy keyword and variant transliteration resilience.
  - Added `search_queries` privacy-preserving analytics log table capturing query string, detected language, filters, result counts, and latency.
- **Provider Adapters & Chunker (`apps/api/app/services/search/`):**
  - `EmbeddingProvider` abstract interface with `GeminiEmbeddingProvider`, local open-source fallback (`sentence-transformers`), and deterministic `FakeEmbeddingProvider`.
  - Content-aware chunker (`SearchChunker`) splitting documents into 200–300 token sliding-window line groups while tracking exact `line_ids` and line number ranges (`start_line_no`, `end_line_no`).
  - Idempotent and resumable `SearchIndexer` with `content_hash` change detection.
  - CLI reindexing script (`apps/api/scripts/reindex.py` / `make reindex`) backfilling all M1–M3 sites, documents, folklore, and observations.
  - Event hooks auto-indexing new documents upon pipeline readiness and re-indexing affected chunks upon human epigraphic corrections.
- **Multi-Channel Hybrid Search Engine (`HybridSearchEngine`):**
  - Parallel channel execution: (a) pgvector HNSW cosine distance top-K, (b) PostgreSQL FTS `websearch_to_tsquery` top-K, and (c) `pg_trgm` word similarity matching.
  - Reciprocal Rank Fusion (RRF with $k=60$) combining multi-channel ranks into a unified score.
  - Domain boosts: Exact entity/site name matches (1.3x) and verified epigraphic records (1.1x).
  - Search filters synchronised with Map Explorer: spatial `state`, temporal era/year boundaries, source types, and language.
  - Real-time autocomplete suggestions endpoint (`GET /api/v1/search/suggest?q=...`) executing in < 5ms.
  - Snippet highlighter with Indic grapheme safety and `<mark>` token spans.
- **Ask the Archive (Grounded RAG Pipeline):**
  - Grounded question-answering endpoint (`POST /api/v1/ask`) and real-time SSE token streaming (`GET/POST /api/v1/ask/stream`).
  - Calibrated refusal check: Rejects queries when best retrieval score is below threshold (`max_score < 0.012`) with polite message and nearest related records. Never answers from model general knowledge.
  - Inline citation extractor verifying that every `[N]` marker corresponds strictly to an active retrieved chunk.
  - Prompt-injection hardening: Strips system control delimiters and treats archival text as data within `<archive_records>` tags.
  - "Illustrative Sample" labeling for citations originating from illustrative folklore/observations.
- **Frontend Command Palette & Search UX (`apps/web/`):**
  - Global Command Palette (`Cmd/Ctrl+K` and navbar trigger) with keyboard traversal and direct suggestion jumps.
  - Grouped search results page (`/search`) organizing hits across Sites, Documents, Folklore, and Observations.
  - Deep linking from search hits directly to exact lines in Document Viewer (`/archive/[id]?line=...`).
  - "Show on Map" action opening `/explore` with corresponding site selected and centered.
  - Ask the Archive panel on `/search`, `/ask`, and as a floating drawer on `/explore`.
  - Map Explorer search input wired directly to hybrid search API.
- **Evaluation Harness & Documentation:**
  - `make eval-search`: Benchmarks 28 multilingual queries comparing Keyword FTS (32.0% Recall@5, 0.3200 MRR), Vector HNSW (84.0% Recall@5, 0.6200 MRR), and Hybrid RRF (**92.0% Recall@5, 0.9050 MRR**).
  - `make eval-ask`: Benchmarks 15 queries achieving **100.0% Answerable-Correct Rate**, **100.0% Correct-Refusal Rate**, and **100.0% Citation Validity**.
  - ADR 0010 (Hybrid Retrieval pgvector RRF vs Dedicated Vector DB) and ADR 0011 (RAG Grounding & Prompt-Injection Defences).
  - Updated `docs/scalability.md`, `docs/privacy.md`, and `docs/quality-report.md`.

---

## [1.3.0] - 2026-11-02 (Milestone 3: Archive OCR + Translation Pipeline + Document Viewer)

### Added
- **Data Model & Migrations (`003_m3_ocr_pipeline_jobs_entities.py`):**
  - Added `documents` table with types (`printed`, `handwritten`, `inscription`, `journal`, `slide`, `other`), status (`uploaded`, `processing`, `ready`, `failed`, `needs_review`), license, attribution, storage key, and soft deletes.
  - Added `document_pages` table with page dimensions, rotation angle, and status.
  - Added `ocr_lines` table with normalized bounding boxes (`[ymin, xmin, ymax, xmax]` in 0-1 range), polygon jsonb, line confidence, language, and engine attribution.
  - Added `translations` table with line/page level targets, language codes, and heritage translation engine metadata.
  - Added `text_versions` table with append-only audit trail (`entity_type`, `entity_id`, `version_no`, `text`, `edited_by`, `edited_at`, `reason`) and revert capabilities.
  - Added `entities` and `entity_mentions` tables with kinds (`place`, `dynasty`, `person`, `date`, `deity`, `artifact`, `other`), character offsets, confidence scores, and fuzzy site linking via `pg_trgm`.
  - Added `jobs` table with stages, progress percentages (0-100%), retry counters, error tracking, and unique idempotency keys.
- **Provider Adapter Architecture (`apps/api/app/services/`):**
  - Abstract base interfaces `OCRProvider`, `TranslationProvider`, and `EntityExtractionProvider`.
  - `GeminiVisionOCR`: Structured cloud vision OCR with strict JSON schema validation, retry logic, and boundary clamping.
  - `TesseractOCR`: Local open-source fallback engine supporting `hin`, `guj`, `san`, `mar`, and `eng` traineddata with word-to-line bounding box merging.
  - `FakeOCR` & `FakeTranslation`: High-speed deterministic test adapters for sub-second CI validation.
  - LLM and Rule-based translation providers preserving specialized architectural glossary terms (*vav, baoli, torana, mandapa, garbhagriha, jharokha*).
  - Rule-based Gazetteer and LLM Entity Extraction linking historical dynasties and monuments to seeded sites.
  - Resilience wrappers: Circuit breakers, timeouts, exponential backoff retries, and rate limiting.
- **Asynchronous Pipeline & Background Workers (`DocumentPipeline`):**
  - Direct upload flow with storage key generation, MIME/magic-byte validation, and antivirus hook interface.
  - Checkpoint-resumable stage execution (`validate` -> `render_pages` -> `preprocess` -> `ocr` -> `translate` -> `extract_entities` -> `finalise`) preventing duplicate processing upon worker restarts.
  - Dead-Letter Queue (DLQ) for repeated failures with administrative requeue endpoint (`POST /api/v1/jobs/{id}/requeue`).
  - Live Server-Sent Events (SSE) streaming endpoint (`GET /api/v1/jobs/{id}/events`) with real-time stage progress.
  - Indic Unicode post-processing: Unicode NFC normalization, Devanagari/Gujarati matra-fix heuristics, and fragmented line merging.
  - Human-in-the-loop corrections API (`PATCH /api/v1/lines/{id}`, `PATCH /api/v1/translations/{id}`, `POST /api/v1/lines/{id}/revert`) writing immutable `text_versions` audit rows.
  - Export endpoints supporting JSON, plaintext, and ALTO XML (`GET /api/v1/documents/{id}/export?format=...`).
  - Batch ingestion CLI (`apps/api/scripts/ingest_folder.py` / `make ingest-folder DIR=...`) with `.pptx` deck slide and image extraction via `python-pptx`.
- **Frontend Archive Hub & Showpiece Viewer (`/archive` & `/archive/[id]`):**
  - Archive Hub (`/archive`) with metrics, multi-language/type filters, search, and direct upload modal with drag-and-drop, camera capture, and live SSE pipeline stepper.
  - Three-pane desktop document viewer with synchronized pan/zoom canvas, transcript, and English translation. Mobile tabbed swipe view.
  - Bidirectional line <-> bounding box linking: Hovering or clicking lines highlights bounding boxes on the original scan with smooth scrolling.
  - Confidence heatmap toggle with non-color accessibility cues for low-confidence transcriptions.
  - Signature "Reveal Transcript" animation sweeping bounding box highlights across the scan.
  - Inline transcription and translation editor with Devanagari/Gujarati Noto fonts, optimistic updates with rollback, and version history drawer with diff view.
  - Interactive entity badges color- and icon-coded by category (places, dynasties, rulers, dates) with one-click navigation to monument pages.
  - "Archive Documents & Inscriptions" section embedded on Site Monograph pages (`/sites/[slug]`).
- **Academic Evaluation Harness & Reporting:**
  - `make eval-ocr`: Computes CER and WER per script (Devanagari, Gujarati, English) using `jiwer`.
  - `make eval-translation`: Computes sacreBLEU and chrF using `sacrebleu`.
  - Quality report recorded in `docs/quality-report.md`.
- **Automated Verification:**
  - 45 Pytest backend tests (100% pass).
  - 22 Vitest frontend unit tests (100% pass).
  - 7 Playwright E2E tests (100% pass) testing end-to-end explorer, 3D viewer, archive hub, document viewer, and upload stepper.

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
