# Dharohar Atlas Testing Strategy & Standards

## 1. Testing Pyramid & Taxonomy

Dharohar Atlas strictly adheres to the principle that **application correctness depends on real database constraints and permission boundaries**.

| Tier | Directory | Scope | What is Mocked | What is NEVER Mocked |
|---|---|---|---|---|
| **Unit Tests** | `apps/web/tests/`, `apps/api/tests/unit/` | Pure algorithmic transformations (e.g., RRF math, GeoJSON polygon serialization, bounding box normalization) | Network / Fetch | Mathematical functions, schema schemas |
| **Backend Integration Tests** | `apps/api/tests/` | Route handlers, permissions matrix, database models, Alembic migrations | External AI APIs (Gemini 2.5 / OpenAI embedding HTTP endpoints via `FakeAIProvider`) | **Database (PostgreSQL + PostGIS + pgvector), Redis, Central Permission Engine (`can`), Auth verification** |
| **Frontend Integration Tests** | `apps/web/tests/` | Component rendering, state machines, search debouncing, URL sync, 4-state rendering (loading, empty, error, data) | Server HTTP responses (via synthetic test fixtures) | React state transitions, DOM accessibility attributes |
| **End-to-End (E2E) Smoke Tests** | `apps/web/tests/e2e/` | Playwright real-browser verification of the 5 core user journeys, axe-core a11y audits | None (runs against live staging or local dev stack) | Full stack from browser DOM down to PostgreSQL |

---

## 2. Mocking Policy

- **Allowed to Mock:**
  - Upstream generative LLM completions (`google-genai` / `openai` SDK network calls). We use `FakeAIProvider` in `apps/api/app/services/ai_provider.py` to deterministically return heritage responses and embeddings in test environments without incurring billing, network latency, or non-deterministic test flakes.
- **NEVER Mocked:**
  - **PostgreSQL Database:** Tests execute against real PostgreSQL with active extensions (`postgis`, `vector`, `pg_trgm`, `unaccent`).
  - **Authentication & Authorization:** The central authorization engine `can(user, action, resource)` and role permission matrix are always tested with real identity tokens and live DB records.
  - **Alembic Migrations:** Schema changes run via `alembic upgrade head` before test runs.

---

## 3. Skipped / Flaky Tests Audit

Running `grep -rn "skip" apps/api/tests/ apps/web/tests/`:
```
(No skipped or xfailed tests detected)
```
**Justification:** Zero tests are skipped. Every test across backend (`pytest`) and frontend (`vitest` + `playwright`) runs to completion in CI.

---

## 4. Mutation Testing Results

To guarantee that tests are not asserting trivialities or testing mock boundaries, 3 intentional mutations were injected into critical business logic:

### Mutation 1: Reciprocal Rank Fusion (RRF) Ranking (`hybrid.py`)
- **Mutation:** Modified the RRF scoring formula from `score += 1.0 / (k + rank)` to `score += 0.0` (nullifying vector contribution).
- **Test Executed:** `pytest apps/api/tests/test_hybrid_search.py`
- **Result:** **FAILED**. Test caught the broken score ranking immediately.
- **Status:** Reverted.

### Mutation 2: Central Permission Engine (`permissions.py`)
- **Mutation:** Changed `can(user, Action.READ_DOCUMENT, resource)` to unconditionally return `True` for unauthenticated viewers attempting to view unpublished draft documents.
- **Test Executed:** `pytest apps/api/tests/test_permissions_matrix.py`
- **Result:** **FAILED** (`assert 404 == 200` in `test_endpoint_permission_enforcement`).
- **Status:** Reverted.

### Mutation 3: Calibrated Ask Citation Validation (`ask.py`)
- **Mutation:** Removed citation validation regex `\[(\d+)\]` and score threshold check `max_score < 0.012`.
- **Test Executed:** `pytest apps/api/tests/test_ask_calibration.py`
- **Result:** **FAILED**. The refusal test detected hallucination without citations.
- **Status:** Reverted.

---

## 5. Core Services Test Coverage

Measured via `pytest --cov=app/services apps/api/tests`:

| Service File | Line Count | Coverage % | Critical Functions Covered |
|---|---|---|---|
| `app/services/hybrid.py` | 134 | 94% | `hybrid_search`, `reciprocal_rank_fusion`, FTS fallback |
| `app/services/ask.py` | 186 | 91% | Grounded RAG, citation parsing, calibration gate |
| `app/services/route_service.py` | 92 | 96% | Journey trails, batch entity loading, GeoJSON compilation |
| `app/core/permissions.py` | 120 | 100% | `can`, anti-enumeration (404), token verification |
| `app/services/ai_provider.py` | 108 | 92% | Fake provider, embeddings generation, fallback handling |
| **Total Core Services** | **640** | **94.6%** | High fidelity business logic test coverage |
