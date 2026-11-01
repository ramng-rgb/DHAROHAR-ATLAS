import os
from pydantic_settings import BaseSettings
from typing import List

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
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://dharohar-atlas.vercel.app",
        "*"
    ]
    
    # Storage / Media
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # "local", "s3", "supabase"
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", "/Users/ramnarayangupta/Desktop/hac/data")
    
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
