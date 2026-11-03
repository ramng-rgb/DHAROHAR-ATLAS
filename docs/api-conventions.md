# Dharohar Atlas — API Design Conventions & Specification

## 1. Naming & Resource Conventions
- All API routes are prefixed with `/api/v1`.
- Resource collections use lowercase plural nouns (`/sites`, `/documents`, `/routes`, `/jobs`).
- Sub-resources follow nested hierarchy: `/documents/{id}/pages/{page_no}/lines`.
- Action endpoints use clear verbs when not representing standard CRUD:
  - `/api/v1/auth/login`
  - `/api/v1/auth/signup`
  - `/api/v1/search/ask`
  - `/api/v1/demo/script`

---

## 2. Standardized Error Response Envelope
Every error across all HTTP status codes (400, 401, 403, 404, 409, 413, 422, 429, 500) strictly conforms to ONE uniform JSON envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable concise summary of the issue.",
    "details": [
      {
        "field": "latitude",
        "issue": "Input should be greater than or equal to 6.0"
      }
    ]
  }
}
```

### Standard Error Codes:
- `VALIDATION_ERROR` (400 / 422): Malformed payload, invalid field types, or extra unknown properties.
- `UNAUTHENTICATED` (401): Missing or expired Bearer token.
- `FORBIDDEN` (403): User role lacks permission for the requested resource.
- `NOT_FOUND` (404): Resource does not exist or user lacks ownership of a draft.
- `CONFLICT` (409): Resource already exists (e.g. duplicate email or slug).
- `PAYLOAD_TOO_LARGE` (413): Upload exceeds maximum size threshold (25MB).
- `RATE_LIMITED` (429): Request frequency exceeds tiered limit or quota.
- `INTERNAL_SERVER_ERROR` (500): Unexpected failure; sanitized, zero internal stack trace leaked to client.

---

## 3. Strict Boundary Validation
- All Pydantic request models enforce `ConfigDict(extra="forbid", str_strip_whitespace=True)`.
- Extra, unexpected, or unknown properties in JSON bodies are rejected immediately at the boundary.
- Numeric fields have strict ranges (e.g. `latitude: 6.0 <= lat <= 38.0`, `year: -3000 <= y <= 2100`).
- Text fields have bounded lengths and regex sanity patterns.
- Raw JSON syntax errors (garbage JSON, truncated payloads) are trapped by custom middleware and return a clean `400 Bad Request` in standard error format, never Python `json.decoder.JSONDecodeError` traces.

---

## 4. Pagination Conventions
- List endpoints accept `limit` (default: 20, max: 100) and `offset` (default: 0).
- Response payloads provide:
  ```json
  {
    "items": [...],
    "total": 142,
    "limit": 20,
    "offset": 0,
    "next_cursor": "20"
  }
  ```
- When `(offset + limit) >= total`, `next_cursor` is `null`.

---

## 5. Background Jobs & Asynchronous Workflows
- Any operation exceeding ~1000ms (e.g. multi-page OCR parsing, vector reindexing, 3D model processing) is dispatched asynchronously to the Redis job queue.
- Initial submission returns `202 Accepted` with a `job_id` and location header: `/api/v1/jobs/{job_id}`.
- Job status lifecycle: `queued` $\rightarrow$ `running` $\rightarrow$ `succeeded` or `retrying` $\rightarrow$ `dead` (after max 3 retries).
- Failed and retrying jobs record error payloads, backoff timestamps, and are visible to curators via `GET /api/v1/jobs/dead-letter`.
