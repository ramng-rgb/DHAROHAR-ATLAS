# Incident Management & Post-Incident Review Template

## 1. Incident Severity Definitions

- **SEV-0 (Catastrophic):** Total system outage, database data corruption, or active security breach/data leak. Immediate page; freeze all deployments.
- **SEV-1 (High):** Major pathway failure (e.g., Search broken, 3D Monument Viewer failing to render, or API returning 500s on >10% of calls).
- **SEV-2 (Medium):** Non-blocking degradation (e.g., OCR processing queue latency > 15 mins, fallback AI provider active).

---

## 2. Standard Triage Checklist

1. **Acknowledge & Declare:** Post in incident communication channel `#incident-room` with initial severity and incident commander.
2. **Mitigate First, Root-Cause Later:**
   - If bad deploy: Rollback immediately to prior release tag (see [docs/runbooks/rollback.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/rollback.md)).
   - If database locked/unresponsive: Check active queries in pg_stat_activity and kill long-running blockers.
   - If rate-limited upstream: Enable `FakeAIProvider` circuit breaker fallback via `LLM_PROVIDER=mock`.
3. **Verify Restoration:** Confirm `/health/ready` returns `200 OK` and run automated smoke test:
   ```bash
   python scripts/smoke_test.py
   ```

---

## 3. Post-Incident Review (PIR) Template

```markdown
# Post-Incident Review: [INC-YEAR-NUMBER] - [Brief Title]

**Date:** YYYY-MM-DD  
**Incident Commander:** @name  
**Severity:** SEV-X  
**Duration:** XX minutes (Detection: XXm, Mitigation: XXm)  

### 1. Executive Summary
What happened, what was the impact on end users, and how was it resolved?

### 2. Timeline (all times in UTC)
- 10:15 - Alert triggered: External health check reported 503.
- 10:18 - Incident declared; roll-back initiated.
- 10:23 - Previous container restored; /health/ready returned 200.
- 10:25 - Smoke test verified normal operations.

### 3. Root Cause Analysis (5 Whys)
- Why 1: ...
- Why 2: ...
- Why 3: ...
- Why 4: ...
- Why 5: ...

### 4. What Went Well
- ...

### 5. What Didn't Go Well
- ...

### 6. Action Items (Preventative Measures)
| Action Item | Type | Owner | Tracking Ticket |
|---|---|---|---|
| Add constraint check in migration | Prevent | @dev | #123 |
| Improve liveness timeout | Detect | @ops | #124 |
```
