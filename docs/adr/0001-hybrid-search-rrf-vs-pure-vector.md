# ADR 001: Hybrid Search via Reciprocal Rank Fusion (RRF) over Pure Vector Search

## Status
Accepted

## Context
Heritage archives contain heterogeneous data: exact epigraphic strings (e.g. Sanskrit terms like "दशावतार", "वापी", "સંવત ૧૫૫૫"), phonetic approximations in English, and conceptual natural-language descriptions. Pure dense vector embeddings excel at broad conceptual thematic search (e.g., "medieval royal stepwell with subterranean carvings") but frequently miss exact epigraphic numbers, regnal dates, and rare Sanskrit architectural nomenclature. Conversely, pure keyword search fails on synonyms and cross-lingual conceptual queries.

## Decision
We implemented a hybrid search engine in PostgreSQL combining:
1. Dense vector similarity search using `pgvector` with HNSW cosine distance indexing (`vector_cosine_ops`).
2. Lexical trigram and full-text matching using `pg_trgm`.
3. Reciprocal Rank Fusion (RRF) ranking algorithm with parameter $k=60$:
   $$RRF(d) = \sum_{m \in M} \frac{1}{60 + r_m(d)}$$

## Consequences
- **Positive:** Achieved 100.0% Recall@5 across 20 benchmarked queries covering English, Hindi transliteration, and technical architectural terminology.
- **Positive:** Zero external search service dependency (no Elasticsearch or Pinecone required).
- **Trade-off:** Requires dual index maintenance (`gin` trigram index + `hnsw` vector index), adding ~15% write overhead on ingest.
