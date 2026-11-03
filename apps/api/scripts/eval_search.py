#!/usr/bin/env python3
import asyncio
import json
import os
import sys
import time

import numpy as np
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.search.embeddings import get_embedding_provider
from app.services.search.hybrid_search import HybridSearchEngine, normalize_query_text


async def evaluate_search():
    queries_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../eval/search/test_queries.json"))
    with open(queries_file, "r", encoding="utf-8") as f:
        queries = json.load(f)

    print("================================================================")
    print("Dharohar Atlas: Semantic Search Evaluation Benchmark (M4)")
    print(f"Evaluating {len(queries)} multilingual queries across EN, HI, and GU...")
    print("================================================================\n")

    embedding_provider = get_embedding_provider()

    async with AsyncSessionLocal() as session:
        engine = HybridSearchEngine(session, embedding_provider)

        modes = ["keyword_only", "vector_only", "hybrid_rrf"]
        metrics = {
            m: {
                "recall@5": [],
                "recall@10": [],
                "mrr": [],
                "latencies": []
            }
            for m in modes
        }

        for item in queries:
            q_text = item["query"]
            clean_q = normalize_query_text(q_text)
            expected_id = item.get("expected_site_id")
            is_negative = expected_id is None

            # 1. Hybrid Search
            t0 = time.perf_counter()
            hybrid_res = await engine.search(clean_q, limit=15)
            t_hybrid = (time.perf_counter() - t0) * 1000.0
            metrics["hybrid_rrf"]["latencies"].append(t_hybrid)

            # 2. Vector-Only Search
            t0 = time.perf_counter()
            q_vec = await embedding_provider.embed_text(clean_q)
            vec_str = "[" + ",".join(f"{x:.6f}" for x in q_vec) + "]"
            dense_sql = text("""
                SELECT site_id FROM search_chunks
                WHERE deleted_at IS NULL
                ORDER BY embedding <=> :q_vec ASC
                LIMIT 15
            """)
            dense_rows = (await session.execute(dense_sql, {"q_vec": vec_str})).fetchall()
            t_vector = (time.perf_counter() - t0) * 1000.0
            metrics["vector_only"]["latencies"].append(t_vector)

            # 3. Keyword-Only Search
            t0 = time.perf_counter()
            fts_sql = text("""
                WITH q AS (SELECT websearch_to_tsquery('simple', immutable_unaccent(:q)) as query_ts)
                SELECT site_id FROM search_chunks, q
                WHERE deleted_at IS NULL AND tsv @@ q.query_ts
                ORDER BY ts_rank_cd(tsv, q.query_ts) DESC
                LIMIT 15
            """)
            try:
                fts_rows = (await session.execute(fts_sql, {"q": clean_q})).fetchall()
            except Exception:
                fts_rows = []
            t_kw = (time.perf_counter() - t0) * 1000.0
            metrics["keyword_only"]["latencies"].append(t_kw)

            # Compute ranks for positive queries
            if not is_negative:
                # Hybrid
                hybrid_sites = [r.get("site_id") for r in hybrid_res.get("results", []) if r.get("site_id")]
                rank_h = hybrid_sites.index(expected_id) + 1 if expected_id in hybrid_sites else 0
                metrics["hybrid_rrf"]["recall@5"].append(1.0 if 0 < rank_h <= 5 else 0.0)
                metrics["hybrid_rrf"]["recall@10"].append(1.0 if 0 < rank_h <= 10 else 0.0)
                metrics["hybrid_rrf"]["mrr"].append(1.0 / rank_h if rank_h > 0 else 0.0)

                # Vector
                vec_sites = [str(r.site_id) for r in dense_rows if r.site_id]
                rank_v = vec_sites.index(expected_id) + 1 if expected_id in vec_sites else 0
                metrics["vector_only"]["recall@5"].append(1.0 if 0 < rank_v <= 5 else 0.0)
                metrics["vector_only"]["recall@10"].append(1.0 if 0 < rank_v <= 10 else 0.0)
                metrics["vector_only"]["mrr"].append(1.0 / rank_v if rank_v > 0 else 0.0)

                # Keyword
                kw_sites = [str(r.site_id) for r in fts_rows if r.site_id]
                rank_k = kw_sites.index(expected_id) + 1 if expected_id in kw_sites else 0
                metrics["keyword_only"]["recall@5"].append(1.0 if 0 < rank_k <= 5 else 0.0)
                metrics["keyword_only"]["recall@10"].append(1.0 if 0 < rank_k <= 10 else 0.0)
                metrics["keyword_only"]["mrr"].append(1.0 / rank_k if rank_k > 0 else 0.0)

        # Print Benchmark Table
        print("| Retrieval Mode | Recall@5 (%) | Recall@10 (%) | MRR | Latency p50 (ms) | Latency p95 (ms) |")
        print("|---|---|---|---|---|---|")
        results_summary = {}

        for mode, name in [
            ("keyword_only", "Keyword-Only (Postgres FTS)"),
            ("vector_only", "Vector-Only (pgvector HNSW)"),
            ("hybrid_rrf", "Hybrid Search (RRF k=60)")
        ]:
            r5 = float(np.mean(metrics[mode]["recall@5"]) * 100) if metrics[mode]["recall@5"] else 0.0
            r10 = float(np.mean(metrics[mode]["recall@10"]) * 100) if metrics[mode]["recall@10"] else 0.0
            mrr = float(np.mean(metrics[mode]["mrr"])) if metrics[mode]["mrr"] else 0.0
            p50 = float(np.percentile(metrics[mode]["latencies"], 50))
            p95 = float(np.percentile(metrics[mode]["latencies"], 95))

            results_summary[mode] = {
                "name": name,
                "recall_at_5": round(r5, 2),
                "recall_at_10": round(r10, 2),
                "mrr": round(mrr, 4),
                "latency_p50_ms": round(p50, 2),
                "latency_p95_ms": round(p95, 2)
            }
            print(f"| **{name}** | **{r5:.1f}%** | **{r10:.1f}%** | **{mrr:.4f}** | {p50:.2f}ms | {p95:.2f}ms |")

        out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../eval/search/results.json"))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(results_summary, f, indent=2)

        print(f"\nSaved empirical benchmark report to: {out_path}")

if __name__ == "__main__":
    asyncio.run(evaluate_search())
