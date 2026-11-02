# Data Privacy, Hosted AI Boundary, and Air-Gapped Local Opt-Out

## 1. Overview and Core Philosophy
**Dharohar Atlas** handles culturally sensitive epigraphs, royal chronicles, community oral histories, and archival manuscripts from Indian heritage monuments. 

Our privacy architecture strictly separates **public cultural commons data** from **epigraphical ingest pipelines** and provides deterministic control over when data leaves self-hosted infrastructure.

---

## 2. Hosted AI Boundary: What Leaves Our Infrastructure?

When running in **Cloud / Hosted Mode** (configured via `OCR_PROVIDER=gemini` and `TRANSLATION_PROVIDER=gemini`):

### What is sent to Google Cloud / Gemini APIs:
1. **Document Page Images (Temporary Ingest):**
   - High-resolution scan or crop of document pages sent as base64 / JPEG payload to the Gemini Vision API for bounding box extraction and transcription.
   - Images are processed in-flight according to Google Cloud Enterprise / Gemini API Data Governance policies (no training on enterprise customer data, no persistent storage in model weights).
2. **Text Segments for Translation & Entity Extraction:**
   - Raw transcription text and architectural glossary terminology sent for English translation and named entity tagging (places, dynasties, rulers, dates).

### What NEVER leaves our infrastructure:
- **User Authentication & Personal Identifiable Information (PII):** User accounts, IP addresses, session cookies, and internal user IDs are never sent to external AI providers.
- **Geospatial & Coordinate Databases:** Site coordinates, GIS boundary polygons, and database primary keys remain strictly in local PostGIS.
- **Audit Logs and Version History:** Epigraphical edits, human-in-the-loop reviewer identities, and revert timestamps in `text_versions` remain in local Postgres.
- **Raw Master Archives:** Master archival TIFFs and original uploaded binaries are stored directly in local S3/MinIO storage buckets and served locally.

---

## 3. Local Air-Gapped Mode: Zero External Network Calls

For archaeological surveys, museum conservation labs, government archives, or air-gapped field deployments where **zero external data egress** is permitted, Dharohar Atlas supports **100% On-Premise Execution**:

```bash
# Set in apps/api/.env or Docker environment:
OCR_PROVIDER=tesseract
TRANSLATION_PROVIDER=offline
LLM_PROVIDER=offline
```

### Local Engine Guarantees:
1. **OCR via Tesseract 5:**
   - Runs locally on CPU/container using `pytesseract` and pre-downloaded Debian/Alpine language models (`tesseract-ocr-hin`, `tesseract-ocr-guj`, `tesseract-ocr-san`, `tesseract-ocr-mar`, `tesseract-ocr-eng`).
   - No internet access required; zero network packets transmitted.
2. **Translation via Local Rule & Glossary Engine:**
   - Architectural terms (vav, baoli, torana, mandapa, garbhagriha, jharokha) translated using local dictionary mapping and deterministic sentence templates.
   - Optional local container integration for offline neural translation (e.g., IndicTrans2 / NLLB-200 ONNX runtime).
3. **Entity Extraction via Local Gazetteer:**
   - Rule-based regex and gazetteer matching against local PostGIS database (`sites`, `dynasties`, historical kings, and architectural types).
   - High precision, zero external inference.

---

## 4. Privacy Audit Matrix

| Provider Mode | Data Sent Outside System | External Destination | Retention by External Party | Air-Gapped Compatible? |
|---------------|--------------------------|----------------------|------------------------------|------------------------|
| `OCR_PROVIDER=gemini` | Page Scan Images | Google Cloud Gemini API | Ephemeral (Session only; no training) | No |
| `OCR_PROVIDER=tesseract` | None | None (Runs in local container) | None | **Yes (100%)** |
| `OCR_PROVIDER=fake` | None | None (Deterministic mock) | None | **Yes (100% CI)** |
| `TRANSLATION_PROVIDER=gemini` | Transcribed Text Lines | Google Cloud Gemini API | Ephemeral | No |
| `TRANSLATION_PROVIDER=offline` | None | None (Local glossary) | None | **Yes (100%)** |

---

## 5. Security & Antivirus Hook
Uploaded documents pass through a file header magic-byte verification stage before rasterization or processing:
- Confirms actual file type matches declared MIME (`image/png`, `image/jpeg`, `image/webp`, `image/tiff`, `application/pdf`).
- Disallows executable formats, scripts, or polyglot files.
- Provides an extensible antivirus hook interface (`AntivirusValidator`) for integration with ClamAV in production deployments.
