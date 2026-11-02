# ADR 0008: Hosted Vision-LLM OCR vs Tesseract vs TrOCR: Accuracy, Cost, Offline Use, and the Adapter Strategy

## Status
Accepted

## Context
Indian heritage archives present acute epigraphical and document digitization challenges:
1. **Multi-script and multi-lingual folios:** Historical inscriptions, palm-leaf folios, copper plates, and British colonial monographs blend Classical Sanskrit (Devanagari), Old Gujarati, Prakrit, and English typography.
2. **Degraded and complex layouts:** Stone inscriptions exhibit erosion, chipped ligatures, and irregular line baseline variations; archival manuscripts contain diacritics (matras), conjunct consonants, and marginal annotations that trip conventional OCR word-segmenters.
3. **Operational divergence:** Field surveys and museum scanning stations often operate air-gapped without cloud connectivity, requiring offline OCR. Conversely, large-scale cloud processing demands state-of-the-art vision recognition with bounding box extraction.
4. **Economic sustainability:** Multi-modal commercial LLM calls incur token costs ($0.001 - $0.005 per page) and latency (1.5s - 4.0s), whereas open-source OCR runs in ~0.2s at zero marginal cost.

We evaluated three potential technical paths:
- **Hosted Vision-LLMs (Gemini 2.5 Flash / Omni Flash):** Zero-shot comprehension of Devanagari and Gujarati, natural bounding-box output, robust handling of weathered surfaces and mixed typography, but requires API access and cost controls.
- **Tesseract 5 (with `hin`, `guj`, `san`, `mar`, `eng` traineddata):** Standard open-source baseline, zero network overhead, fully offline and air-gapped, but prone to high Character Error Rates (CER 45-65%) on complex Indic conjuncts and historical fonts.
- **TrOCR / Indic OCR Transformers (Hugging Face / IndicOCR):** High accuracy on handwriting and historical scripts, but requires GPU instances (2-4 GB VRAM per worker), complex PyTorch dependencies, and high deployment weight.

## Decision
We implemented a polymorphic **Provider Adapter Architecture** (`OCRProvider`) with pluggable backends:

```
                  ┌──────────────────────┐
                  │   OCRProvider ABC    │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────┴────────────────┐ ┌────┴───────────────┐ ┌─────┴───────────────┐
│  GeminiVisionOCR    │ │   TesseractOCR     │ │      FakeOCR        │
│ (Primary Cloud)     │ │ (Local / Offline)  │ │ (CI / Unit Tests)   │
└─────────────────────┘ └────────────────────┘ └─────────────────────┘
```

1. **GeminiVisionOCR (Primary Cloud Provider):**
   - Prompts multi-modal Gemini with strict structured JSON schema returning normalized bounding boxes (`[ymin, xmin, ymax, xmax]` normalized to 0-1), Unicode NFC text, script identification, and confidence estimates.
   - Includes automatic JSON schema validation with Pydantic, retry logic for truncated JSON, and boundary clamping.
2. **TesseractOCR (Open-Source / Offline Fallback):**
   - Invokes `pytesseract.image_to_data` with language hints (`hin+guj+san+mar+eng`), PSM 3/6, and converts word bounding boxes into merged line-level bounding boxes with computed confidence.
   - Enforces Unicode NFC normalization and Devanagari/Gujarati matra-fix heuristics in post-processing.
3. **TrOCR (Documented P1 Interface):**
   - Defined abstract hook for transformer encoder-decoder vision models, deferred to separate GPU worker service to maintain lightweight API image.
4. **FakeOCR (Deterministic Testing Provider):**
   - Generates predictable multilingual OCR line boxes and confidences for unit tests, CI test suites, and offline integration verification in under 5 milliseconds.

## Consequences
- **Positive:** System runs identically in CI environments without external API keys or cloud dependencies.
- **Positive:** Air-gapped museum deployments can run entirely on local CPU via `TesseractOCR`.
- **Positive:** Cloud production deployments benefit from state-of-the-art transcription via `GeminiVisionOCR`.
- **Trade-off:** Evaluated Tesseract performance on historical Indic scripts reflects higher baseline CER (45-64%) without domain fine-tuning; human-in-the-loop correction and versioning are critical when using local engines.
