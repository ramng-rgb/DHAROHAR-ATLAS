import logging
from dataclasses import dataclass
from typing import Any, Callable

from app.core.config import settings
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)

# Roles in the platform
ROLE_VIEWER = "viewer"
ROLE_CONTRIBUTOR = "contributor"
ROLE_CURATOR = "curator"
ROLE_ADMIN = "admin"

@dataclass
class UserContext:
    id: str
    username: str
    email: str
    role: str
    is_active: bool = True

# Central Registry of Known In-Memory Users for Testing & Demo
_KNOWN_USERS: dict[str, UserContext] = {
    "usr_archivist_01": UserContext(
        id="usr_archivist_01",
        username="archivist",
        email="archivist@dharohar.org",
        role=ROLE_CURATOR,
        is_active=True
    ),
    "usr_epigraphist_02": UserContext(
        id="usr_epigraphist_02",
        username="epigraphist",
        email="epigraphist@asi.nic.in",
        role=ROLE_CURATOR,
        is_active=True
    ),
    "usr_contributor_01": UserContext(
        id="usr_contributor_01",
        username="student_researcher",
        email="researcher@university.ac.in",
        role=ROLE_CONTRIBUTOR,
        is_active=True
    ),
    "usr_contributor_02": UserContext(
        id="usr_contributor_02",
        username="external_field_worker",
        email="fieldworker@history.org",
        role=ROLE_CONTRIBUTOR,
        is_active=True
    ),
    "usr_disabled_01": UserContext(
        id="usr_disabled_01",
        username="compromised_account",
        email="deactivated@dharohar.org",
        role=ROLE_CONTRIBUTOR,
        is_active=False
    ),
    "usr_admin_01": UserContext(
        id="usr_admin_01",
        username="admin",
        email="admin@dharohar.org",
        role=ROLE_ADMIN,
        is_active=True
    )
}

def get_user_by_token(token: str) -> UserContext | None:
    """Resolve mock bearer token to UserContext, checking active status immediately."""
    if not token or not token.startswith("Bearer "):
        return None
    raw_token = token[len("Bearer "):].strip()

    # 1. Check exact user ID in raw_token first
    for uid, user in _KNOWN_USERS.items():
        if uid in raw_token:
            return user

    # 2. Check exact username in raw_token
    for user in _KNOWN_USERS.values():
        if user.username in raw_token:
            return user

    # 3. Fallback to generic role keywords
    if "admin" in raw_token:
        return _KNOWN_USERS["usr_admin_01"]
    if "curator" in raw_token or "archivist" in raw_token:
        return _KNOWN_USERS["usr_archivist_01"]
    if "contributor" in raw_token or "researcher" in raw_token:
        return _KNOWN_USERS["usr_contributor_01"]

    return None

def can(user: UserContext | None, action: str, resource: Any = None) -> bool:
    """
    Central permission check: can(user, action, resource)
    Evaluates whether the user (or anonymous viewer) has permission to perform action on resource.
    """
    # 1. Inactive / Deactivated users have ZERO access
    if user and not user.is_active:
        return False

    user_role = user.role if user else ROLE_VIEWER

    # 2. Admin can perform any action
    if user_role == ROLE_ADMIN:
        return True

    # 3. Public Read Actions (All roles + Anonymous Viewers)
    public_read_actions = {
        "site:read",
        "document:read_public",
        "journey:read",
        "search:query",
        "ask:query"
    }
    if action in public_read_actions:
        return True

    # Anonymous viewers can do nothing else
    if not user:
        return False

    # 4. Curator Actions
    if user_role == ROLE_CURATOR:
        # Curators can perform all domain read, edit, upload, publish, and curation actions
        curator_actions = {
            "site:create", "site:update",
            "document:read_draft", "document:upload", "document:delete", "document:publish",
            "line:edit_draft", "line:approve_correction",
            "journey:create", "journey:update"
        }
        if action in curator_actions:
            return True

    # 5. Contributor Actions (Strict Ownership Scoped)
    if user_role == ROLE_CONTRIBUTOR:
        if action == "document:upload":
            return True
            
        if action == "line:edit_draft":
            return True

        if action in ("document:read_draft", "document:delete"):
            if resource is None:
                return True
            # Ownership boundary: can only read/delete their OWN draft
            owner_id = getattr(resource, "uploaded_by", None) or (
                resource.get("uploaded_by") if isinstance(resource, dict) else None
            )
            return owner_id in (user.id, user.username, user.email)

    return False

def require_permission(action: str, resource_getter: Callable[[Any], Any] | None = None):
    """
    FastAPI dependency factory enforcing can(user, action, resource).
    Raises 401 for unauthenticated, 403 for forbidden, and 404 for unauthorized draft access.
    """
    async def dependency(
        authorization: str | None = Header(None, alias="Authorization")
    ):
        user = get_user_by_token(authorization)
        
        # Check active status
        if user and not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account has been deactivated."
            )
            
        if not user and action not in ("site:read", "document:read_public", "journey:read", "search:query", "ask:query"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials required."
            )

        resource = resource_getter() if resource_getter else None
        
        # Check permission
        allowed = can(user, action, resource)
        if not allowed:
            # If contributor attempting to access another user's draft, return 404 (Anti-Enumeration)
            if user and user.role == ROLE_CONTRIBUTOR and action in ("document:read_draft", "document:delete"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found."
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action."
            )
            
        return user

    return dependency
