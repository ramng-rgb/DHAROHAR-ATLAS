import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.permissions import (
    ROLE_VIEWER,
    ROLE_CONTRIBUTOR,
    ROLE_CURATOR,
    ROLE_ADMIN,
    UserContext,
    can,
    _KNOWN_USERS
)

@pytest.mark.asyncio
async def test_auth_uniform_failure_message():
    """Verify 'wrong password' and 'no such user' return the exact same error message."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Non-existent user
        res_nonexistent = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody_exists_here@dharohar.org", "password": "some_random_password_123"}
        )
        assert res_nonexistent.status_code == 401
        data_nonexistent = res_nonexistent.json()
        assert data_nonexistent["error"]["code"] == "UNAUTHENTICATED"
        assert data_nonexistent["error"]["message"] == "Invalid credentials. Please verify your email and password."

        # 2. Existing user with wrong password
        res_wrong_pw = await client.post(
            "/api/v1/auth/login",
            json={"email": "archivist@dharohar.org", "password": "definitely_wrong_password_999"}
        )
        assert res_wrong_pw.status_code == 401
        data_wrong_pw = res_wrong_pw.json()
        assert data_wrong_pw["error"]["code"] == "UNAUTHENTICATED"
        assert data_wrong_pw["error"]["message"] == "Invalid credentials. Please verify your email and password."

        # Invariant: identical message prevents user enumeration
        assert data_nonexistent["error"]["message"] == data_wrong_pw["error"]["message"]

@pytest.mark.asyncio
async def test_permissions_matrix_policy_engine():
    """Test central can(user, action, resource) logic across all roles and actions."""
    anon_user = None
    contributor = _KNOWN_USERS["usr_contributor_01"]
    other_contributor = _KNOWN_USERS["usr_contributor_02"]
    curator = _KNOWN_USERS["usr_archivist_01"]
    admin = _KNOWN_USERS["usr_admin_01"]
    disabled_user = _KNOWN_USERS["usr_disabled_01"]

    # 1. Deactivated user has zero access to any action
    assert can(disabled_user, "site:read") is False
    assert can(disabled_user, "document:upload") is False
    assert can(disabled_user, "document:read_public") is False

    # 2. Public read permissions
    for role_user in [anon_user, contributor, curator, admin]:
        assert can(role_user, "site:read") is True
        assert can(role_user, "document:read_public") is True
        assert can(role_user, "journey:read") is True

    # 3. Contributor actions
    assert can(contributor, "document:upload") is True
    assert can(contributor, "line:edit_draft") is True
    assert can(anon_user, "document:upload") is False
    assert can(contributor, "site:create") is False  # Cannot create sites
    assert can(contributor, "line:approve_correction") is False  # Cannot approve corrections

    # 4. Ownership Scoping: Contributor touching own draft vs another user's draft
    own_draft = {"id": "doc_123", "uploaded_by": contributor.id, "status": "draft"}
    other_draft = {"id": "doc_456", "uploaded_by": other_contributor.id, "status": "draft"}

    assert can(contributor, "document:read_draft", own_draft) is True
    assert can(contributor, "document:read_draft", other_draft) is False
    assert can(contributor, "document:delete", own_draft) is True
    assert can(contributor, "document:delete", other_draft) is False

    # Curators and admins can access any draft
    assert can(curator, "document:read_draft", other_draft) is True
    assert can(admin, "document:read_draft", other_draft) is True

    # 5. Curator actions
    assert can(curator, "line:approve_correction") is True
    assert can(curator, "document:publish") is True
    assert can(curator, "site:create") is True
    assert can(curator, "admin:reindex") is False  # Curators cannot reindex system

    # 6. Admin actions
    assert can(admin, "admin:reindex") is True
    assert can(admin, "site:delete") is True

@pytest.mark.asyncio
async def test_endpoint_permission_enforcement():
    """Verify HTTP status codes: 401 for unauthenticated, 403 for wrong role, 404 for other user draft."""
    from app.core.permissions import require_permission
    from fastapi import Depends

    # Register temporary test routes on app for integration testing
    @app.get("/api/v1/test-perm/curator-only")
    async def curator_route(user=Depends(require_permission("site:create"))):
        return {"status": "ok", "user": user.id}

    @app.get("/api/v1/test-perm/draft/{doc_id}")
    async def draft_route(doc_id: str, user=Depends(require_permission("document:read_draft", lambda: {"uploaded_by": "usr_contributor_01"}))):
        return {"status": "ok", "doc_id": doc_id}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Unauthenticated request -> 401
        res_unauth = await client.get("/api/v1/test-perm/curator-only")
        assert res_unauth.status_code == 401
        assert res_unauth.json()["error"]["code"] == "UNAUTHENTICATED"

        # B. Contributor accessing curator-only endpoint -> 403
        res_forbidden = await client.get(
            "/api/v1/test-perm/curator-only",
            headers={"Authorization": "Bearer dharohar_test_contributor_token"}
        )
        assert res_forbidden.status_code == 403
        assert res_forbidden.json()["error"]["code"] == "FORBIDDEN"

        # C. Curator accessing curator-only endpoint -> 200
        res_curator = await client.get(
            "/api/v1/test-perm/curator-only",
            headers={"Authorization": "Bearer dharohar_test_curator_token"}
        )
        assert res_curator.status_code == 200
        assert res_curator.json()["status"] == "ok"

        # D. Contributor accessing their own draft -> 200
        res_own_draft = await client.get(
            "/api/v1/test-perm/draft/doc_123",
            headers={"Authorization": "Bearer dharohar_test_contributor_token_usr_contributor_01"}
        )
        assert res_own_draft.status_code == 200

        # E. Contributor accessing another user's draft -> 404 (Anti-Enumeration)
        res_other_draft = await client.get(
            "/api/v1/test-perm/draft/doc_123",
            headers={"Authorization": "Bearer dharohar_test_contributor_token_usr_contributor_02"}
        )
        assert res_other_draft.status_code == 404
        assert res_other_draft.json()["error"]["code"] == "NOT_FOUND"

        # F. Disabled user token -> 401 Immediate Revocation
        res_disabled = await client.get(
            "/api/v1/test-perm/curator-only",
            headers={"Authorization": "Bearer dharohar_test_token_usr_disabled_01"}
        )
        assert res_disabled.status_code == 401
        assert "deactivated" in res_disabled.json()["error"]["message"].lower()
