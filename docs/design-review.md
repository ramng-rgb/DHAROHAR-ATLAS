# Dharohar Atlas — Skeptical Staff Engineer Design Review & Capacity Analysis

**Reviewer:** Staff Infrastructure & Systems Engineer  
**Scope:** Architecture, Data Model, Scalability Bottlenecks, and Failure Modes  
**Status:** Rigorous Skeptical Audit (Issues Exposed Honestly, Not Hidden)

---

## 1. Top Ranked System Risks

| Rank | Risk Category | Specific Failure Scenario | Likelihood | Impact | Severity | Current Mitigation & Remaining Exposure |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **#1** | **External AI Provider Quota & Latency Spikes** | Gemini API rate limit (429) or regional outage during live judging or traffic spike freezes Ask-the-Archive and OCR pipeline. | **HIGH** | **HIGH** | **CRITICAL** | **Mitigation:** Adapter pattern with local heuristic/neural fallback and retry backoff. **Exposure:** Local fallbacks cannot match full frontier model reasoning quality. |
| **#2** | **Memory Pressure on pgvector HNSW Graph** | Unbounded growth in vector dimensions or high concurrency causing HNSW graph layers to page out of Postgres `shared_buffers` to NVMe disk, causing query latency degradation (10ms -> 300ms). | **MEDIUM** | **HIGH** | **HIGH** | **Mitigation:** Sizing shows Year 1 footprint is only ~220 MB, easily fitting in 1 GB RAM buffer. **Exposure:** Requires memory monitoring if scaling to > 500k chunks. |
| **#3** | **Long-Running Synchronous Connection Starvation** | Streaming Server-Sent Events (SSE) connections on `/api/v1/search/ask` or unindexed bounding box queries holding asyncpg connections open, exhausting the connection pool. | **MEDIUM** | **HIGH** | **HIGH** | **Mitigation:** Connection pooling with `pool_size=20, max_overflow=10`, strict request timeouts (30s max), and dedicated worker processes. |
| **#4** | **3D Asset & Image Egress Bandwidth Exhaustion** | Multiple concurrent clients loading 15MB GLB models and 2MB high-res manuscript scans simultaneously crashing single origin server or exceeding egress caps. | **HIGH** | **MEDIUM** | **HIGH** | **Mitigation:** Client-side progressive loading, GLB mesh compression, and public CDN edge caching headers (`Cache-Control: public, max-age=31536000, immutable`). |
| **#5** | **Human-in-the-Loop Line Correction Merge Conflicts** | Two researchers simultaneously editing the same epigraphic line on an inscription. | **LOW** | **MEDIUM** | **MEDIUM** | **Mitigation:** Optimistic UI concurrency with database timestamp verification and explicit revision history tracking (`edited_at`). |

---

## 2. Capacity & Sizing: Realistic Year 1 Back-of-the-Envelope Math

### 2.1 Baseline Assumptions for Year 1 Operation
- **Curated Heritage Sites:** 500 monuments and architectural stepwells.
- **Archival Manuscripts & Inscriptions:** 2,500 digitized records averaging 4 pages each = **10,000 document pages**.
- **Average OCR Lines per Page:** 15 lines $\rightarrow$ **150,000 epigraphic lines**.
- **Searchable Text Chunks:** ~4 chunks per page + 5 chunks per site monograph + folklore narratives = **~45,000 search chunks**.
- **User Traffic:** 10,000 unique visitors/day $\rightarrow$ ~60,000 daily pageviews.

---

### 2.2 Traffic & Peak Request Rates (RPS)
$$\text{Average RPS} = \frac{60,000 \text{ requests}}{86,400 \text{ seconds}} \approx 0.70 \text{ requests/sec}$$
Assuming a peak-to-average ratio of $5\times$ during academic announcements or peak daytime hours:
$$\text{Peak Public Read RPS} \approx 0.70 \times 5 = \mathbf{3.5 \text{ RPS}}$$
Assuming viral peak / hackathon judging load spike ($10\times$ surge):
$$\text{Surge Peak RPS} \approx \mathbf{35 \text{ RPS}}$$
- **Peak GeoJSON Viewport Queries:** 8–12 RPS (readily served from Postgres PostGIS index in < 15ms or Redis cache in < 2ms).
- **Peak Search & Ask Queries:** 2–5 RPS (hybrid RRF query executes in < 15ms).
- **Peak Ingestion Job Volume:** 50 document uploads/day (burst of ~200 pages/day processed asynchronously by Redis worker).

---

### 2.3 Database Footprint & Vector Sizing
1. **Search Chunks Table (`search_chunks`):**
   - 45,000 chunks $\times$ 1.2 KB text/metadata = **54 MB**
2. **Raw Vector Embeddings (768 dimensions $\times$ 4 bytes fp32):**
   $$45,000 \times 3,072 \text{ bytes} \approx \mathbf{138.2 \text{ MB}}$$
3. **HNSW Cosine Graph Index ($m=16, ef=64$):**
   $$45,000 \times 1.8 \text{ KB} \approx \mathbf{81.0 \text{ MB}}$$
4. **Relational Tables (Sites, Documents, Pages, Lines, Routes, Users):**
   - 500 sites $\times$ 10 KB = 5 MB
   - 10,000 pages $\times$ 2 KB = 20 MB
   - 150,000 OCR lines $\times$ 500 bytes = 75 MB
   - Route stops, folklore, logs, and indexes = ~150 MB
5. **Total Database Storage:**
   $$\text{Total DB Size} \approx 54 + 138.2 + 81.0 + 250 \approx \mathbf{523.2 \text{ MB}}$$
   *(Easily accommodated on any standard 5 GB–10 GB managed database plan with > 90% buffer headroom).*

---

### 2.4 Object Storage & Media Footprint
1. **Manuscript Folio Scans:**
   $$10,000 \text{ pages} \times 2.0 \text{ MB (WebP/JPEG)} = \mathbf{20.0 \text{ GB}}$$
2. **3D Photogrammetric Digital Twins:**
   $$500 \text{ sites} \times 15.0 \text{ MB (compressed GLB)} = \mathbf{7.5 \text{ GB}}$$
3. **Total Object Storage:**
   $$\text{Total Storage} = 20.0 + 7.5 = \mathbf{27.5 \text{ GB}}$$

---

## 3. Bottleneck Analysis: What Breaks First?

### Order of Bottlenecks Under Stress:
1. **First Bottleneck: External Cloud API Quotas (LLM / Vision):**
   - *Why:* Gemini 2.0 Flash or embedding endpoints enforce stringent requests-per-minute (RPM) and tokens-per-minute (TPM) limits on shared accounts. A burst of 10 concurrent document uploads will hit quota instantly if sent unthrottled.
   - *Defense:* Redis background queue with concurrency limiting (max 2 parallel extraction jobs), client-side retry with exponential backoff, and automatic fallback to PyTesseract / local embeddings.
2. **Second Bottleneck: Node.js / Python Origin Egress Bandwidth:**
   - *Why:* Streaming uncompressed 3D GLB models directly from the web container under 50 concurrent users would consume $50 \times 15\text{MB} = 750\text{MB}$ in seconds, saturating container network interfaces.
   - *Defense:* Strict CDN proxying (Vercel / Cloudflare edge cache) with `max-age=31536000, immutable` headers.
3. **Third Bottleneck: Database Connection Pool Exhaustion:**
   - *Why:* Asyncpg connections left unclosed during slow client SSE streams or connection drops.
   - *Defense:* Explicit connection pooling via pooler on port 6543, pool recycling every 300s, and connection checkout timeouts (< 5s).
