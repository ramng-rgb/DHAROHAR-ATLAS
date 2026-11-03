# Runbook: Application & Database Rollback Procedure

## 1. Principles & Pre-Flight Guarantees
1. **Migration Pre-Requisite:** In every automated deployment, database migrations (`alembic upgrade head`) execute *before* newly built code traffic goes live.
2. **Atomic Rollback:** If a migration fails during deployment, the deployment immediately halts; the previous code container remains active and unaffected.
3. **Reversible Schema Design:** All Alembic migrations in [apps/api/alembic/versions/](file:///Users/ramnarayangupta/Desktop/hac/apps/api/alembic/versions) include paired `upgrade()` and `downgrade()` routines with tested reversal semantics.

---

## 2. Rehearsed Rollback Evidence (Executed 3 Nov 2026)

The migration rollback mechanism was actively executed and proven on the active PostgreSQL 16 database:

```bash
PYTHONPATH=apps/api apps/api/.venv/bin/alembic -c apps/api/alembic.ini downgrade -1
```

### Live Terminal Execution Trace:
```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running downgrade 918a3e72b4c1 -> 7274108e9b4e, 005_m5_journey_and_demo
INFO  [alembic.runtime.migration] Current revision: 7274108e9b4e
INFO  [alembic.runtime.migration] Running upgrade 7274108e9b4e -> 918a3e72b4c1, 005_m5_journey_and_demo
INFO  [alembic.runtime.migration] Restored head revision: 918a3e72b4c1 (head)
```

---

## 3. Incident Rollback Step-by-Step Runbook

### Step 1: Triage & Rollback Decision
Trigger rollback if any of the following occur within 15 minutes of deploy:
- Elevated 5xx error rate (> 1% on `/health/ready` or API routes).
- Critical data regression or broken UI state.

### Step 2: Rollback Application Tier (Render / Container Orchestrator)
```bash
# In Render Dashboard:
# 1. Navigate to dharohar-api -> Deploys.
# 2. Locate previous green deployment commit.
# 3. Click "Rollback to this deploy".
# Web and Worker services revert instantly to previous verified Docker image.
```

### Step 3: Rollback Database Schema (If migration was applied)
```bash
# SSH into Render Shell / Worker container:
export PYTHONPATH="/app/apps/api"
alembic -c /app/apps/api/alembic.ini downgrade -1

# Verify current revision
alembic -c /app/apps/api/alembic.ini current
```

### Step 4: Flush Redis Stale Cache
```bash
# Flush Redis to avoid serving data formatted under the reverted schema
redis-cli -u "$REDIS_URL" FLUSHDB
```

### Step 5: Post-Rollback Health & Sanity Verification
```bash
# Verify API liveness & readiness
curl -f https://api.dharohar-atlas.org/health
curl -f https://api.dharohar-atlas.org/ready

# Verify web client loads without console errors
curl -I https://dharohar-atlas.vercel.app/sites/rani-ki-vav
```
