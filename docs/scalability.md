# Dharohar Atlas: Scalability & High-Throughput Architecture

## 1. Scaling to 100,000+ Cultural Heritage Sites

### 1.1 Vector Tile Pipeline (MVT / PBF)
Direct GeoJSON transmission degrades browser frame rates when rendering > 5,000 monuments. For 100k+ sites, Dharohar Atlas uses Mapbox Vector Tiles (MVT) generated directly in PostgreSQL via `ST_AsMVT`:
- Bounding-box requests query only the tiles visible in the current viewport.
- Server-side spatial clustering (`ST_ClusterKMeans` or Supercluster) groups regional monuments at low zoom levels, expanding into individual stepwells and temples at high zoom.

### 1.2 HNSW Index Tuning & Vector Quantization
At 100k+ vector embeddings (768 dimensions), memory footprint is optimized via:
- **HNSW Parameters:** `m = 16` and `ef_construction = 64` balancing recall against RAM consumption.
- **Half-Precision (fp16) or Scalar Quantization:** Reduces vector storage by 50% with < 1% recall loss.
- **Partitioned Vector Tables:** Partitioning the `embeddings` table by `content_type` (`site`, `ocr_line`, `folklore`) narrows scan scopes.

---

## 2. 3D Digital Twin Delivery & Optimization

1. **Draco / Meshopt Compression:**
   Original photogrammetry meshes (50–100MB) are compressed to 1.5–3MB binary GLB files using Google Draco geometric encoding, reducing network transfer times by 95%.
2. **Level of Detail (LOD) Hierarchies:**
   Three geometric tiers:
   - **LOD0 (High):** 50,000 polygons for close-up hotspot inspection.
   - **LOD1 (Medium):** 12,000 polygons during active camera rotation.
   - **LOD2 (Low / Bounding Box):** 2,000 polygons for mobile devices.
3. **Edge Caching via Global CDN:**
   Static 3D GLB assets are cached with immutable `Cache-Control: public, max-age=31536000, immutable` headers on Cloudflare / CloudFront edges.

---

## 3. High-Concurrency API & Redis Caching

1. **Hot Query Caching:**
   Frequent searches (e.g. "Solanki", "Rani ki Vav") and site dossier payloads are cached in Redis with a 1-hour TTL, serving requests in < 2ms.
2. **Stateless Horizontal API Scaling:**
   FastAPI instances are completely stateless and containerized, enabling automatic horizontal pod autoscaling (HPA) on Kubernetes or serverless containers (Railway/Fly.io/Cloud Run).
3. **Presigned Direct-to-Storage Uploads:**
   Large photo dumps (≥ 20 images) bypass the API server entirely, uploading directly to S3 / Supabase Storage via presigned HMAC-SHA256 URLs to protect API worker bandwidth.
