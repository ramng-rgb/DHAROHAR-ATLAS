# Dharohar Atlas — Agent Operational Guidelines & Memory

## 1. Product Overview
Dharohar Atlas is an open-access, AI-augmented digital heritage preservation and exploration platform for Indian archaeological monuments, architectural stepwells/temples, and epigraphic manuscripts.
Key capabilities:
1. **Interactive Geospatial Explorer (M1):** PostGIS-backed spatial clustering, bounding-box viewport queries, and timeline filtering across Indian heritage sites.
2. **Site Detail & 3D Digital Twin Viewer (M2):** Photogrammetric 3D model streaming, archival galleries, architectural metadata, folklore narratives, and citation export.
3. **Archival OCR & Multilingual Translation Pipeline (M3):** Asynchronous ingestion of ancient manuscripts (Devanagari, Sanskrit, Gujarati), OCR processing, confidence scoring, line-level transcription alignment, and human-in-the-loop corrections.
4. **Hybrid Search & Grounded Retrieval (M4):** RRF (Reciprocal Rank Fusion) combining `pg_trgm` full-text search and `pgvector` semantic embeddings with cited, hallucination-resistant Ask-the-Archive Q&A.
5. **Interactive Curated Journeys & Walkthroughs (M5):** Waypoint-guided heritage itineraries with synchronized map animations, audio narration, and demo tours.
6. **Production Deployment & Hardening (M6/M7):** Dockerized multi-stage builds, Supabase/Postgres + Redis architecture, strict input schema validation, tiered rate limiting, and role-based access control.

---

## 2. Fixed Technology Stack
- **Backend API & Processing:**
  - Python 3.12, FastAPI, Pydantic v2 (strict schemas, extra fields forbidden)
  - PostgreSQL 16 + PostGIS + pgvector (`vector(768)`) + `pg_trgm` + `unaccent`
  - SQLAlchemy 2.0 (asyncpg async engine + psycopg2 sync engine for migrations/worker)
  - Alembic for database migrations
  - Redis 7 for job queue broker, distributed rate limiting, and caching
  - PyTesseract, SacreBLEU, EditDistance, NumPy, Pillow, PyPDFium2
- **Frontend Web Application:**
  - Next.js 14 (App Router), React 18, TypeScript, Vanilla Tailwind CSS
  - MapLibre GL 6 (geospatial mapping with vector tiles and markers)
  - Three.js / React Three Fiber / Drei (3D digital twin rendering)
  - Lucide React, Framer Motion, Zustand
- **AI/ML & Resilience Providers (Adapter Pattern):**
  - Google Gemini API (`gemini-2.0-flash`, `text-embedding-004`) for cloud OCR, neural translation, embeddings, and grounded synthesis
  - Resilient local offline mock/heuristic fallbacks for zero-cost execution and testing

---

## 3. Essential Developer Commands
- **Local Infrastructure & Services:**
  - Start containers: `make up` or `docker compose up -d`
  - Stop containers: `make down` or `docker compose down`
- **Database Migrations & Seeding:**
  - Run migrations: `apps/api/.venv/bin/alembic -c apps/api/alembic.ini upgrade head`
  - Seed database: `PYTHONPATH=apps/api apps/api/.venv/bin/python scripts/seed.py`
  - Reindex hybrid search vectors: `PYTHONPATH=apps/api apps/api/.venv/bin/python scripts/reindex.py`
- **Quality Assurance & Verification:**
  - Backend Tests: `PYTHONPATH=apps/api apps/api/.venv/bin/pytest apps/api/tests`
  - Backend Lint: `apps/api/.venv/bin/ruff check apps/api`
  - Backend Typecheck: `apps/api/.venv/bin/mypy apps/api/app`
  - Frontend Tests: `npm test --prefix apps/web -- --run`
  - Frontend Typecheck: `npm run type-check --prefix apps/web`
  - Frontend Production Build: `npm run build --prefix apps/web`

---

## 4. Non-Negotiable Operational Rules
1. **Never commit secrets:** All credentials, keys, passwords, and tokens must use environment variables and be documented in `.env.example`.
2. **Every endpoint needs validation & auth:** Every endpoint must have strict input validation, an authentication check, an authorization check, and automated tests.
3. **Database changes via Alembic:** Every schema change must be a tracked Alembic migration. No ad-hoc manual SQL changes.
4. **Verify before declaring done:** Always run lint, typecheck, and the full test suite before marking any task as complete.
5. **Ask before adding dependencies:** NO new dependencies without prior explicit user consent.
6. **Never weaken or fake tests:** NEVER edit a test just to make it pass; fix the underlying code, or stop and report the issue.
7. **No skipped or failing tests:** Never describe work as complete if any test is failing or skipped.
8. **Server is source of truth:** The backend server is the absolute source of truth for validation, permissions, quotas, and business limits.

---

## 5. Mandatory Task Completion Checklist
Before declaring any task or phase complete, attach and verify this exact four-point checklist:
1. **Verification Outputs:** Run lint, typecheck, and the full test suite and display concrete terminal output.
2. **File Manifest:** List every file created or modified and provide the rationale.
3. **Mocks & Stubs:** List anything skipped, stubbed, mocked, or hard-coded.
4. **Assumptions & Confirmations:** List any assumptions that require user confirmation.
