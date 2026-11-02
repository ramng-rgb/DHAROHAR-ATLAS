# ADR 0009: Job Queue Design: Idempotency, Checkpoints, and Dead-Letter Queue (DLQ)

## Status
Accepted

## Context
Document ingestion and epigraphic processing involves multi-stage computationally intensive tasks:
1. Direct storage upload & file validation
2. Multi-page PDF rasterization (pypdfium2 / pdf2image)
3. Image computer vision preprocessing (deskew, denoise, adaptive binarization, DPI normalization)
4. Multi-engine OCR and layout analysis
5. Indic Unicode post-processing (NFC normalization, matra-repair, line re-ordering)
6. Heritage-glossary grounded machine translation
7. Named entity recognition, spatial gazetteer linking, and site linking
8. Status finalization (including `needs_review` scoring)

If a worker is killed mid-job (OOM, container restart, spot instance termination) or an external LLM rate-limit or network timeout occurs, starting over from the beginning wastes compute, duplicates database rows, and increases latency. Furthermore, repeatedly failing jobs must not block the queue indefinitely or corrupt document state.

## Decision
We implemented a resilient, checkpoint-resumable asynchronous pipeline orchestrator (`DocumentPipeline` and `Job` model):

```
[ Upload ] ──► [ Idempotency Check ] ──► [ Checkpoint: validate ]
                                                  │
                                         [ Checkpoint: render_pages ]
                                                  │
                                         [ Checkpoint: preprocess ]
                                                  │
                                         [ Checkpoint: ocr ]
                                                  │
                                         [ Checkpoint: translate ]
                                                  │
                                         [ Checkpoint: extract_entities ]
                                                  │
                                         [ Checkpoint: finalise ]
                                                  │
                                            ▼ (Success)
                                          [ Ready ]
                                    (or Needs Review if < conf)
```

1. **Idempotency Keys:**
   - Every background job carries a unique `idempotency_key` (derived from document ID, payload hash, or client token). Duplicate enqueue requests return the existing job.
2. **Per-Stage Checkpoints:**
   - The job execution state tracks completed stages in `job.stage` and `job.payload["completed_stages"]`.
   - If a job restarts after failure or process termination, the pipeline checks completed stages and resumes from the exact boundary:
     - If `render_pages` finished, existing `DocumentPage` records are reused without re-rendering.
     - If `ocr` finished, existing `OCRLine` rows are loaded without re-running OCR.
     - If `translate` finished, existing translations are preserved.
3. **Exponential Backoff and Retries:**
   - Temporary network failures or rate limits increment `job.attempts` and trigger exponential backoff retry schedules (`2^attempt * base_delay`).
4. **Dead-Letter Queue (DLQ):**
   - When a job exceeds maximum attempts (`attempts >= max_attempts`, default 3) or encounters a non-recoverable error (e.g. corrupt magic bytes), it transitions to status `dead`.
   - The document status is updated to `failed`, recording the root cause error in `job.error`.
   - Administrative endpoint (`POST /api/v1/jobs/{job_id}/requeue`) allows manual or programmatic replay of DLQ jobs once upstream issues are resolved.
5. **Real-time Server-Sent Events (SSE):**
   - The orchestrator broadcasts stage transitions and progress percentages (0-100%) to an in-memory pub-sub bus (`GET /api/v1/jobs/{job_id}/events`), driving live progress steppers in the frontend without polling.

## Consequences
- **Positive:** Worker termination test proves zero duplicate OCR lines or translations upon restart.
- **Positive:** Resumed jobs complete remaining stages in a fraction of the time.
- **Positive:** Poison-pill files fail gracefully into the DLQ without starving healthy jobs.
- **Trade-off:** Checkpoint code requires careful transactional isolation and idempotent database lookups in each stage runner.
