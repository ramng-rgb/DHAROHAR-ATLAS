from app.core.database import get_db
from app.schemas.schemas import (
    AskArchiveRequest,
    AskArchiveResponse,
    SearchResponse,
    SearchSuggestion,
)
from app.services.search.ask import AskTheArchiveService
from app.services.search.hybrid_search import HybridSearchEngine
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="", tags=["Search & Ask"])

@router.get("/search", response_model=SearchResponse)
async def search_archive(
    q: str = Query(..., min_length=1, description="Multilingual search query"),
    types: list[str] | None = Query(None, description="Filter by source types (site, document_line_group, folklore, observation)"),
    lang: list[str] | None = Query(None, description="Filter by languages"),
    site_id: str | None = Query(None, description="Filter by monument site ID"),
    state: list[str] | None = Query(None, description="Filter by Indian states"),
    year_from: int | None = Query(None, description="Chronological start year"),
    year_to: int | None = Query(None, description="Chronological end year"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Hybrid Reciprocal Rank Fusion (RRF) search combining:
    1. Dense vector cosine similarity via HNSW (pgvector)
    2. PostgreSQL Full-Text Search (simple unaccent)
    3. Trigram lexical fuzzy matching (pg_trgm)
    Returns grouped results across Sites, Documents, Folklore, and Observations.
    """
    engine = HybridSearchEngine(db)
    return await engine.search(
        q=q,
        types=types,
        lang=lang,
        site_id=site_id,
        state=state,
        year_from=year_from,
        year_to=year_to,
        limit=limit
    )

@router.get("/search/suggest", response_model=list[SearchSuggestion])
async def search_suggestions(
    q: str = Query(..., min_length=2, description="Prefix or query substring"),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """
    Fast (<100ms) autocomplete suggestions across monument names, entities, and document titles.
    """
    engine = HybridSearchEngine(db)
    return await engine.suggest(q=q, limit=limit)

@router.post("/ask", response_model=AskArchiveResponse)
async def ask_the_archive(
    req: AskArchiveRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Grounded Question-Answering (RAG) over the archive.
    Strictly answers from retrieved sources with verified citations [1], [2].
    Refuses when evidence is absent, preserving academic integrity.
    """
    service = AskTheArchiveService(db)
    question = req.question or req.query or ""
    return await service.answer_question(
        question=question,
        filters=req.filters,
        lang=req.lang
    )

@router.get("/ask/stream")
async def ask_the_archive_stream(
    question: str = Query(..., min_length=2, description="Natural language heritage question"),
    lang: str | None = Query(None, description="Preferred language: en, hi, gu"),
    db: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events (SSE) streaming endpoint for Ask the Archive.
    Yields partial text tokens, ending with a final JSON payload of validated citations.
    """
    service = AskTheArchiveService(db)
    return StreamingResponse(
        service.stream_answer(question=question, lang=lang),
        media_type="text/event-stream"
    )

@router.get("/search/analytics")
async def search_analytics(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Curator analytics endpoint showing recent queries, zero-hit queries, and p50/p95 latency.
    """
    sql = text("""
        SELECT query, lang, result_count, latency_ms, created_at
        FROM search_queries
        ORDER BY created_at DESC
        LIMIT :limit
    """)
    rows = (await db.execute(sql, {"limit": limit})).fetchall()
    
    latencies = [r.latency_ms for r in rows if r.latency_ms]
    p50 = 0.0
    p95 = 0.0
    if latencies:
        import numpy as np
        p50 = float(np.percentile(latencies, 50))
        p95 = float(np.percentile(latencies, 95))

    zero_hit_queries = [r.query for r in rows if r.result_count == 0]
    chunk_count = (await db.execute(text("SELECT COUNT(*) FROM search_chunks"))).scalar() or 0
    doc_count = (await db.execute(text("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL"))).scalar() or 0

    return {
        "total_queries_logged": len(rows),
        "total_chunks": chunk_count,
        "total_documents": doc_count,
        "latency_p50_ms": round(p50, 2),
        "latency_p95_ms": round(p95, 2),
        "zero_result_queries": list(set(zero_hit_queries))[:10],
        "recent_queries": [
            {
                "query": r.query,
                "lang": r.lang,
                "result_count": r.result_count,
                "latency_ms": r.latency_ms,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in rows
        ]
    }
