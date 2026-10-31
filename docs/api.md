# Dharohar Atlas: REST API Reference

Base URL: `http://localhost:8000/api/v1`

---

## 1. Sites Endpoints

### `GET /sites`
Retrieve heritage sites with optional geospatial bounding box, timeline, and dynasty filters.

**Parameters:**
- `site_type` (string, optional): e.g. "Stepwell", "Fort", "Temple"
- `dynasty` (string, optional): e.g. "Solanki", "Rajput"
- `state` (string, optional): e.g. "Gujarat", "Rajasthan"
- `start_year` (int, optional): e.g. 1000
- `end_year` (int, optional): e.g. 1500
- `limit` (int, default: 100)
- `offset` (int, default: 0)

### `GET /sites/{slug}`
Retrieve full site detail dossier including media, 3D models, spatial hotspots, folklore, and observations.

### `GET /sites/{slug}/nearby`
Retrieve nearest neighboring heritage monuments within travel corridor (geodesic distance in km).

---

## 2. Search & RAG Endpoints

### `GET /search?q={query}`
Executes Reciprocal Rank Fusion (RRF) combining dense pgvector cosine similarity and trigram text matching.

**Response:**
```json
{
  "query": "Solanki stepwell",
  "total": 15,
  "results": [
    {
      "id": "...",
      "content_type": "site",
      "title": "Rani ki Vav (The Queen's Stepwell)",
      "text_snippet": "...",
      "rrf_score": 0.0328,
      "slug": "rani-ki-vav-patan",
      "has_3d": true
    }
  ]
}
```

### `POST /search/ask`
Retrieval-Augmented Generation (RAG) providing synthesized natural language answers with inline academic citations.

**Request:**
```json
{
  "query": "Who built Rani ki Vav?"
}
```

---

## 3. Documents & OCR Endpoints

### `GET /documents`
List all multilingual manuscript folios and stone inscriptions.

### `GET /documents/{id}`
Retrieve a specific document with pages, OCR lines (with bounding boxes), and extracted named entities.

### `PUT /documents/ocr-lines/{line_id}`
Human-in-the-loop revision endpoint for updating original script or English translation with automatic version incrementing.

---

## 4. Ingestion & Asynchronous Jobs

### `POST /ingest/photo-to-3d`
Upload photos for photogrammetric reconstruction. Returns `job_id`.

### `GET /ingest/jobs/{job_id}`
Poll job status (`queued`, `processing`, `completed`, `failed`) and progress percentage.
