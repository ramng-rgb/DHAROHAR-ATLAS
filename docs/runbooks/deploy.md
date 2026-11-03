# Production Deployment Runbook

## 1. Golden Rule of Deployment

> **Migrations ALWAYS run BEFORE new application code is served.**  
> If an Alembic migration fails, deployment terminates immediately; no traffic is shifted to new containers.

---

## 2. Pre-Flight Verification Checklist

Before triggering a production deployment:
1. Ensure all git commits on `main` follow Conventional Commits.
2. Run clean test and lint pass locally:
   ```bash
   PYTHONPATH=apps/api pytest apps/api/tests -v
   npm test --prefix apps/web
   ```
3. Verify Gitleaks scan returns zero secrets:
   ```bash
   gitleaks detect --no-git -v
   ```
4. Verify environment variable presence and format:
   - `DATABASE_URL` matches `postgresql+asyncpg://...`
   - `SYNC_DATABASE_URL` matches `postgresql://...`
   - `REDIS_URL` matches `redis://...`

---

## 3. Step-by-Step Deployment Procedure

### Step 1: Run Database Schema Migrations
Execute Alembic migrations against the direct (non-pooled) database connection:
```bash
PYTHONPATH=apps/api alembic -c apps/api/alembic.ini upgrade head
```
Verify current revision:
```bash
PYTHONPATH=apps/api alembic -c apps/api/alembic.ini current
```

### Step 2: Seed Static Monument & Route Catalog (First Deploy or Content Updates)
```bash
PYTHONPATH=apps/api python apps/api/scripts/seed_data.py
```

### Step 3: Refresh Vector Embeddings & Lexical Search Index
```bash
PYTHONPATH=apps/api python apps/api/scripts/reindex.py
```

### Step 4: Deploy API Container
Deploy the FastAPI backend container using Docker or cloud service provider. Ensure health check is wired to:
- **Liveness Probe:** `GET /health/live` (Timeout: 3s, Period: 10s)
- **Readiness Probe:** `GET /health/ready` (Timeout: 5s, Period: 15s)

### Step 5: Deploy Frontend Web Application
Build and deploy the Next.js static and server components:
```bash
npm run build --prefix apps/web
```
Verify client-side bundle contains only public environment variables (`NEXT_PUBLIC_API_URL`).

---

## 4. Post-Deployment Verification (Smoke Test)

Run the automated smoke test script:
```bash
python scripts/smoke_test.py
```
Or verify manual curl targets:
```bash
# 1. API Readiness
curl -s http://localhost:8000/health/ready | jq .status
# Expected: "ready"

# 2. Flagship Rani ki Vav Detail
curl -s http://localhost:8000/api/v1/sites/rani-ki-vav | jq .title
# Expected: "Rani ki Vav (The Queen's Stepwell)"

# 3. Gujarat Stepwell Journey
curl -s http://localhost:8000/api/v1/routes/gujarat-stepwell-trail/journey | jq .total_stops
# Expected: 8
```

---

## 5. Abort & Rollback Instructions

If any post-deployment smoke test fails:
1. Follow the rollback runbook in [docs/runbooks/rollback.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/rollback.md).
2. Revert traffic to the previously pinned container image tag.
3. If schema rollback is required, execute `alembic downgrade -1`.
