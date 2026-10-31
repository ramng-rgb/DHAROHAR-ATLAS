# Dharohar Atlas: Database Schema & Indexing Strategy

## 1. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    SITES ||--o{ SITE_MEDIA : has
    SITES ||--o{ MODELS_3D : contains
    SITES ||--o{ FOLKLORE_ITEMS : remembers
    SITES ||--o{ ARCHITECTURAL_OBSERVATIONS : documents
    SITES ||--o{ ROUTE_STOPS : visited_in
    SITES ||--o{ DOCUMENTS : mentions
    MODELS_3D ||--o{ HOTSPOTS : annotates
    DOCUMENTS ||--o{ DOCUMENT_PAGES : has
    DOCUMENT_PAGES ||--o{ OCR_LINES : transcribes
    DOCUMENT_PAGES ||--o{ DOCUMENT_ENTITIES : identifies
    ROUTES ||--o{ ROUTE_STOPS : sequences

    SITES {
        string id PK
        string name
        string slug UK
        string site_type
        string era
        int era_start_year
        int era_end_year
        string dynasty
        string state
        float latitude
        float longitude
        string data_confidence
    }

    MODELS_3D {
        string id PK
        string site_id FK
        string title
        string model_url
        string format
        int poly_count
    }

    OCR_LINES {
        string id PK
        string page_id FK
        int line_index
        float bbox_x
        float bbox_y
        float bbox_w
        float bbox_h
        text original_text
        text translated_text
        float confidence
        bool is_corrected
        int version
    }

    EMBEDDINGS {
        string id PK
        string content_type
        string content_id
        string title
        text text_snippet
        vector_768 embedding
    }
```

---

## 2. High-Performance Indexing Strategy

1. **pgvector HNSW (Hierarchical Navigable Small World) Index:**
   ```sql
   CREATE INDEX embeddings_hnsw_idx 
   ON embeddings 
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```
   Provides sub-5ms nearest-neighbor semantic vector retrieval across thousands of entries.

2. **Trigram GIN Indexes for Full-Text Lexical Matching:**
   ```sql
   CREATE INDEX sites_name_trgm_idx ON sites USING gin (name gin_trgm_ops);
   CREATE INDEX sites_desc_trgm_idx ON sites USING gin (description gin_trgm_ops);
   CREATE INDEX ocr_lines_trgm_idx ON ocr_lines USING gin (original_text gin_trgm_ops);
   ```
   Enables lightning-fast fuzzy matching on Sanskrit, Hindi, and English substrings.

3. **Spatial Bounding Box Coordinates:**
   Indexed on `latitude` and `longitude` for fast viewport queries on the map.
