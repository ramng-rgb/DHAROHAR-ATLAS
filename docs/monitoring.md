# Observability, Monitoring & Alerts Playbook

## 1. Alerting Philosophy: Only Wake a Human When Action is Required

Alert fatigue destroys incident response. Dharohar Atlas defines strictly actionable alerts with clear runbook linkages.

| Alert Name | Metric / Trigger | Severity | Actionable Human Response | Runbook Link |
|---|---|---|---|---|
| **API Process Down** | External uptime ping to `/health/live` fails for 2 consecutive checks (10 mins) | **P0 (Critical)** | Restart container or inspect crash logs in cloud console | [docs/runbooks/uptime_down.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/uptime_down.md) |
| **Database Connectivity Lost** | `/health/ready` check reports `"database": "unhealthy"` | **P0 (Critical)** | Verify PostgreSQL compute state, check connection pool saturation | [docs/runbooks/database_outage.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/database_outage.md) |
| **HTTP 5xx Error Spike** | 5xx error rate exceeds 5% of total requests over a 5-minute sliding window | **P1 (High)** | Inspect recent deployments; filter structured logs by `level: "ERROR"` | [docs/runbooks/error_spike.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/error_spike.md) |
| **Dead-Letter Queue Backlog** | OCR / embedding dead-letter jobs count > 10 | **P2 (Medium)** | Check OCR worker crash logs; inspect poison pill document IDs | [docs/runbooks/dlq_backlog.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/dlq_backlog.md) |
| **LLM Spending / Quota Cap** | Daily AI API spend counter reaches 80% or 100% threshold | **P2 (Medium)** | Circuit breaker activates `FakeAIProvider` fallback automatically | [docs/runbooks/llm_cap.md](file:///Users/ramnarayangupta/Desktop/hac/docs/runbooks/llm_cap.md) |

---

## 2. Free Uptime Monitor Setup Guide (Better Stack / UptimeRobot)

External liveness monitoring keeps free-tier instances warm (preventing cold boot sleep cycles) and alerts immediately if the service goes dark.

### Monitor 1: API Service Liveness
- **Monitor Type:** HTTP(s) Keyword Monitor
- **Target URL:** `https://<YOUR_DEPLOYED_API_DOMAIN>/health/live`
- **Check Interval:** `5 minutes`
- **HTTP Method:** `GET`
- **Expected Status Code:** `200`
- **Keyword Assertion:** `"status": "healthy"`
- **Timeout:** `10 seconds`

### Monitor 2: Web App Homepage
- **Monitor Type:** HTTP(s) Monitor
- **Target URL:** `https://<YOUR_DEPLOYED_WEB_DOMAIN>/`
- **Check Interval:** `5 minutes`
- **HTTP Method:** `GET`
- **Expected Status Code:** `200`
- **Alert Channel:** Email / Slack / Telegram

---

## 3. Log Correlation: Finding all Lines for a Request ID

Since every HTTP transaction receives or generates an `X-Request-ID` echoed back in the response headers, searching cloud log aggregators (e.g. Better Stack Logtail, Datadog, or Docker logs) is instantaneous:

```bash
# Example: Find all structured log lines for request req_7f8a9b2c
cat api.log | grep '"request_id": "req_7f8a9b2c"' | jq .
```
Result:
```json
{"timestamp": "2026-11-03T10:48:07Z", "level": "INFO", "message": "Search executed", "request_id": "req_7f8a9b2c", "user_id": "anonymous"}
```
