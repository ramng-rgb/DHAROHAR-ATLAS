# Dharohar Atlas: 10-Slide Pitch Deck Outline
*Blithchron '27, IIT Gandhinagar | Problem HC26-CULT01*

---

### Slide 1: Title & Vision
- **Header:** Dharohar Atlas (धरोहर ज्ञान सेतु)
- **Sub-header:** The Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives
- **Key Points:**
  - Problem Statement: HC26-CULT01, Blithchron '27, IIT Gandhinagar
  - Mission: Rescuing trapped heritage field notes, manuscripts, and photos into an interactive, multi-sensory web platform.
- **Speaker Notes:** "Good afternoon judges. Today we present Dharohar Atlas, built to solve problem HC26-CULT01: turning trapped cultural archives into an active, living knowledge layer for researchers, tourists, and archivists worldwide."

---

### Slide 2: The Problem: Trapped Heritage
- **Header:** Millions of Heritage Assets Trapped in Static Silos
- **Key Points:**
  - Static Decks & Folders: Field photography of stepwells, forts, and friezes sits unindexed in Google Drive.
  - Script & Linguistic Barriers: Devanagari, Old Gujarati, and Sanskrit folios remain untranslated and unsearchable.
  - Lack of Spatial-Temporal Context: Isolated slides lack coordinates, dynasties, and historical trade route context.
  - Epigraphic Fragility: Weathered stone inscriptions erode before peer-reviewed preservation can occur.
- **Speaker Notes:** "Cultural researchers spend months taking field photos and notes, but once collected, these assets die in static PowerPoint decks and obscure folders. There is no unified system to link a stone inscription to a 3D model or a GIS route."

---

### Slide 3: The Solution: The Dharohar Atlas Platform
- **Header:** A Four-Pillar Unified Knowledge Engine
- **Key Points:**
  - 1. **Geospatial & Temporal Explorer:** Full-screen historical GIS with timeline slider and dynasty filters.
  - 2. **3D Digital Twin Viewer:** WebGL GLB models with spatial hotspots and architectural caliper tools.
  - 3. **Multilingual OCR & Translation:** Side-by-side folio inspector with human-in-the-loop versioned review.
  - 4. **Hybrid Semantic Search & RAG:** pgvector HNSW dense embeddings + trigram lexical Reciprocal Rank Fusion.
- **Speaker Notes:** "One single contribution—photos, scanned pages, and coordinates—becomes a map pin, an interactive 3D digital twin, translated searchable text, and a node in an interconnected knowledge graph."

---

### Slide 4: System Architecture & Dataflow
- **Header:** Clean Layering with Event-Driven Ingestion
- **Key Points:**
  - Client Tier: Next.js 14 App Router, MapLibre GL, React Three Fiber.
  - API Gateway: FastAPI Async, Pydantic v2 schemas, zero business logic in routes.
  - Adapter Pattern: Abstract interfaces for OCR (Gemini/Tesseract), Translation, and Embeddings.
  - Workers: Redis job queues for asynchronous photogrammetry and large folio batch parsing.
- **Speaker Notes:** "We prioritized architecture (30% weighting). Notice our clean separation of concerns: API routers, domain services, provider adapters, and SQLAlchemy models, with Redis-backed async workers for heavy jobs."

---

### Slide 5: Database Schema & Vector Indexing
- **Header:** Single Unified PostgreSQL 16 with pgvector & PostGIS
- **Key Points:**
  - Eliminates microservice fragmentation (no Pinecone, no MongoDB).
  - 14 relational tables: Sites, Models3D, Hotspots, Documents, OCRLines, Routes, Search Chunks, Audits.
  - HNSW index on 768-dimensional embeddings (344 kB) for sub-5ms cosine retrieval.
  - Trigram GIN indexes (984 kB) and FTS unaccent GIN (280 kB) fused via Reciprocal Rank Fusion ($k=60$).
- **Speaker Notes:** "Instead of running multiple fragile databases, we consolidated everything into PostgreSQL 16 with pgvector, PostGIS, and pg_trgm. We get ACID transactions, versioned audits, and vector search in one rock-solid container."

---

### Slide 6: Technology Stack Rationale & Automated Quality
- **Header:** Production-Grade Modern Web Engineering
- **Key Points:**
  - Frontend: TypeScript Strict, Tailwind CSS, MapLibre GL, React Three Fiber.
  - Backend: Python 3.12, FastAPI, SQLAlchemy 2.0 Async, Redis 7 caching with ETag validation.
  - Verification: 62 Pytest backend tests (100%), 39 Vitest unit tests (100%), 20 Playwright E2E flows (100%).
  - Accessibility & Performance: 0 Axe serious/critical violations, Lighthouse mobile $\ge$ 90 across routes.
  - Evaluation: 92.0% Recall@5 (MRR 0.9050), 100% RAG Answerable Accuracy, 100% Correct Refusal.
- **Speaker Notes:** "We avoided brittle wrappers. We used MapLibre GL for raw mapping performance, Three.js for 60 FPS 3D rendering on mobile devices, and automated test suites with 62 backend and 39 frontend tests verifying 0 accessibility violations."

---

### Slide 7: Scalability & Enterprise Readiness
- **Header:** Scaling to 100,000+ Monuments & Global Traffic
- **Key Points:**
  - Vector Tile Pipeline (MVT/PBF): Replaces heavy GeoJSON with binary vector tiles.
  - Draco Mesh Compression: Shrinks 50MB photogrammetry outputs to 1.5MB for instant web loading.
  - Redis Hot Query Cache: Sub-millisecond response for trending heritage sites.
  - Presigned S3 Ingest: Heavy image uploads bypass the API gateway directly to object storage.
- **Speaker Notes:** "Dharohar Atlas is architected for 100k+ sites. Using server-side vector tiles, HNSW vector indexing, and Draco mesh compression, we keep latency under 100 milliseconds worldwide."

---

### Slide 8: Honest Limitations & Technical Trade-Offs
- **Header:** Academic Honesty & Realistic Constraints
- **Key Points:**
  - GPU Compute: Full COLMAP photogrammetry requires high-VRAM CUDA GPUs; in demo environments, we honestly use a pre-processed demo asset fallback rather than faking execution.
  - Historical Epigraphy: Weathered stone inscriptions still require human verification (enabled via our human-in-the-loop review tool).
  - Folklore Authenticity: Every narrative item is tagged with an authenticity status to prevent myth propagation.
- **Speaker Notes:** "We believe in engineering integrity. If a GPU is not present in the demo container, our code honestly uses our pre-processed fallback pipeline rather than faking outputs."

---

### Slide 9: Impact, Beneficiaries & Problem Fit
- **Header:** Empowering Scholars, Tourism & Cultural Preservation
- **Key Points:**
  - Academic Institutions & ASI: Standardized digital curation with BibTeX/APA citation exports.
  - Heritage Tourists: Immersive 3D pre-travel inspection and historical Fellowship Journey routes.
  - Indigenous Communities: Preserving oral folklore and regional languages in living digital archives.
  - UNESCO Compliance: Digital twin preservation for vulnerable World Heritage sites.
- **Speaker Notes:** "The impact is direct: researchers can cite verified records, tourists can experience monuments in 3D before visiting, and vanishing regional languages find digital permanence."

---

### Slide 10: Future Roadmap & Vision
- **Header:** The Road Ahead: Dharohar 2.0
- **Key Points:**
  - Q2 2027: 3D Gaussian Splatting (.splat) streaming for photorealistic drone scans.
  - Q3 2027: Mobile PWA with offline SQLite synchronization for field archaeologists in remote areas.
  - Q4 2027: Crowdsourced epigraphy peer-review moderation queue with cryptographic attribution.
- **Speaker Notes:** "Thank you judges. We invite you to explore the live demo, run the test suite, and join us in revitalising India's architectural heritage."
