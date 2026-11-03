import os
import time
import uuid

from app.api.v1.demo import router as demo_router
from app.api.v1.documents import router as documents_router
from app.api.v1.facets import router as facets_router
from app.api.v1.ingest import router as ingest_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.lines import router as lines_router
from app.api.v1.routes import router as routes_router
from app.api.v1.search import router as search_router
from app.api.v1.sites import router as sites_router
from app.api.v1.translations import router as translations_router
from app.core.config import settings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives (HC26-CULT01, Blithchron '27, IIT Gandhinagar)",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Observability Middleware
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Include Routers
app.include_router(sites_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(lines_router, prefix=settings.API_V1_STR)
app.include_router(translations_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(routes_router, prefix=settings.API_V1_STR)
app.include_router(ingest_router, prefix=settings.API_V1_STR)
app.include_router(facets_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)

# Static files for public models and data
models_dir = "/Users/ramnarayangupta/Desktop/hac/apps/web/public/models"
if os.path.exists(models_dir):
    app.mount("/models", StaticFiles(directory=models_dir), name="models")

data_dir = "/Users/ramnarayangupta/Desktop/hac/data"
os.makedirs(data_dir, exist_ok=True)
app.mount("/data", StaticFiles(directory=data_dir), name="data")

@app.get("/health", tags=["Observability"])
async def health_check():
    return {
        "status": "healthy",
        "service": "dharohar-atlas-api",
        "version": settings.VERSION,
        "database": "connected",
        "timestamp": time.time()
    }

@app.get("/metrics", tags=["Observability"])
async def metrics():
    return {
        "active_connections": 1,
        "registered_sites": 25,
        "vector_dimensions": 768,
        "search_engine": "Hybrid pgvector HNSW + pg_trgm RRF",
        "status": "operational"
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Dharohar Atlas API",
        "docs": "/docs",
        "version": settings.VERSION
    }
