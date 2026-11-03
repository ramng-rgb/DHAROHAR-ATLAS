import json
import logging
import re
import time
import unicodedata
from typing import Any

from app.services.search.embeddings import EmbeddingProvider, get_embedding_provider
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

def normalize_query_text(q: str) -> str:
    """
    Normalizes query strings:
    - Unicode NFC normalization
    - Strips zero-width control characters (U+200B, U+200C, U+200D, U+FEFF)
    - Strips noisy punctuation while keeping Indic script ligatures and characters
    """
    if not q:
        return ""
    # NFC normalize
    norm = unicodedata.normalize("NFC", q.strip())
    # Strip zero-width and invisible chars
    norm = re.sub(r"[\u200b\u200c\u200d\ufeff\u202a-\u202e]", "", norm)
    # Remove leading/trailing quotes and control chars
    norm = norm.strip("\"' \t\r\n")
    return norm

def detect_query_language(q: str) -> str:
    """
    Detects if query is predominantly Devanagari, Gujarati, or Latin/English.
    """
    for ch in q:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            return "hi"  # Devanagari (Hindi/Sanskrit/Marathi)
        if 0x0A80 <= code <= 0x0AFF:
            return "gu"  # Gujarati
    return "en"

class HybridSearchEngine:
    def __init__(self, db: AsyncSession, embedding_provider: EmbeddingProvider | None = None):
        self.db = db
        self.embedding_provider = embedding_provider or get_embedding_provider()

    async def search(
        self,
        q: str,
        types: list[str] | None = None,
        lang: list[str] | None = None,
        site_id: str | None = None,
        state: list[str] | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        limit: int = 20,
        k_rrf: int = 60,
        candidate_k: int = 35
    ) -> dict[str, Any]:
        start_time = time.perf_counter()
        clean_q = normalize_query_text(q)
        query_lang = detect_query_language(clean_q)

        if not clean_q:
            return {
                "query": "",
                "total": 0,
                "latency_ms": 0.0,
                "detected_lang": query_lang,
                "results": [],
                "grouped": {"sites": [], "documents": [], "folklore": [], "observations": []}
            }

        # 1. Embed query
        query_vec = await self.embedding_provider.embed_text(clean_q)
        vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vec) + "]"

        # Build dynamic SQL filter clauses
        filter_clauses = ["c.deleted_at IS NULL"]
        params: dict[str, Any] = {
            "query_vec": vec_str,
            "q": clean_q,
            "candidate_k": candidate_k
        }

        if types:
            filter_clauses.append("c.source_type = ANY(:types)")
            params["types"] = types

        if lang:
            filter_clauses.append("c.lang = ANY(:lang)")
            params["lang"] = lang

        if site_id:
            filter_clauses.append("c.site_id = :site_id")
            params["site_id"] = site_id

        if state:
            filter_clauses.append("(c.metadata_json->>'state' = ANY(:state) OR c.site_id IN (SELECT id FROM sites WHERE state = ANY(:state)))")
            params["state"] = state

        if year_from is not None and year_to is not None:
            filter_clauses.append("(c.site_id IN (SELECT id FROM sites WHERE period_end_year >= :year_from AND period_start_year <= :year_to))")
            params["year_from"] = year_from
            params["year_to"] = year_to
        elif year_from is not None:
            filter_clauses.append("(c.site_id IN (SELECT id FROM sites WHERE period_end_year >= :year_from))")
            params["year_from"] = year_from
        elif year_to is not None:
            filter_clauses.append("(c.site_id IN (SELECT id FROM sites WHERE period_start_year <= :year_to))")
            params["year_to"] = year_to

        where_sql = " AND ".join(filter_clauses)

        # 2. Parallel Ranking Channel A: Dense Vector HNSW
        dense_sql = text(f"""
            SELECT c.id, c.source_type, c.source_id, c.site_id, c.document_id, c.page_id,
                   c.chunk_index, c.text, c.lang, c.metadata_json, c.is_illustrative,
                   (1 - (c.embedding <=> :query_vec)) as score
            FROM search_chunks c
            WHERE {where_sql}
            ORDER BY c.embedding <=> :query_vec ASC
            LIMIT :candidate_k
        """)

        # 3. Parallel Ranking Channel B: Full-Text Search (simple unaccent)
        # We try websearch_to_tsquery, fallback to plainto_tsquery if websearch syntax fails
        fts_sql = text(f"""
            WITH q AS (
                SELECT websearch_to_tsquery('simple', immutable_unaccent(:q)) as query_ts
            )
            SELECT c.id, c.source_type, c.source_id, c.site_id, c.document_id, c.page_id,
                   c.chunk_index, c.text, c.lang, c.metadata_json, c.is_illustrative,
                   ts_rank_cd(c.tsv, q.query_ts) as score,
                   ts_headline('simple', c.text, q.query_ts, 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') as headline
            FROM search_chunks c, q
            WHERE {where_sql} AND c.tsv @@ q.query_ts
            ORDER BY score DESC
            LIMIT :candidate_k
        """)

        # 4. Parallel Ranking Channel C: Trigram Fuzzy Matching
        trgm_sql = text(f"""
            SELECT c.id, c.source_type, c.source_id, c.site_id, c.document_id, c.page_id,
                   c.chunk_index, c.text, c.lang, c.metadata_json, c.is_illustrative,
                   word_similarity(:q, c.text) as score
            FROM search_chunks c
            WHERE {where_sql} AND word_similarity(:q, c.text) > 0.35
            ORDER BY score DESC
            LIMIT :candidate_k
        """)

        dense_rows = (await self.db.execute(dense_sql, params)).fetchall()
        try:
            fts_rows = (await self.db.execute(fts_sql, params)).fetchall()
        except Exception:
            fts_rows = []

        trgm_rows = (await self.db.execute(trgm_sql, params)).fetchall()

        # 5. Reciprocal Rank Fusion (RRF, k=60)
        rrf_scores: dict[str, float] = {}
        items_by_id: dict[str, dict[str, Any]] = {}
        matches_by_id: dict[str, set] = {}

        w_dense = 1.0
        w_fts = 1.0
        w_trgm = 0.8

        # Process Dense
        for rank, r in enumerate(dense_rows):
            cid = str(r.id)
            score = w_dense / (k_rrf + rank + 1)
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + score
            matches_by_id.setdefault(cid, set()).add("semantic")
            if cid not in items_by_id:
                items_by_id[cid] = self._row_to_dict(r)
                items_by_id[cid]["vector_score"] = float(r.score)

        # Process FTS
        for rank, r in enumerate(fts_rows):
            cid = str(r.id)
            score = w_fts / (k_rrf + rank + 1)
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + score
            matches_by_id.setdefault(cid, set()).add("keyword")
            if cid not in items_by_id:
                items_by_id[cid] = self._row_to_dict(r)
                items_by_id[cid]["fts_score"] = float(r.score)
            if hasattr(r, "headline") and r.headline:
                items_by_id[cid]["highlighted_snippet"] = r.headline

        # Process Trigram
        for rank, r in enumerate(trgm_rows):
            cid = str(r.id)
            score = w_trgm / (k_rrf + rank + 1)
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + score
            matches_by_id.setdefault(cid, set()).add("name")
            if cid not in items_by_id:
                items_by_id[cid] = self._row_to_dict(r)
                items_by_id[cid]["trgm_score"] = float(r.score)

        # Apply boosts
        clean_q_lower = clean_q.lower()
        for cid, item in items_by_id.items():
            meta = item.get("metadata", {})
            title = (meta.get("title") or "").lower()
            name_hi = (meta.get("name_hi") or "").lower()
            name_gu = (meta.get("name_gu") or "").lower()

            # Exact name match boost
            if clean_q_lower and (clean_q_lower in title or clean_q_lower in name_hi or clean_q_lower in name_gu):
                rrf_scores[cid] *= 1.3
                matches_by_id[cid].add("name")

            # Human verified epigraphy boost
            if item.get("is_human_verified") or meta.get("data_confidence") == "verified":
                rrf_scores[cid] *= 1.1

        # Sort combined results
        sorted_cids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)[:limit]

        final_results = []
        grouped = {
            "sites": [],
            "documents": [],
            "folklore": [],
            "observations": []
        }

        # Site metadata cache for enrichment
        site_cache: dict[str, dict[str, Any]] = {}

        for cid in sorted_cids:
            item = items_by_id[cid]
            item["rrf_score"] = round(rrf_scores[cid], 5)
            item["matched_by"] = sorted(list(matches_by_id[cid]))

            # Fallback snippet highlighting if no FTS headline
            if not item.get("highlighted_snippet"):
                item["highlighted_snippet"] = self._create_snippet(item["text"], clean_q)

            # Enrich site info if site_id is present
            sid = item.get("site_id")
            if sid:
                if sid not in site_cache:
                    s_row = (await self.db.execute(text("SELECT id, slug, name, name_hi, name_gu, latitude, longitude, site_type, state FROM sites WHERE id = :sid"), {"sid": sid})).first()
                    if s_row:
                        site_cache[sid] = {
                            "id": str(s_row.id),
                            "slug": s_row.slug,
                            "name": s_row.name,
                            "name_hi": s_row.name_hi,
                            "name_gu": s_row.name_gu,
                            "latitude": s_row.latitude,
                            "longitude": s_row.longitude,
                            "site_type": s_row.site_type,
                            "state": s_row.state,
                        }
                    else:
                        site_cache[sid] = {}
                item["site"] = site_cache[sid]

            final_results.append(item)

            # Grouping
            st = item["source_type"]
            if st == "site":
                grouped["sites"].append(item)
            elif st in ("document_line_group", "translation"):
                grouped["documents"].append(item)
            elif st == "folklore":
                grouped["folklore"].append(item)
            elif st == "observation":
                grouped["observations"].append(item)

        latency = (time.perf_counter() - start_time) * 1000.0

        # Log query to search_queries asynchronously (non-blocking)
        try:
            await self.db.execute(
                text("""
                    INSERT INTO search_queries (id, query, lang, filters, result_count, latency_ms, created_at)
                    VALUES (:id, :q, :lang, :filters, :count, :latency, CURRENT_TIMESTAMP)
                """),
                {
                    "id": str(unicodedata.normalize("NFC", q)[:36]) + "-" + str(int(time.time())),
                    "q": clean_q,
                    "lang": query_lang,
                    "filters": json.dumps({"types": types, "site_id": site_id, "state": state}),
                    "count": len(final_results),
                    "latency": round(latency, 2)
                }
            )
            await self.db.commit()
        except Exception as e:
            logger.debug("Failed logging search query: %s", e)

        return {
            "query": clean_q,
            "detected_lang": query_lang,
            "total": len(final_results),
            "latency_ms": round(latency, 2),
            "results": final_results,
            "grouped": grouped
        }

    async def suggest(self, q: str, limit: int = 8) -> list[dict[str, Any]]:
        clean_q = normalize_query_text(q)
        if not clean_q or len(clean_q) < 2:
            return []

        clean_lower = clean_q.lower()
        wildcard = f"{clean_q}%"
        fuzzy = f"%{clean_q}%"

        # Search site names, dynasties, and document titles
        sql = text("""
            SELECT id, name as title, name_hi, name_gu, 'site' as kind, slug,
                   (CASE WHEN LOWER(name) LIKE LOWER(:wildcard) THEN 2.0
                         WHEN LOWER(name_hi) LIKE LOWER(:wildcard) THEN 2.0
                         WHEN LOWER(name_gu) LIKE LOWER(:wildcard) THEN 2.0
                         ELSE similarity(name, :q) END) as score
            FROM sites
            WHERE deleted_at IS NULL
              AND (name ILIKE :fuzzy OR name_hi ILIKE :fuzzy OR name_gu ILIKE :fuzzy OR similarity(name, :q) > 0.15)
            ORDER BY score DESC
            LIMIT :limit
        """)
        rows = (await self.db.execute(sql, {"wildcard": wildcard, "fuzzy": fuzzy, "q": clean_q, "limit": limit})).fetchall()

        suggestions = []
        for r in rows:
            suggestions.append({
                "id": str(r.id),
                "title": r.title,
                "name_hi": r.name_hi,
                "name_gu": r.name_gu,
                "kind": r.kind,
                "slug": r.slug
            })

        return suggestions

    def _row_to_dict(self, r: Any) -> dict[str, Any]:
        meta = r.metadata_json or {}
        return {
            "id": str(r.id),
            "source_type": r.source_type,
            "source_id": str(r.source_id),
            "site_id": str(r.site_id) if r.site_id else None,
            "document_id": str(r.document_id) if r.document_id else None,
            "page_id": str(r.page_id) if r.page_id else None,
            "chunk_index": r.chunk_index,
            "text": r.text,
            "lang": r.lang,
            "metadata": meta,
            "is_illustrative": getattr(r, "is_illustrative", False),
            "is_human_verified": meta.get("is_human_verified", False),
            "line_ids": meta.get("line_ids", []),
            "start_line_no": meta.get("start_line_no"),
            "end_line_no": meta.get("end_line_no")
        }

    def _create_snippet(self, text: str, query: str, window: int = 240) -> str:
        if not text:
            return ""
        q_words = [w for w in query.lower().split() if len(w) > 2]
        lower_text = text.lower()
        match_idx = -1
        for w in q_words:
            idx = lower_text.find(w)
            if idx != -1:
                match_idx = idx
                break

        if match_idx == -1:
            snippet = text[:window]
        else:
            start = max(0, match_idx - 60)
            end = min(len(text), start + window)
            snippet = text[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(text):
                snippet = snippet + "..."

        # Highlight occurrences of query words
        for w in q_words:
            pattern = re.compile(re.escape(w), re.IGNORECASE)
            snippet = pattern.sub(lambda m: f"<mark>{m.group(0)}</mark>", snippet)

        return snippet
