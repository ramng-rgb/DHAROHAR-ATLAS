# ADR 0010: Hybrid Multilingual Retrieval: Unified PostgreSQL (pgvector HNSW + FTS + Trigram with RRF) vs. Dedicated Vector Database

## Status
Accepted

## Context
Dharohar Atlas indexes a diverse, heterogeneous cultural heritage corpus spanning 5 distinct source types:
1. **Architectural Sites:** Monograph summaries, historical dynastic contexts, and architectural taxonomy.
2. **Document Transcripts:** Epigraphic inscriptions and archival texts in Sanskrit, Prakrit, Old Gujarati, and English with exact line ranges.
3. **Translations:** English and Indic translations of archival folios.
4. **Folklore & Oral Traditions:** Folk memories, architectural legends, and local narratives.
5. **Epigraphic & Structural Observations:** Physical condition assessments, mason marks, and hydrology data.

Our retrieval requirements are exacting:
- **Multilingual Support:** Queries can be submitted in English, Hindi (Devanagari script), Gujarati script, or romanised Hindi/Gujarati.
- **Exact Name & Typological Recall:** Queries often contain specific dynastic names (e.g., "Solanki", "Chaulukya", "Rudabai"), architectural terms ("torana", "mandapa", "kund", "vav"), or date ranges ("1063 CE", "Samvat 1555"). Vector-only models frequently suffer from semantic drift or fail on rare Sanskritised proper nouns.
- **Conceptual & Thematic Discovery:** Queries such as "water harvesting structures dedicated to queens" require semantic embeddings that map conceptually across languages.
- **Filter Synchronisation:** Search results must enforce identical spatial, temporal (era/year), and taxonomy filters as the Map Explorer without distributed state synchronisation bugs.

## Decision
We implemented a **unified, multi-channel hybrid retrieval engine inside PostgreSQL 16** combining three complementary retrieval channels fused via **Reciprocal Rank Fusion (RRF with $k=60$)**:

```
                       User Search Query ("વાવ / stepwell solanki")
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
          Channel 1: Vector   Channel 2: FTS    Channel 3: Trigram
           (pgvector HNSW)     (tsvector FTS)      (pg_trgm word)
           Cosine Distance     unaccent simple    fuzzy similarity
                   │                  │                  │
               Top-K (20)         Top-K (20)         Top-K (20)
                   └──────────────────┬──────────────────┘
                                      ▼
                        Reciprocal Rank Fusion (k=60)
                         RRF = Σ 1 / (60 + rank_i)
                                      │
                                      ▼
                        Domain & Metadata Boosting
                        - Exact Name Match Boost (1.3x)
                        - Epigraphic Verified Boost (1.1x)
                                      │
                                      ▼
                         Grouped Faceted Response
                   [ Sites | Documents | Folklore | Observations ]
```

### 1. The Three Retrieval Channels
1. **Semantic Vector Search (pgvector HNSW):**
   - 768-dimensional normalized unit vectors indexed via Hierarchical Navigable Small World (`vector_cosine_ops`, `m=16`, `ef_construction=64`).
   - Captures cross-lingual semantic intent across Hindi, Gujarati, and English.
2. **Full-Text Keyword Search (PostgreSQL FTS):**
   - Stored generated `tsvector` column utilizing `simple` dictionary and an immutable wrapper over `unaccent()`.
   - Tokenizes Indic and romanised words without aggressive English-only stemming that corrupts Indic root words.
3. **Fuzzy Trigram Matching (`pg_trgm`):**
   - Trigram GIN index with `word_similarity(:q, text) > 0.35` on names and chunk text.
   - Tolerates OCR typos, variant transliterations (e.g. "Vav", "Baoli", "Baori"), and historical spelling variations.

### 2. Reciprocal Rank Fusion (RRF)
Rather than tuning fragile linear weight combinations between unbounded cosine distances and BM25 scores, we apply Reciprocal Rank Fusion:
$$\text{RRF Score}(d) = \sum_{c \in \text{Channels}} \frac{1}{60 + \text{rank}_c(d)}$$

RRF is parameter-free, scale-invariant, and guarantees that documents appearing high in multiple retrieval lists are prioritized without score normalization distortion.

### 3. Unified PostgreSQL vs. Dedicated Vector Database (Qdrant / Milvus / Pinecone)

| Architecture Dimension | Unified PostgreSQL (Chosen) | Dedicated Vector DB (e.g., Qdrant) |
|---|---|---|
| **Transactional Consistency** | **ACID guarantee:** Chunk creation/deletion is atomic with document/site changes. | Eventual consistency; requires dual-write and compensation logic. |
| **Relational Filtering** | **Zero latency overhead:** Joins directly with `sites`, `documents`, `states`, `years`. | Requires pre-filtering or payload replication and duplicate schemas. |
| **Operational Overhead** | **1 single database:** Backups, replication, and monitoring unified. | 2 distributed database clusters to provision, patch, and monitor. |
| **Query Latency (< 10K chunks)** | **p50: 9.4ms, p95: 13.9ms** on seeded dataset. | Network hop to external vector DB often adds 5-15ms alone. |
| **Indic Tokenization** | Leverages Postgres `pg_trgm` and `unaccent` natively. | Requires custom tokenizer or embedding-only matching. |

### 4. Scale-Out Path
While our current dataset (124 chunks across 25 sites and 67 documents) executes in <15ms, we have designed the scale-out trajectory for high-volume production:
1. **Read Replicas:** Route read-only search queries to PostgreSQL read replicas using streaming replication.
2. **Partitioning:** Partition `search_chunks` table by `source_type` or geographic region (`state`).
3. **pgvectorscale / DiskANN:** At 500K+ chunks, enable StreamingDiskANN or IVFFlat vector indexing to reduce RAM pressure.
4. **Dedicated Vector DB Offload Threshold:** If chunk count exceeds 5,000,000 chunks or vector query throughput requires >1,000 QPS, Qdrant can be introduced as an external retrieval channel fed into the existing RRF aggregator via the `EmbeddingProvider` abstraction.

## Consequences
- **Positive:** Measured empirical Recall@5 reached **92.0%** (vs 32.0% for keyword-only and 84.0% for vector-only), with MRR improving from 0.320 to **0.905**.
- **Positive:** Zero dual-write sync bugs; human-corrected OCR lines update the search index immediately in the same transaction.
- **Positive:** Developer experience is vastly simplified: local testing runs with Docker PostgreSQL and standard pytest.
- **Trade-off:** RAM sizing for PostgreSQL must allocate enough shared buffers to hold HNSW graph layers in memory for optimal latency at scale.
