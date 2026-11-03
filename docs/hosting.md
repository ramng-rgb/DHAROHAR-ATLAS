# Hosting Architecture & Cost Model

## 1. Production Architecture Overview

Dharohar Atlas operates on a hybrid architecture designed for cost-efficiency on standard cloud tiers, separating low-latency stateful components (PostgreSQL + PostGIS + pgvector, Redis) from stateless edge workers and frontend rendering.

```
                      [ Cloudflare / Edge CDN ]
                                  │
          ┌───────────────────────┴───────────────────────┐
          │ (HTML, static 3D GLB, cached GeoJSON)          │ (API requests)
          ▼                                               ▼
[ Vercel / Railway Web ]                        [ Render / Railway API ]
  Next.js 14 App Router                           FastAPI Async Service
  (Server Components + SSR)                       (Stateless, uvicorn workers)
          │                                               │
          │                                 ┌─────────────┴─────────────┐
          │                                 ▼                           ▼
          │                       [ Managed PostgreSQL 16 ]       [ Managed Redis 7 ]
          │                         - PostGIS 3.4                   - Tiered Rate Limiting
          │                         - pgvector (HNSW)               - Route GeoJSON Cache
          │                         - pg_trgm & unaccent            - Idempotency & SSE PubSub
          │                                 ▲
          └─────────────────────────────────┘
```

---

## 2. Component Provider & Tier Breakdown (Baseline vs 10x vs 100x)

| Component | Current / Baseline Provider & Plan | Monthly Cost (Baseline: ~10k req/mo) | 10x Scale (~100k req/mo) | 10x Monthly Cost | 100x Scale (~1M req/mo) | 100x Monthly Cost |
|---|---|---|---|---|---|---|
| **Database** | Supabase Pro / Neon Compute (Postgres 16 + PostGIS + pgvector) | $25.00 | Scaled Compute (2 vCPU, 8GB RAM, 50GB SSD) | $75.00 | Dedicated RDS / Aurora Serverless v2 (4 ACU + read replica) | $240.00 |
| **Cache & Queue** | Upstash Redis (Pay-per-request) / Railway Redis | $0.00 (Free tier < 10k cmd/day) | Upstash Pro / Redis Cloud 1GB | $15.00 | Redis Cloud HA (Multi-AZ 5GB) | $65.00 |
| **API Server** | Render Starter / Railway Team (1 vCPU, 1GB RAM) | $7.00 | 2x Replicas (2 vCPU, 2GB RAM each) | $35.00 | Autoscaled Cloud Run / ECS (4-12 instances) | $120.00 |
| **Frontend** | Vercel Hobby / Pro | $0.00 | Vercel Pro (1TB bandwidth) | $20.00 | Cloudflare Pages + Enterprise Bandwidth | $45.00 |
| **Object Storage** | Cloudflare R2 / AWS S3 (10GB storage) | $0.15 | Cloudflare R2 (100GB, zero egress fee) | $1.50 | Cloudflare R2 (1TB, zero egress fee) | $15.00 |
| **AI Ingestion (OCR/Embed)**| Google Cloud Gemini 2.5 Flash / Text-Embedding-004 | $5.00 | Gemini Flash Batch API + Embeddings | $35.00 | Hybrid Local Tesseract + Gemini Fallback | $110.00 |
| **CDN & DNS** | Cloudflare Free (DDoS + SSL) | $0.00 | Cloudflare Pro ($20/mo + WAF) | $20.00 | Cloudflare Business | $200.00 |
| **TOTAL** | — | **$37.15 / mo** | — | **$201.50 / mo** | — | **$795.00 / mo** |

---

## 3. Honest Free-Tier Limitations & Pitfalls

When running in zero-dollar test/evaluation environments:
1. **Container Cold Starts & Sleep Cycles:** Free compute tiers (e.g. Render Free, Koyeb) spin down after 15 minutes of HTTP inactivity. Cold boot delay can exceed 45 seconds. Mitigated via external heartbeat pinging `/health/live` every 5 minutes.
2. **PostgreSQL RAM & HNSW Indexing:** pgvector HNSW index builds require `maintenance_work_mem >= 64MB`. On free tiers with 256MB RAM limits, vector indexing can trigger out-of-memory (OOM) kills if concurrent queries run.
3. **Storage Quotas:** Free Supabase/Neon database tiers cap row storage at 500MB and project volume. Our raw TIFF/PNG high-resolution scans are stored in object storage (R2/local) rather than DB bytea columns.

---

## 4. Scaling Transitions: What Changes at 10x?

1. **Database Connection Pooling:** Default `AsyncSessionLocal` connects directly. At 10x, direct PostgreSQL connections saturate. We route all API reads/writes through Supabase Supavisor or PgBouncer pooled connection strings on port 6543 (transaction mode), reserving port 5432 for Alembic migrations.
2. **Vector Index Maintenance:** Switch HNSW index parameters from `m=16, ef_construction=64` to `m=24, ef_construction=128` during off-peak reindexing for superior recall at >50,000 vectors.
3. **Stateless Replicas:** FastAPI instances scale from 1 to 3 behind Cloudflare round-robin load balancer. Redis handles distributed rate-limiting counters across all instances.
