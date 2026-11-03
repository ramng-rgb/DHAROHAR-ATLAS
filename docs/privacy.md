# Data Privacy, Hosted AI Boundary, and Air-Gapped Local Opt-Out

## 1. Overview and Core Philosophy
**Dharohar Atlas** handles culturally sensitive epigraphs, royal chronicles, community oral histories, and archival manuscripts from Indian heritage monuments. 

Our privacy architecture strictly separates **public cultural commons data** from **epigraphical ingest pipelines** and provides deterministic control over when data leaves self-hosted infrastructure.

---

## 2. Hosted AI Boundary: What Leaves Our Infrastructure?

When running in **Cloud / Hosted Mode** (configured via `OCR_PROVIDER=gemini`, `TRANSLATION_PROVIDER=gemini`, `EMBEDDING_PROVIDER=gemini`, and `LLM_PROVIDER=gemini`):

### What is sent to Google Cloud / Gemini APIs:
1. **Document Page Images (Temporary Ingest):**
   - High-resolution scan or crop of document pages sent as base64 / JPEG payload to the Gemini Vision API for bounding box extraction and transcription.
   - Images are processed in-flight according to Google Cloud Enterprise / Gemini API Data Governance policies (no training on customer data, no persistent storage in model weights).
2. **Text Segments for Translation & Entity Extraction:**
   - Raw transcription text and architectural glossary terminology sent for English translation and named entity tagging (places, dynasties, rulers, dates).
3. **Chunk Text for Multilingual Embeddings:**
   - Archival chunk paragraphs (monograph summaries, OCR line groupings, folklore entries) sent to `text-embedding-004` to generate 768-dimensional unit vector representations.
4. **Search Queries & Grounded RAG Context ("Ask the Archive"):**
   - The user's search question and retrieved archive context chunks are passed to the Gemini LLM strictly to synthesize a cited answer.
   - **Adversarial Sanitization:** Prompt delimiters and system control commands are stripped prior to transmission.

### What NEVER leaves our infrastructure:
- **User Authentication & Personal Identifiable Information (PII):** User accounts, IP addresses, session cookies, and internal user IDs are never sent to external AI providers.
- **Geospatial & Coordinate Databases:** Site coordinates, GIS boundary polygons, and database primary keys remain strictly in local PostGIS.
- **Audit Logs and Version History:** Epigraphical edits, human-in-the-loop reviewer identities, and revert timestamps in `text_versions` remain in local Postgres.
- **Raw Master Archives:** Master archival TIFFs and original uploaded binaries are stored directly in local storage buckets and served locally.

---

## 3. Telemetry & Query Logging Policy

To continuously evaluate retrieval quality without compromising user privacy, Dharohar Atlas maintains an analytics log table (`search_queries`):

### What is Logged:
- Normalized search query text (e.g., `"रानी की वाव"`, `"stepwell Solanki"`)
- Detected query script/language (`en`, `hi`, `gu`)
- Search filter parameters applied (e.g. `state: Gujarat`, `types: site,document`)
- Total retrieved hit count
- Total execution latency in milliseconds (`latency_ms`)
- Timestamp of query execution (`created_at`)

### What is NEVER Logged:
- IP addresses or geolocation headers
- User account IDs, emails, or authentication tokens
- Browser User-Agents or fingerprinting telemetry
- Unredacted personal names in non-heritage queries

---

## 4. Local Air-Gapped Mode: Zero External Network Calls

For archaeological surveys, museum conservation labs, government archives, or air-gapped field deployments where **zero external data egress** is permitted, Dharohar Atlas supports **100% On-Premise Execution**:

```bash
# Set in apps/api/.env or Docker environment:
OCR_PROVIDER=tesseract
TRANSLATION_PROVIDER=offline
EMBEDDING_PROVIDER=local       # multilingual-e5 or BGE-M3 (or 'fake' for deterministic CI)
LLM_PROVIDER=offline            # local Ollama / vLLM / llama.cpp or deterministic offline RAG
```

### Local Engine Guarantees:
1. **OCR via Tesseract 5:**
   - Runs locally on CPU/container using `pytesseract` and pre-downloaded language models (`tesseract-ocr-hin`, `tesseract-ocr-guj`, `tesseract-ocr-san`, `tesseract-ocr-eng`).
   - No internet access required; zero network packets transmitted.
2. **Translation via Local Rule & Glossary Engine:**
   - Architectural terms translated using local dictionary mapping and deterministic sentence templates.
3. **Local Vector Embeddings (`sentence-transformers`):**
   - Employs local open-source models (e.g., `BAAI/bge-m3` or `intfloat/multilingual-e5-base`) running in-process or in a local sidecar container.
4. **Local Question-Answering (RAG):**
   - Connects to an on-premise Ollama / vLLM instance or utilizes local extractive ranking.
5. **Deterministic Test / CI Mode (`fake`):**
   - Uses `FakeEmbeddingProvider` (deterministic 768-d unit vector generation) and `FakeLLMProvider`, requiring zero GPUs, zero network egress, and producing 100% reproducible test suites.

---

## 5. Privacy Audit Matrix

| Provider Mode | Data Sent Outside System | External Destination | Retention by External Party | Air-Gapped Compatible? |
|---------------|--------------------------|----------------------|------------------------------|------------------------|
| `OCR_PROVIDER=gemini` | Page Scan Images | Google Cloud Gemini API | Ephemeral (Session only; no training) | No |
| `OCR_PROVIDER=tesseract` | None | None (Runs in local container) | None | **Yes (100%)** |
| `TRANSLATION_PROVIDER=gemini` | Transcribed Text Lines | Google Cloud Gemini API | Ephemeral | No |
| `TRANSLATION_PROVIDER=offline` | None | None (Local glossary) | None | **Yes (100%)** |
| `EMBEDDING_PROVIDER=gemini` | Chunk Text Paragraphs | Google Cloud Gemini API | Ephemeral | No |
| `EMBEDDING_PROVIDER=local` / `fake` | None | None (Local CPU/Model) | None | **Yes (100%)** |
| `LLM_PROVIDER=gemini` | Grounded Prompt & Context | Google Cloud Gemini API | Ephemeral | No |
| `LLM_PROVIDER=offline` / `fake` | None | None (Local container) | None | **Yes (100%)** |

---

## 6. Security & Antivirus Hook
Uploaded documents pass through a file header magic-byte verification stage before rasterization or processing:
- Confirms actual file type matches declared MIME (`image/png`, `image/jpeg`, `image/webp`, `image/tiff`, `application/pdf`).
- Disallows executable formats, scripts, or polyglot files.
- Provides an extensible antivirus hook interface (`AntivirusValidator`) for integration with ClamAV in production deployments.
