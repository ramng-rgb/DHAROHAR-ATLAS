# ADR 005: Optimistic Versioned Human-in-the-Loop Epigraphic Correction

## Status
Accepted

## Context
Automated OCR on medieval stone inscriptions and ancient manuscripts in Devanagari and Old Gujarati scripts contains inevitable errors due to surface weathering, stone flaking, and orthographic variations. If machine transcripts cannot be corrected, archaeological archives lose credibility. However, unversioned crowdsourced edits risk vandalism and historical inaccuracy.

## Decision
We implemented a versioned, audited human-in-the-loop revision pattern for OCR lines:
1. Each `OCRLine` maintains `is_corrected: Boolean`, `version: Integer`, and timestamp.
2. The UI exposes inline revision inputs on both the source script and English translation.
3. Submitting an edit updates the backend record, increments the version counter, flags the line as verified/corrected, and regenerates semantic vector embeddings for search ranking.
4. Historical edits are traceable in system audit logs.

## Consequences
- **Positive:** Enables domain epigraphists to correct machine misreadings directly on the scan.
- **Positive:** Corrected entries immediately propagate to the semantic search index and RAG engine.
- **Trade-off:** Requires optimistic UI state management to prevent edit latency.
