# Dharohar Atlas — Role x Action Permissions Matrix & Access Control Specification

## 1. Role Definitions

| Role | Description | Default Assignment | Scope |
| :--- | :--- | :--- | :--- |
| **`viewer`** | Public anonymous visitor or standard registered read-only account. | All unauthenticated requests | Public approved catalogue |
| **`contributor`** | Verified student, field researcher, or external epigraphist. | Default for `/auth/signup` | Owned drafts + Public catalogue |
| **`curator`** | Institutional archivist, senior ASI epigraphist, domain editor. | Assigned by institutional administrator | Global catalogue & moderation |
| **`admin`** | Infrastructure engineer, platform superuser. | Assigned via environment/bootstrap | Global full platform access |

---

## 2. Role x Action Permissions Matrix

| Domain Action | `viewer` (Anon) | `contributor` | `curator` | `admin` | Enforcement Rule & IDOR Boundary |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `site:read` | ✅ | ✅ | ✅ | ✅ | Public endpoint (cached at edge). |
| `site:create` / `site:update` | ❌ (401/403) | ❌ (403) | ✅ | ✅ | Curators & Admins only. |
| `site:delete` | ❌ (401/403) | ❌ (403) | ❌ (403) | ✅ | Hard delete restricted to Admin; soft-delete for Curators. |
| `document:read_public` | ✅ | ✅ | ✅ | ✅ | Documents with `status == "ready"` / published. |
| `document:read_draft` | ❌ (401) | **OWN ONLY** (404 on others) | ✅ | ✅ | **Ownership Scoped:** Contributor requesting another user's draft receives `404 Not Found` (anti-enumeration). |
| `document:upload` | ❌ (401) | ✅ | ✅ | ✅ | Rate limited and validated by magic bytes and size. |
| `document:delete` | ❌ (401) | **OWN ONLY** (404 on others) | ✅ | ✅ | Contributors may only delete their own draft uploads. |
| `document:publish` | ❌ (401) | ❌ (403) | ✅ | ✅ | Transition from `uploaded`/`needs_review` to `ready`. |
| `line:edit_draft` | ❌ (401) | ✅ | ✅ | ✅ | Propose optimistic transcript revision. |
| `line:approve_correction` | ❌ (401) | ❌ (403) | ✅ | ✅ | Accept human correction and trigger vector re-indexing. |
| `journey:read` | ✅ | ✅ | ✅ | ✅ | Public travel itineraries. |
| `journey:create` / `journey:update` | ❌ (401/403) | ❌ (403) | ✅ | ✅ | Curators and Admins only. |
| `admin:reindex` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ | Admin-only system maintenance. |
| `admin:metrics` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ | Requires Admin JWT or internal `X-Internal-Token`. |

---

## 3. Central Policy Engine: `can(user, action, resource)`

Every endpoint evaluates authorization through the single unified policy function:

```python
can(user: UserContext | None, action: str, resource: Any = None) -> bool
```

### Security & IDOR Invariants:
1. **Unauthenticated Access:** Any action requiring an authenticated user returns `401 Unauthorized`.
2. **Insufficient Role:** An authenticated user lacking required privileges returns `403 Forbidden`.
3. **Draft Ownership Boundary (Anti-Enumeration):** If a `contributor` attempts to access a draft belonging to another user (`draft.uploaded_by != user.id`), the policy engine yields `False`, and the API raises `404 Not Found` rather than `403 Forbidden` to prevent object existence disclosure.
4. **Immediate Revocation:** Token verification actively evaluates `user.is_active`. If an account is disabled or deactivated, access is revoked immediately across all endpoints without waiting for token expiration.
5. **Uniform Credential Failure:** Login failure due to "non-existent user" vs "incorrect password" returns the identical error payload: `Invalid credentials. Please verify your email and password.` with equalized timing.
