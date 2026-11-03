import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Dharohar Atlas API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://ramnarayangupta@localhost:5432/dharohar_atlas"
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL", 
        "postgresql+psycopg2://ramnarayangupta@localhost:5432/dharohar_atlas"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,https://dharohar-atlas.vercel.app,*"
        ).split(",")
        if origin.strip()
    ]
    
    # Storage / Media
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # "local", "s3", "supabase"
    BASE_PROJECT_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", os.path.join(BASE_PROJECT_DIR, "data"))
    MODELS_DIR: str = os.getenv("MODELS_DIR", os.path.join(BASE_PROJECT_DIR, "apps/web/public/models"))
    
    # Security & Observability
    METRICS_SECRET_KEY: str = os.getenv("METRICS_SECRET_KEY", "dharohar-internal-metrics-key")
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "300"))
    
    # Tiered Configurable Rate Limits
    # 1. Authentication Routes (Strictest: per-IP + per-account limits with exponential backoff)
    RATE_LIMIT_AUTH_PER_IP: int = int(os.getenv("RATE_LIMIT_AUTH_PER_IP", "15"))
    RATE_LIMIT_AUTH_PER_ACCOUNT: int = int(os.getenv("RATE_LIMIT_AUTH_PER_ACCOUNT", "5"))
    RATE_LIMIT_AUTH_BASE_BACKOFF: float = float(os.getenv("RATE_LIMIT_AUTH_BASE_BACKOFF", "2.0"))
    RATE_LIMIT_AUTH_MAX_BACKOFF: float = float(os.getenv("RATE_LIMIT_AUTH_MAX_BACKOFF", "300.0"))
    RATE_LIMIT_AUTH_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_AUTH_WINDOW_SECONDS", "300"))
    
    # 2. Public Endpoints (Moderate limits for anonymous browsing/searching, e.g. 180 req/min)
    RATE_LIMIT_PUBLIC_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PUBLIC_PER_MINUTE", "180"))
    
    # 3. Authenticated User Actions (Loosest limits for logged-in researchers/curators, e.g. 600 req/min)
    RATE_LIMIT_AUTHENTICATED_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_AUTHENTICATED_PER_MINUTE", "600"))
    
    # Providers (Adapter Pattern)
    OCR_PROVIDER: str = os.getenv("OCR_PROVIDER", "gemini_fallback")  # "gemini", "tesseract", "mock", "gemini_fallback"
    TRANSLATION_PROVIDER: str = os.getenv("TRANSLATION_PROVIDER", "neural")  # "neural", "mock"
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "neural")  # "neural", "mock"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")  # "gemini", "mock"
    RECONSTRUCTION_3D_PROVIDER: str = os.getenv("RECONSTRUCTION_3D_PROVIDER", "colmap_demo")
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Configurable Mock/Demo Credentials (overridable via environment)
    DEMO_ARCHIVIST_PASSWORD: str = os.getenv("DEMO_ARCHIVIST_PASSWORD", "heritage_secure_pass_2026")
    DEMO_EPIGRAPHIST_PASSWORD: str = os.getenv("DEMO_EPIGRAPHIST_PASSWORD", "sanskrit_charter_pass")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
