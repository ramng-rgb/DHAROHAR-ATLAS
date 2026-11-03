import uuid
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.schemas import (
    AuthTokenResponse,
    LoginRequest,
    PasswordResetRequest,
    SignupRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory mock accounts for testing authentication flows
_REGISTERED_USERS: dict[str, dict[str, str]] = {
    "archivist@dharohar.org": {
        "id": "usr_archivist_01",
        "username": "archivist",
        "email": "archivist@dharohar.org",
        "password": "heritage_secure_pass_2026",
        "role": "curator"
    },
    "epigraphist@asi.nic.in": {
        "id": "usr_epigraphist_02",
        "username": "epigraphist",
        "email": "epigraphist@asi.nic.in",
        "password": "sanskrit_charter_pass",
        "role": "researcher"
    }
}

@router.post("/login", response_model=AuthTokenResponse)
async def login(req: LoginRequest):
    """Authenticate user with email and password."""
    email_key = req.email.strip().lower()
    user = _REGISTERED_USERS.get(email_key)
    
    if not user or user["password"] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email and password."
        )

    token = f"dharohar_jwt_{uuid.uuid4().hex}"
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user["id"],
        email=user["email"],
        message="Login successful"
    )

@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    """Register a new research contributor or cultural archivist."""
    email_key = req.email.strip().lower()
    if email_key in _REGISTERED_USERS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    new_id = f"usr_{uuid.uuid4().hex[:12]}"
    _REGISTERED_USERS[email_key] = {
        "id": new_id,
        "username": req.username.strip(),
        "email": email_key,
        "password": req.password,
        "role": "contributor"
    }

    token = f"dharohar_jwt_{uuid.uuid4().hex}"
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=new_id,
        email=email_key,
        message="Registration successful"
    )

@router.post("/password-reset")
async def password_reset(req: PasswordResetRequest):
    """Initiate a password reset flow for an account."""
    email_key = req.email.strip().lower()
    # Always return 200 to prevent email enumeration attacks
    return {
        "status": "success",
        "email": email_key,
        "message": "If an account with this email exists, a password reset link has been dispatched."
    }

@router.get("/me")
async def get_current_user(authorization: str | None = Header(None)):
    """Retrieve details of the currently authenticated contributor/curator."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header."
        )

    return {
        "user_id": "usr_archivist_01",
        "username": "archivist",
        "email": "archivist@dharohar.org",
        "role": "curator",
        "status": "authenticated"
    }
