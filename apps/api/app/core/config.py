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
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "240"))
    
    # Providers (Adapter Pattern)
    OCR_PROVIDER: str = os.getenv("OCR_PROVIDER", "gemini_fallback")  # "gemini", "tesseract", "mock", "gemini_fallback"
    TRANSLATION_PROVIDER: str = os.getenv("TRANSLATION_PROVIDER", "neural")  # "neural", "mock"
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "neural")  # "neural", "mock"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")  # "gemini", "mock"
    RECONSTRUCTION_3D_PROVIDER: str = os.getenv("RECONSTRUCTION_3D_PROVIDER", "colmap_demo")
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
