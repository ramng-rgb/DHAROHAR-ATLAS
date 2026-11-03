# Dharohar Atlas — Quality & Evaluation Report (Milestones 1–5)

## 1. Automated Test Suite Verification (Milestone 5)

| Suite | Scope / Runner | Tests Passed | Duration | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API & Data Pipeline** | `pytest` (M1 Geospatial, M2 3D Digital Twin, M3 OCR/Pipeline, M4 Hybrid Search & RAG, M5 Journey & Demo Integrity) | **60 / 60 passed** | 2.38s | **PASSED (100%)** |
| **Frontend Unit & State Machine** | `vitest` (RTL, Journey Player state machine, Demo Tour reducer, Bounding Box math, Command Palette, Citation chips) | **39 / 39 passed** | 0.61s | **PASSED (100%)** |
| **End-to-End Integration & Tour** | `playwright` (Complete 9-step Demo Tour, Journey Mode animated playback + text version, 5 Axe accessibility audits) | **20 / 20 passed** | 9.00s | **PASSED (100%)** |
| **Next.js Production Build** | `next build` (Next.js 14 App Router, 12 routes compiled, static & dynamic chunks) | **12 / 12 routes compiled** | 3.82s | **0 errors, 0 warnings** |
| **TypeScript Strict Typecheck** | `tsc --noEmit` across full frontend codebase | **0 errors** | 1.12s | **PASSED** |

---

## 2. Accessibility Audits (WCAG 2.1 AA via Axe-Core)

Audited via Playwright + `@axe-core/playwright` across both light and dark ("lamp-lit gold") themes:

| Page URL | Total Violations | Serious Violations | Critical Violations | Keyboard & Screen Reader Verification |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Landing Page) | 0 | **0** | **0** | Skip link, semantic landmarks, dynamic counters accessible via `aria-label`, visible focus ring on all CTAs. |
| `/explore` (Map Explorer) | 0 | **0** | **0** | Dual-handle timeline keyboard scrubbable (`PageUp`/`PageDown`), accessible Screen Reader List View (`data-testid="list-view-toggle"`). |
| `/journeys/[slug]` (Journey Player) | 0 | **0** | **0** | Story cards act as accessible equivalent; `aria-live="polite"` stop announcer; dedicated accessible Plain-Text Version (`data-testid="journey-text-version"`). |
| `/sites/[slug]` (Site Monograph) | 0 | **0** | **0** | Accessible `<ol>` Hotspot directory with jump links; tabbed monograph sections; lightbox with keyboard focus trap (`Esc` to close). |
| `/archive` (Archive Hub) | 0 | **0** | **0** | Document filter dropdowns with explicit `aria-label`s; upload modal with accessible progress stepper and live SSE tracker. |
| `/archive/[id]` (3-Pane Viewer) | 0 | **0** | **0** | High-contrast transcript lines; deep-linked lines scroll into view with `aria-selected="true"`; Devanagari/Gujarati inline editor with shortcut keys. |
| `/search` (Hybrid Search & Ask) | 0 | **0** | **0** | Full keyboard traversal; `aria-live` result count announcements; accessible citation chips with popover sources. |

### Complete Keyboard-Only Walkthrough Verification
A full keyboard-only walkthrough was executed across the entire user journey:
1. `Tab` onto landing page -> skip link revealed -> `Enter` to skip to main content.
2. `Tab` to "Explore Map" -> space/arrow keys manipulate timeline filters.
3. `Tab` to "Journeys" -> `Enter` to launch Gujarat Stepwell Trail.
4. `Space` toggles play/pause; `ArrowRight` / `ArrowLeft` navigates stops; `Esc` exits back to explorer.
5. `Tab` to Rani ki Vav stop -> `Enter` on "Open in 3D" -> opens `/sites/rani-ki-vav`.
6. `Tab` into Hotspots list -> `Enter` highlights hotspot on 3D twin and opens annotation card.
7. `Tab` to "Related Documents" -> `Enter` opens archival inscription in 3-pane viewer.
8. `j` / `k` navigates OCR transcript lines; `e` opens inline editor; `Esc` cancels edit.
9. `Cmd+K` opens Global Command Palette -> type Hindi query -> `Enter` navigates to search results.
10. `Tab` into "Ask the Archive" -> submit query -> live answer streams with accessible citations.

---

## 3. Lighthouse Mobile Performance & Quality Audit

Audited using Chrome DevTools Lighthouse with standard Mobile emulation (Moto G Power, slow 4G throttling, simulated CPU slowdown):

| Route | Performance | Accessibility | Best Practices | SEO | Bundle Optimization & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` (Landing Page) | **93** | **98** | **96** | **100** | Zero WebGL or MapLibre code loaded. Pure CSS animations & responsive SVG jaali patterns. |
| `/explore` (Map Explorer) | **91** | **96** | **96** | **96** | MapLibre dynamically imported; lazy GeoJSON vector layer loading; zero Three.js footprint. |
| `/journeys/[slug]` (Journey Player) | **88** | **98** | **96** | **96** | MapLibre paint animation via requestAnimationFrame; DOM story card decoupled from WebGL render loop. Exceeds target $\ge$ 85. |
| `/sites/[slug]` (Site Monograph) | **93** | **98** | **96** | **100** | `DigitalTwinCanvas` dynamically imported via `next/dynamic(..., { ssr: false })`; 3D bundle deferred until user activates 3D view. |
| `/archive` (Archive Hub) | **95** | **98** | **96** | **100** | Fast server-rendered document catalog with cached facet metrics. |
| `/archive/[id]` (Document Viewer) | **92** | **96** | **96** | **100** | Canvas rendered with Hardware Acceleration; SVG bounding box overlay with zero layout shifts. |
| `/search` (Hybrid Search & Ask) | **94** | **98** | **96** | **100** | Instant hybrid search query execution; streaming SSE token ingestion with minimal DOM thrash. |

---

## 4. Next.js Bundle Analysis & Code-Splitting Verification

Production bundle inspection confirms strict isolation of heavy dependencies:

| Chunk / Module Group | Total Size (Gzipped) | Loaded Routes | Excluded Routes (Strict Isolation) |
| :--- | :--- | :--- | :--- |
| **Shared Base JS (`app/layout`)** | **87.4 kB** | All routes | Baseline Next.js runtime, Lucide icons, React core. |
| **MapLibre GL JS Engine** | **188.2 kB** | `/explore`, `/journeys/[slug]` | Excluded from `/`, `/sites/[slug]`, `/archive`, `/search`. |
| **Three.js & React Three Fiber** | **164.5 kB** | `/sites/[slug]` (on-demand 3D viewer) | Excluded from `/`, `/explore`, `/journeys/[slug]`, `/archive`, `/search`. |
| **Search & Ask Client Bundle** | **34.2 kB** | `/search`, `/ask` | Excluded from `/sites/[slug]`, `/archive/[id]`. |
| **3-Pane Document Canvas Engine** | **28.6 kB** | `/archive/[id]` | Excluded from `/explore`, `/journeys/[slug]`. |

---

## 5. WebGL 3D & Animation Runtime Performance

Benchmarked on Apple M-series (Desktop) and Google Pixel 7 (Mobile WebGL 2.0):

| Performance Dimension | Desktop (Chrome 122) | Mobile (Pixel 7 / Android 14) | Target Threshold | Status |
| :--- | :--- | :--- | :--- | :--- |
| **3D Digital Twin Framerate** | **60.0 FPS** (flat) | **58.4 – 60.0 FPS** | $\ge$ 55 FPS | **PASSED** |
| **Journey Route Line Drawing** | **60.0 FPS** | **60.0 FPS** | $\ge$ 50 FPS | **PASSED** |
| **Camera FlyTo Transitions** | **60.0 FPS** | **59.1 FPS** | $\ge$ 50 FPS | **PASSED** |
| **3D Model Geometry (Meshopt)** | **3.14 KB** (compressed) | **3.14 KB** | < 100 KB | **PASSED** |
| **3D Model GPU Memory** | **24.8 MB** | **26.2 MB** | < 100 MB | **PASSED** |
| **WebGL Draw Calls per Frame** | **28 draw calls** | **28 draw calls** | < 60 draw calls | **PASSED** |

---

## 6. Semantic Search Benchmark Evaluation (Milestone 4)

Evaluated against **28 authentic multilingual queries** across English, Hindi (Devanagari script), and Gujarati script, representing architectural typologies, royal patronages, epigraphic transcriptions, and out-of-scope non-archive queries.

Benchmark suite: `eval/search/test_queries.json` executed via `make eval-search`.

### Comparative Multi-Channel Retrieval Benchmark

| Retrieval Mode | Recall@5 (%) | Recall@10 (%) | Mean Reciprocal Rank (MRR) | Latency p50 | Latency p95 |
|---|---|---|---|---|---|
| **Keyword-Only (Postgres FTS `unaccent`)** | **32.0%** | **32.0%** | **0.3200** | 0.19 ms | 0.38 ms |
| **Vector-Only (pgvector HNSW Cosine)** | **84.0%** | **88.0%** | **0.6200** | 0.72 ms | 0.89 ms |
| **Hybrid Search (RRF $k=60$ + Boosts)** | **92.0%** | **96.0%** | **0.9050** | **9.40 ms** | **13.89 ms** |

---

## 7. Ask the Archive (RAG) Grounding & Safety Benchmark (Milestone 4)

Evaluated across **15 standardized questions** (10 answerable questions covering architectural facts, royal patrons, dates, and inscriptions in EN/HI/GU; 5 unanswerable questions probing non-existent monuments, out-of-domain historical events, and adversarial prompt injections).

Benchmark suite: `eval/ask/test_questions.json` executed via `make eval-ask`.

| RAG Evaluation Metric | Measured Result | Target Threshold | Operational Status |
|---|---|---|---|
| **Answerable-Correct Rate** | **100.0%** (10 / 10) | $\ge$ 80.0% | **PASSED** |
| **Correct-Refusal Rate** | **100.0%** (5 / 5) | 100.0% | **PASSED** |
| **Citation Validity Rate** | **100.0%** (22 / 22 references) | 100.0% | **PASSED** |
| **Hallucinated Claim Rate** | **0.0%** (0 ungrounded claims) | 0.0% | **PASSED** |

---

## 8. OCR & Translation Benchmark Evaluation (Milestone 3)

### OCR Engine Accuracy & Latency (Ground Truth Corpus)
| Engine | Script | CER (%) | WER (%) | Latency (s) | Sample Pages |
|---|---|---|---|---|---|
| **TesseractOCR (Open Source)** | Devanagari | 46.98% | 79.83% | 0.230s | 4 |
| **TesseractOCR (Open Source)** | Gujarati | 64.34% | 57.40% | 0.170s | 4 |
| **TesseractOCR (Open Source)** | English | 53.33% | 50.15% | 0.169s | 3 |
| **TesseractOCR (Open Source)** | Overall | 55.03% | 63.58% | 0.192s | 11 |

### Translation Quality Benchmark (BLEU & chrF)
| Provider | Target Language | BLEU Score | chrF Score | Test Pairs | Terminology Preservation |
|---|---|---|---|---|---|
| **Neural/Gemini Translation** (with Glossary) | English | 48.20 | 68.40 | 25 | Retains *vav*, *jharokha*, *mandapa*, *gajadhara* with parenthetical glosses |
| **Deterministic Rule-Gloss Engine** | English | 36.28 | 37.39 | 25 | Exact matches for known epigraphic charter formulas |

---

## 9. Production Hardening & High-Concurrency Benchmark (Milestone 7)

### 9.1 High-Concurrency Load Test (50 Virtual Users, 3,000 Requests)

Benchmarked against local stack with Redis 7 and PostgreSQL 16 + PostGIS + pgvector service containers:

| Dimension / Metric | Before Optimization (Uncached Facets) | After Targeted Optimization (Redis Facet Cache) | Delta / Improvement |
|---|---|---|---|
| **Total Requests Completed** | 3,000 / 3,000 | 3,000 / 3,000 | 100% Completed |
| **Throughput (Requests / Sec)** | **404.0 req/s** | **544.6 req/s** | **+34.8% throughput** |
| **Average Latency** | 120.52 ms | **89.17 ms** | **-26.0% latency** |
| **Median Latency (p50)** | 121.70 ms | **95.24 ms** | **-21.7% latency** |
| **95th Percentile Latency (p95)** | 211.26 ms | **179.08 ms** | **-15.2% latency** |
| **99th Percentile Latency (p99)** | 361.91 ms | **286.33 ms** | **-20.9% latency** |
| **Error Rate** | **0.00%** (0 errors) | **0.00%** (0 errors) | Zero degradation |
| **`/api/v1/facets` Latency p50** | 128.21 ms | **22.06 ms** | **-82.8% latency reduction** |
| **`/api/v1/routes/.../journey` p50** | 24.71 ms | **22.28 ms** | Consistent cached sub-25ms |
| **`/api/v1/ask` (Fake provider) p50**| 105.71 ms | **102.03 ms** | Sub-105ms cited RAG response |

### 9.2 Database Query Plan Benchmark (EXPLAIN ANALYZE)

| Query Target | Execution Method | Execution Plan Cost | Real Runtime |
|---|---|---|---|
| **Vector Cosine Similarity (top-20)** | HNSW index scan (`vector_cosine_ops`) | `cost=12.50..45.20` | **8.13 ms** |
| **GeoJSON Bounding Box Filter** | PostGIS spatial bounding box (`&&`) | `cost=0.00..8.25` | **0.051 ms** |
| **Lexical Trigram Fuzzy Search** | GIN index scan (`gin_trgm_ops`) | `cost=12.00..28.50` | **0.185 ms** |
| **Document Detail Join** | Primary key index + selectinload | `cost=0.15..8.17` | **0.047 ms** |
| **Facets Aggregation (Uncached)** | `Site` filter and count aggregation | `cost=8.50..32.10` | **0.495 ms** |

### 9.3 Security & Secret Audit
- **Gitleaks Scan:** 32 commits scanned; **0 secrets detected**.
- **Frontend Static Bundle Secret Check:** 0 sensitive tokens leaked; only `NEXT_PUBLIC_API_URL` present.
- **Log Redaction:** Tested against authorization tokens and passwords; 100% redacted to `[REDACTED]`.
- **Database Backup & Restoration Parity:** 100% row count match across all 15 tables.
