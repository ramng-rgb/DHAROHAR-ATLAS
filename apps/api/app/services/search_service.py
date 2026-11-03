from typing import Any

from app.services.providers import get_embedding_provider, get_llm_provider
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_provider = get_embedding_provider()
        self.llm_provider = get_llm_provider()

    async def hybrid_search(self, query: str, limit: int = 15, k: int = 60) -> dict[str, Any]:
        """
        Executes Reciprocal Rank Fusion (RRF) combining dense pgvector cosine similarity
        and pg_trgm trigram lexical full-text search.
        """
        if not query or not query.strip():
            return {"query": query, "total": 0, "results": [], "grouped": {}}

        query_vec = await self.embedding_provider.get_embedding(query)
        vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vec) + "]"

        # 1. Dense Vector Retrieval (Cosine Distance)
        dense_sql = text("""
            SELECT id, content_type, content_id, title, text_snippet,
                   (embedding <=> :query_vec) as distance
            FROM embeddings
            ORDER BY distance ASC
            LIMIT 25
        """)
        dense_rows = (await self.db.execute(dense_sql, {"query_vec": vec_str})).fetchall()

        # 2. Lexical Trigram Retrieval
        lexical_sql = text("""
            SELECT id, content_type, content_id, title, text_snippet,
                   similarity(title || ' ' || text_snippet, :query) as score
            FROM embeddings
            WHERE similarity(title || ' ' || text_snippet, :query) > 0.05
               OR title ILIKE :wildcard
               OR text_snippet ILIKE :wildcard
            ORDER BY score DESC
            LIMIT 25
        """)
        wildcard = f"%{query}%"
        lexical_rows = (await self.db.execute(lexical_sql, {"query": query, "wildcard": wildcard})).fetchall()

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores: dict[str, float] = {}
        record_map: dict[str, dict[str, Any]] = {}

        # Process Dense Ranks
        for rank, row in enumerate(dense_rows):
            doc_id = str(row.id)
            score = 1.0 / (k + rank + 1)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + score
            record_map[doc_id] = {
                "id": doc_id,
                "content_type": row.content_type,
                "content_id": row.content_id,
                "title": row.title,
                "text_snippet": row.text_snippet,
                "vector_rank": rank + 1
            }

        # Process Lexical Ranks
        for rank, row in enumerate(lexical_rows):
            doc_id = str(row.id)
            score = 1.0 / (k + rank + 1)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + score
            if doc_id not in record_map:
                record_map[doc_id] = {
                    "id": doc_id,
                    "content_type": row.content_type,
                    "content_id": row.content_id,
                    "title": row.title,
                    "text_snippet": row.text_snippet,
                    "lexical_rank": rank + 1
                }
            else:
                record_map[doc_id]["lexical_rank"] = rank + 1

        # Sort by combined RRF score
        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda did: rrf_scores[did], reverse=True)[:limit]
        
        results = []
        grouped: dict[str, list[dict[str, Any]]] = {
            "site": [],
            "ocr_line": [],
            "folklore": [],
            "observation": []
        }

        # Fetch site details (coords, slug) if relevant
        for did in sorted_doc_ids:
            item = record_map[did]
            item["rrf_score"] = round(rrf_scores[did], 5)
            
            # Enrich site if content_type is site
            if item["content_type"] == "site":
                site_sql = text("SELECT slug, latitude, longitude, era, dynasty FROM sites WHERE id = :sid")
                s_row = (await self.db.execute(site_sql, {"sid": item["content_id"]})).fetchone()
                if s_row:
                    item["slug"] = s_row.slug
                    item["latitude"] = s_row.latitude
                    item["longitude"] = s_row.longitude
                    item["era"] = s_row.era
                    item["dynasty"] = s_row.dynasty
                    item["has_3d"] = True if "vav" in item["slug"] else False

            results.append(item)
            c_type = item["content_type"]
            if c_type in grouped:
                grouped[c_type].append(item)
            else:
                grouped.setdefault(c_type, []).append(item)

        return {
            "query": query,
            "total": len(results),
            "results": results,
            "grouped": grouped
        }

    async def ask_archive(self, query: str) -> dict[str, Any]:
        """
        Retrieval-Augmented Generation (RAG) over the heritage archive with inline citations.
        Refuses to hallucinate when no verified records match.
        """
        search_res = await self.hybrid_search(query, limit=5)
        top_context = search_res.get("results", [])
        answer_data = await self.llm_provider.generate_response(query, top_context)
        return {
            "query": query,
            "answer": answer_data["answer"],
            "citations": answer_data["citations"],
            "confidence": answer_data["confidence"]
        }
