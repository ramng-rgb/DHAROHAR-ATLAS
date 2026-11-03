# Data Protection, Privacy & Archive Sovereignty

## 1. Heritage Privacy Principles

Dharohar Atlas operates as a public cultural heritage repository. Unlike enterprise SaaS with private user records, the archive consists predominantly of public historical records, stone epigraphs, architectural monographs, and scholarly citations.

---

## 2. PII Minimization & Data Protection

- **Contributor Identities:** When registered contributors annotate or transcribe manuscripts, their identity is stored solely as a pseudonymous username and user ID.
- **Log Anonymization & Redaction:** All bearer tokens, passwords, and sensitive authorization headers are automatically masked via regex patterns in [logging_config.py](file:///Users/ramnarayangupta/Desktop/hac/apps/api/app/core/logging_config.py) before writing to stream.
- **No Third-Party Analytics Trackers:** The frontend does not bundle Google Analytics, Meta Pixel, or commercial tracking beacons.

---

## 3. Data Export & Archival Portability

Dharohar Atlas guarantees full scholarly and institutional portability:
1. **Plain Text Export:** `GET /api/v1/documents/{id}/export/txt` exports complete transcripts.
2. **Standard ALTO-XML / JSON Export:** `GET /api/v1/documents/{id}/export/alto` and `GET /api/v1/documents/{id}/export/json` export full spatial layout coordinates, bounding boxes, confidence scores, and architectural glosses.
3. **Scholarly Citation Formats:** `GET /api/v1/sites/{slug}/citation?format=bibtex|apa|ris|csl` provides standardized bibliographic citations.

---

## 4. Deletion & Right to Forget (Roadmap vs Present)

- **Soft Deletion (`deleted_at`):** All models (`Site`, `Document`, `OCRLine`, `DocumentPage`) enforce soft-deletion patterns. Soft-deleted entities are completely excluded from search indices, public routes, and GeoJSON viewports.
- **Hard Deletion / GDPR Eradication (ROADMAP):**
  - Institutional heritage guidelines require audit retention of epigraphic corrections. True hard-deletion of user accounts and associated edit history is scheduled for Roadmap post-v1.0 release.
