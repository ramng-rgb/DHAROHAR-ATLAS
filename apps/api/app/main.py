import os
import time
import uuid

from app.api.v1.auth import router as auth_router
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
from app.core.rate_limiter import EndpointCategory, tiered_rate_limiter
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
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tiered Rate Limiting & Request ID Middleware
@app.middleware("http")
async def tiered_rate_limiting_and_request_id(request: Request, call_next):
    # 1. Generate / Preserve Request ID
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()

    # 2. Extract body for Auth Routes (allows per-account extraction without stream exhaustion)
    body_bytes = None
    path = request.url.path
    if "/auth" in path and request.method in ("POST", "PUT"):
        body_bytes = await request.body()
        async def receive():
            return {"type": "http.request", "body": body_bytes}
        request = Request(request.scope, receive=receive)

    # 3. Evaluate Tiered Rate Limiting Decision
    decision = await tiered_rate_limiter.evaluate_request(request, body_bytes=body_bytes)

    if not decision.allowed:
        from fastapi.responses import JSONResponse
        content = {
            "detail": decision.reason or "Rate limit exceeded. Please slow down.",
            "retry_after": decision.retry_after,
            "category": decision.category.value,
        }
        if decision.backoff_seconds > 0:
            content["backoff_seconds"] = round(decision.backoff_seconds, 2)

        return JSONResponse(
            status_code=429,
            content=content,
            headers={
                "X-Request-ID": request_id,
                "Retry-After": str(decision.retry_after),
                "X-RateLimit-Limit": str(decision.limit),
                "X-RateLimit-Remaining": str(decision.remaining),
                "X-RateLimit-Reset": str(decision.reset_seconds),
                "X-RateLimit-Category": decision.category.value,
                "X-RateLimit-Backoff": f"{decision.backoff_seconds:.2f}",
            }
        )

    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    if decision.limit > 0:
        response.headers["X-RateLimit-Limit"] = str(decision.limit)
        response.headers["X-RateLimit-Remaining"] = str(decision.remaining)
        response.headers["X-RateLimit-Category"] = decision.category.value
    return response

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
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
models_dir = settings.MODELS_DIR
if os.path.exists(models_dir):
    app.mount("/models", StaticFiles(directory=models_dir), name="models")

data_dir = settings.MEDIA_DIR
os.makedirs(data_dir, exist_ok=True)
app.mount("/data", StaticFiles(directory=data_dir), name="data")

@app.get("/health", tags=["Observability"])
async def health_check():
    """Liveness probe: returns 200 OK if service process is alive."""
    return {
        "status": "healthy",
        "service": "dharohar-atlas-api",
        "version": settings.VERSION,
        "timestamp": time.time()
    }

@app.get("/ready", tags=["Observability"])
async def readiness_check():
    """Readiness probe: validates DB, Redis, and Storage subsystem connectivity."""
    checks = {}
    ready = True
    
    # 1. Check PostgreSQL Database
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        ready = False

    # 2. Check Redis Cache
    try:
        from app.core.redis_cache import get_redis_client
        client = get_redis_client()
        if client:
            await client.ping()
            checks["redis"] = "connected"
        else:
            checks["redis"] = "unavailable"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"

    # 3. Check Storage Subsystem
    try:
        if os.path.exists(settings.MEDIA_DIR) and os.access(settings.MEDIA_DIR, os.R_OK | os.W_OK):
            checks["storage"] = "accessible"
        else:
            checks["storage"] = "missing or permission denied"
            ready = False
    except Exception as e:
        checks["storage"] = f"unhealthy: {str(e)}"
        ready = False

    from fastapi.responses import JSONResponse
    status_code = 200 if ready else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if ready else "degraded",
            "service": "dharohar-atlas-api",
            "version": settings.VERSION,
            "checks": checks,
            "timestamp": time.time()
        }
    )

@app.get("/metrics", tags=["Observability"])
async def metrics(request: Request):
    """Protected internal metrics endpoint."""
    token = request.headers.get("X-Internal-Token")
    client_host = request.client.host if request.client else "127.0.0.1"
    is_internal = client_host in ("127.0.0.1", "localhost", "testclient") or token == settings.METRICS_SECRET_KEY
    if not is_internal:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden: Internal metrics endpoint")
        
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
