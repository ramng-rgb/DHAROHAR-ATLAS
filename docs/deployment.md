# Dharohar Atlas: Production Deployment & Infrastructure Guide
*Blithchron '27, IIT Gandhinagar | Problem: HC26-CULT01*

---

## 1. Production Architecture Overview

The Dharohar Atlas production stack consists of five decoupled, containerized tiers:

```mermaid
graph TD
    User([End User / Mobile Client]) -->|HTTPS / WSS| CDN[Vercel Global Edge / Cloudflare CDN]
    CDN --> Web[Next.js 14 App Router SSR / ISR]
    Web -->|Internal JSON REST / SSE| API[FastAPI Gateway Gunicorn + Uvicorn]
    
    subgraph Data & Async Execution Layer
        API -->|Async Pooled Pool: 20| DB[(Managed PostgreSQL 16 + PostGIS + pgvector)]
        API -->|Pub/Sub & Cache| Redis[(Redis 7 In-Memory Cache)]
        Worker[Asynchronous Pipeline Worker] -->|Consume Queue| Redis
        Worker -->|Checkpoints & Inserts| DB
        Worker -->|Extract & Translate| VisionML[Tesseract OCR / Gemini Vision / Indic NLP]
    end
    
    subgraph Storage Layer
        Web -->|Fetch 3D Models & Images| S3[(S3 / Supabase Public Storage Bucket)]
        API -->|Generate Presigned Upload URL| S3
        User -->|Direct Binary Upload PUT| S3
    end
```

---

## 2. Database Infrastructure (Supabase / Managed PostgreSQL 16)

### 2.1 Required PostgreSQL Extensions
Before running migrations, execute the following SQL in the production database:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### 2.2 Connection String Architecture
- **Migrations & CLI Scripts (`alembic`, `seed_from_yaml.py`, `reindex.py`):**
  Use the **Direct Connection String** (port 5432) to avoid session locking timeouts or prepared statement pooling issues:
  ```env
  SYNC_DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
  ```
- **API Runtime (`FastAPI` with `asyncpg`):**
  Use the **Transaction Pooled Connection String** (port 6543 via Supavisor / PgBouncer):
  ```env
  DATABASE_URL="postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0"
  ```

### 2.3 Strict Migration, Seed & Reindex Sequence
Execute in this exact order:
```bash
# Step 1: Apply all Alembic migrations (creates tables, foreign keys, and vector column)
alembic upgrade head

# Step 2: Seed authentic heritage sites, routes, enriched stops, dynasties, and tags
python apps/api/scripts/seed_from_yaml.py

# Step 3: Backfill semantic search chunks, FTS generated column, and HNSW embeddings
python apps/api/scripts/reindex.py
```

### 2.4 Verified Index Catalog & Sizing
Empirically measured on PostgreSQL 16:
| Table | Index Name | Type / Algorithm | Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `search_chunks` | `ix_search_chunks_embedding_hnsw` | `HNSW (vector_cosine_ops, m=16, ef=64)` | **344 kB** | Sub-5ms cosine semantic search |
| `search_chunks` | `ix_search_chunks_text_trgm` | `GIN (text gin_trgm_ops)` | **984 kB** | Fuzzy substring & Indic transliteration matching |
| `search_chunks` | `ix_search_chunks_tsv` | `GIN (tsv)` | **280 kB** | Full-Text Search with `unaccent(simple)` |
| `search_chunks` | `ix_search_chunks_content_hash`| `B-Tree` | **56 kB** | Idempotent reindexing change detection |
| `sites` | `idx_sites_location` | `GiST (location geography)` | **8.2 kB** | PostGIS bounding-box & distance spatial scans |
| `sites` | `idx_sites_name_trgm` | `GIN (name gin_trgm_ops)` | **88 kB** | Fast monument name autocomplete |
| `routes` | `ix_routes_slug` | `B-Tree (Unique)` | **16 kB** | Instant journey lookup by slug |

---

## 3. Object Storage Configuration (S3 / Supabase Storage)

### 3.1 Bucket Layout & Permissions
- **Public Bucket (`dharohar-public`):**
  - Path: `/models/*` (Optimized `.opt.glb` 3D digital twins)
  - Path: `/photos/*` (High-resolution monument photography)
  - Permissions: Public read (`GetObject`), authenticated write.
  - HTTP Headers:
    ```http
    Cache-Control: public, max-age=31536000, immutable
    Accept-Ranges: bytes
    ```
- **Private Bucket (`dharohar-uploads`):**
  - Path: `/raw_uploads/{uuid}/*`
  - Permissions: Private read/write via HMAC-SHA256 presigned URLs (`PUT` with 15-minute expiration).

### 3.2 CORS Configuration for Storage Bucket
```json
[
  {
    "AllowedOrigins": [
      "https://dharohar-atlas.vercel.app",
      "https://dharohar.org",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## 4. Docker Production Containerization (API & Worker)

### 4.1 Multi-Stage API Image (`apps/api/Dockerfile`)
- Non-root user: `appuser` (UID 10001)
- Pinned base: `python:3.12-slim`
- Pre-installed OCR packs: `tesseract-ocr`, `tesseract-ocr-hin`, `tesseract-ocr-guj`, `tesseract-ocr-san`, `tesseract-ocr-mar`, `tesseract-ocr-eng`
- Healthcheck: `CMD curl -f http://localhost:8000/health || exit 1`
- Entrypoint: `gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 app.main:app`

### 4.2 Background Worker Image
Uses the **identical** Docker image as the API, launched with the worker command:
```bash
python /app/scripts/worker.py
```
Handles asynchronous extraction jobs from the DB/Redis queue with graceful SIGTERM shutdown.

---

## 5. Web Frontend Deployment (Next.js 14 on Vercel / Docker)

### 5.1 Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.dharohar-atlas.org/api/v1
```

### 5.2 Build Command & Output
- Build Command: `npm run build`
- Node Version: Node.js 20.x
- Bundle Isolation: Three.js and MapLibre dynamically split into on-demand route chunks.

---

## 6. Production Smoke Test Verification Checklist

Run this verification against any staging or production deployment:

1. **Liveness & Readiness Probes:**
   ```bash
   curl -sI https://api.dharohar-atlas.org/health
   # Must return 200 OK
   
   curl -s https://api.dharohar-atlas.org/ready
   # Must return {"status": "ready", "checks": {"database": "connected", "storage": "accessible"}}
   ```

2. **Protected Metrics Check:**
   ```bash
   curl -s -H "X-Internal-Token: [METRICS_KEY]" https://api.dharohar-atlas.org/metrics
   # Returns 200 with search_engine and status metrics
   ```

3. **Journey Route Retrieval:**
   ```bash
   curl -sI https://api.dharohar-atlas.org/api/v1/routes/gujarat-stepwell-trail/journey
   # Must return 200 OK with ETag header
   ```

4. **Curated Demo Script:**
   ```bash
   curl -s https://api.dharohar-atlas.org/api/v1/demo/script
   # Must return 9 steps with verified entities
   ```

5. **3D Model Range Requests & Immutable Cache:**
   ```bash
   curl -sI -H "Range: bytes=0-500" https://dharohar-atlas.vercel.app/models/stepwell_pavilion.opt.glb
   # Must return HTTP 206 Partial Content with Accept-Ranges: bytes
   ```

6. **End-to-End Tour Execution:**
   Navigate to the live URL -> click **"Demo mode"** on the navbar -> verify all 9 steps advance smoothly to the final Ask the Archive cited stream.

---

## 7. Tiered Rate Limiting & Auth Protection

Dharohar Atlas enforces tiered, defense-in-depth rate limiting to protect public discovery, researcher workloads, and sensitive authentication routes.

### 7.1 Tier Architecture

| Tier Category | Target Routes | Identification | Default Limit | Policy on Excess |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth/login`<br>`/api/v1/auth/signup`<br>`/api/v1/auth/password-reset` | Combination of **Client IP** + **Account Identifier** (email/username in body/headers) | **15 req/300s** per IP<br>**5 req/300s** per Account | **Exponential Backoff** (2s, 4s, 8s, 16s... up to 300s) — never a hard lockout |
| **Public Endpoints** | `/api/v1/sites`<br>`/api/v1/search`<br>`/api/v1/routes`<br>`/api/v1/documents` | Client IP (`X-Forwarded-For` or remote addr) | **180 req/min** | HTTP 429 with `Retry-After` header |
| **Authenticated Users** | All routes carrying `Authorization: Bearer <token>` or user identification | User ID / Token Hash | **600 req/min** | Looser limits for active archival exploration |
| **Exempt System Routes** | `/health`, `/ready`, `/metrics`, `/favicon.ico` | Internal Probes & Infrastructure | **Unlimited** | Never throttled to preserve monitoring & uptime |

### 7.2 Exponential Backoff Formula
For authentication endpoints, excess requests trigger non-blocking exponential backoff instead of a permanent lockout:
$$\text{Backoff (seconds)} = \min\left(\text{RATE\_LIMIT\_AUTH\_MAX\_BACKOFF}, \text{RATE\_LIMIT\_AUTH\_BASE\_BACKOFF} \times 2^{\text{excess} - 1}\right)$$
- Example with defaults ($\text{base}=2.0\text{s}$, limit = 5):
  - 1st excess attempt (6th total): 2.0s backoff
  - 2nd excess attempt (7th total): 4.0s backoff
  - 3rd excess attempt (8th total): 8.0s backoff
  - 4th excess attempt (9th total): 16.0s backoff

### 7.3 Configuration Settings
All rate limits and backoff factors are completely configurable via environment variables:

```env
# Master Rate Limiting Switch
RATE_LIMIT_ENABLED=true

# Auth Routes Configuration
RATE_LIMIT_AUTH_PER_IP=15
RATE_LIMIT_AUTH_PER_ACCOUNT=5
RATE_LIMIT_AUTH_BASE_BACKOFF=2.0
RATE_LIMIT_AUTH_MAX_BACKOFF=300.0
RATE_LIMIT_AUTH_WINDOW_SECONDS=300

# Public & Authenticated Throughput
RATE_LIMIT_PUBLIC_PER_MINUTE=180
RATE_LIMIT_AUTHENTICATED_PER_MINUTE=600
```

