# Dharohar Atlas: Database Schema & Indexing Strategy (M1 + M2 Releases)

## 1. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    SITES ||--o{ SITE_MEDIA : has
    SITES ||--o{ MODELS_3D : contains
    SITES ||--o{ FOLKLORE_ITEMS : remembers
    SITES ||--o{ OBSERVATIONS : documents
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

    MODELS_3D {
        uuid id PK
        uuid site_id FK
        string format "Enum: glb, splat, ply"
        string storage_key
        int file_size_bytes
        int poly_count
        bool draco_compressed
        jsonb lod_levels
        string source "Enum: photogrammetry, scan, artist_made, stock"
        string licence
        string attribution
        string source_url
        bool scale_calibrated
        float scale_factor
        string status "Enum: pending, ready, failed"
        datetime created_at
    }

    HOTSPOTS {
        uuid id PK
        uuid model_id FK
        string label
        string label_hi
        string label_gu
        text body_md
        float[] position "vec3 [x, y, z]"
        float[] camera_position "vec3 [x, y, z]"
        float[] camera_target "vec3 [x, y, z]"
        uuid[] media_ids
        int sort_order
    }

    FOLKLORE_ITEMS {
        uuid id PK
        uuid site_id FK
        string title
        text body_md
        string language "Default: en"
        string kind "Enum: oral_history, myth, legend, ballad"
        string source
        string source_url
        string data_confidence "Enum: verified, likely, unverified"
        bool is_illustrative "Illustrative sample badge flag"
        datetime created_at
    }

    OBSERVATIONS {
        uuid id PK
        uuid site_id FK
        string title
        text body_md
        string language "Default: en"
        string kind "Enum: architectural_feature, masonry_technique, inscription, condition"
        string source
        string source_url
        string data_confidence "Enum: verified, likely, unverified"
        bool is_illustrative
        datetime created_at
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

## 2. High-Performance Geospatial, Foreign Key & Filter Indexing

1. **PostGIS GiST Spatial Index on Geography:**
   ```sql
   CREATE INDEX idx_sites_location ON sites USING gist (location);
   ```
   Enables lightning-fast bounding box viewport queries (`ST_Intersects`) and geodesic distance calculations (`ST_Distance`, `ST_DWithin`) for nearby monument trails.

2. **3D Models & Hotspots Relational Indexing:**
   ```sql
   CREATE INDEX ix_models_3d_site_id ON models_3d (site_id);
   CREATE INDEX ix_models_3d_status ON models_3d (status);
   CREATE INDEX ix_hotspots_model_id ON hotspots (model_id);
   CREATE INDEX ix_hotspots_sort_order ON hotspots (sort_order);
   ```

3. **Folklore & Field Observations Indexing:**
   ```sql
   CREATE INDEX ix_folklore_items_site_id ON folklore_items (site_id);
   CREATE INDEX ix_folklore_items_is_illustrative ON folklore_items (is_illustrative);
   CREATE INDEX ix_observations_site_id ON observations (site_id);
   CREATE INDEX ix_observations_is_illustrative ON observations (is_illustrative);
   ```

4. **Trigram GIN Indexes for Fuzzy Multilingual Matching:**
   ```sql
   CREATE INDEX idx_sites_name_trgm ON sites USING gin (name gin_trgm_ops);
   CREATE INDEX idx_sites_name_hi_trgm ON sites USING gin (name_hi gin_trgm_ops);
   CREATE INDEX idx_sites_name_gu_trgm ON sites USING gin (name_gu gin_trgm_ops);
   ```

5. **Compound B-Tree Filter Indexes:**
   ```sql
   CREATE INDEX idx_sites_state_type ON sites (state, site_type);
   CREATE INDEX idx_sites_period_years ON sites (period_start_year, period_end_year);
   CREATE INDEX idx_sites_confidence ON sites (data_confidence);
   CREATE INDEX idx_sites_deleted_at ON sites (deleted_at);
   ```
