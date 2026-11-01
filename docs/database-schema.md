# Dharohar Atlas: Database Schema & Indexing Strategy (M1 Release)

## 1. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    SITES ||--o{ SITE_MEDIA : has
    SITES ||--o{ MODELS_3D : contains
    SITES ||--o{ FOLKLORE_ITEMS : remembers
    SITES ||--o{ ARCHITECTURAL_OBSERVATIONS : documents
    SITES ||--o{ ROUTE_STOPS : visited_in
    SITES ||--o{ SITE_TAGS : categorized_by
    SITES ||--o{ SITE_DYNASTIES : ruled_by
    TAGS ||--o{ SITE_TAGS : references
    DYNASTIES ||--o{ SITE_DYNASTIES : references
    ROUTES ||--o{ ROUTE_STOPS : sequences
    MODELS_3D ||--o{ HOTSPOTS : annotates

    SITES {
        uuid id PK
        string slug UK
        string name
        string name_hi
        string name_gu
        string site_type "Enum: stepwell, fort, temple, mosque, palace, tomb, archaeological_site, haveli, other"
        string state
        string district
        geography location "Point, 4326 (GiST Indexed)"
        float latitude
        float longitude
        int period_start_year "Negative = BCE"
        int period_end_year "Negative = BCE"
        string era_label
        string data_confidence "Enum: verified, likely, unverified"
        text source_text
        string source_url
        datetime created_at
        datetime updated_at
        datetime deleted_at "Soft delete filter"
    }

    SITE_MEDIA {
        uuid id PK
        uuid site_id FK
        string url
        string thumbnail_url
        string media_type "Enum: photo, drawing, archival_scan"
        string caption
        string attribution
        string licence
        string source_url
        bool is_primary
    }

    TAGS {
        uuid id PK
        string slug UK
        string name
        string category
    }

    SITE_TAGS {
        uuid site_id PK,FK
        uuid tag_id PK,FK
    }

    DYNASTIES {
        uuid id PK
        string slug UK
        string name
        int period_start_year
        int period_end_year
        string region
    }

    SITE_DYNASTIES {
        uuid site_id PK,FK
        uuid dynasty_id PK,FK
    }

    ROUTES {
        uuid id PK
        string slug UK
        string title
        text summary
        string region
        string estimated_duration
        string difficulty
        int total_stops
        geometry path_geometry "LineString, 4326"
    }

    ROUTE_STOPS {
        uuid id PK
        uuid route_id FK
        uuid site_id FK
        int stop_order
        text arrival_notes
        string suggested_duration
    }
```

---

## 2. High-Performance Geospatial & Full-Text Indexing Strategy

1. **PostGIS GiST Spatial Index on Geography:**
   ```sql
   CREATE INDEX idx_sites_location 
   ON sites 
   USING gist (location);
   ```
   Enables lightning-fast bounding box viewport queries (`ST_Intersects`) and distance-based clustering calculations (`ST_SnapToGrid`, `ST_ClusterDBSCAN`) across millions of coordinate pairs.

2. **Trigram GIN Indexes for Fuzzy Multilingual Matching:**
   ```sql
   CREATE INDEX idx_sites_name_trgm ON sites USING gin (name gin_trgm_ops);
   CREATE INDEX idx_sites_name_hi_trgm ON sites USING gin (name_hi gin_trgm_ops);
   CREATE INDEX idx_sites_name_gu_trgm ON sites USING gin (name_gu gin_trgm_ops);
   ```
   Enables sub-millisecond substring matching across Romanized, Devanagari, and Gujarati characters.

3. **Compound B-Tree Filter Indexes:**
   ```sql
   CREATE INDEX idx_sites_state_type ON sites (state, site_type);
   CREATE INDEX idx_sites_period_years ON sites (period_start_year, period_end_year);
   CREATE INDEX idx_sites_confidence ON sites (data_confidence);
   CREATE INDEX idx_sites_deleted_at ON sites (deleted_at);
   ```

4. **Integrity & Check Constraints:**
   ```sql
   ALTER TABLE sites ADD CONSTRAINT check_period_years 
   CHECK (period_start_year IS NULL OR period_end_year IS NULL OR period_start_year <= period_end_year);

   ALTER TABLE sites ADD CONSTRAINT check_coordinates 
   CHECK (latitude BETWEEN -90.0 AND 90.0 AND longitude BETWEEN -180.0 AND 180.0);
   ```
