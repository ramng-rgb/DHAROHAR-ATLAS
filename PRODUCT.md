# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Archaeologists, epigraphists, architectural historians, cultural preservationists, researchers, museum curators, students, and heritage enthusiasts exploring India's monuments, stepwells, and ancient manuscripts.

## Product Purpose
Dharohar Atlas is an open-access, AI-augmented digital heritage preservation and exploration platform for Indian archaeological monuments, architectural stepwells/temples, and epigraphic manuscripts. Success means providing researchers and public visitors with accurate geospatial mapping, 3D photogrammetric digital twins, high-fidelity OCR transcription of multilingual ancient folios, and grounded, hallucination-resistant retrieval.

## Positioning
Unlike generic digital archives or surface-level tourist portals, Dharohar Atlas couples PostGIS geospatial indexing, real-time WebGL photogrammetric 3D digital twins, bilingual line-level OCR transcription alignment (Devanagari, Sanskrit, Gujarati), and Reciprocal Rank Fusion (pg_trgm + pgvector) RAG with strict academic citations.

## Operating Context
Scholarly research stations, museum kiosks, field laptops, and mobile exploration devices under varying lighting conditions. Demands a dark, lamp-lit sandstone aesthetic reminiscent of illuminated archaeological folios and subterranean stepwells.

## Capabilities and Constraints
- Geospatial clustering and bounding-box queries via PostGIS.
- 3D photogrammetric inspection via Three.js / React Three Fiber.
- Asynchronous manuscript ingestion, PyTesseract OCR, line-level transcription and translation.
- Grounded Q&A with Reciprocal Rank Fusion and source attribution.
- Interactive curated waypoint itineraries with animated maps.
- Strict input validation, role-based access, tiered rate limiting, zero unvetted dependencies.

## Brand Commitments
- Name: Dharohar Atlas ("Living Knowledge Layer for Indian Cultural Heritage")
- Aesthetic Voice: Lamp-lit sandstone monograph, illuminated manuscript folios, deep basalt/umber stone surfaces, refined gold leaf accents.
- Rejection of AI slop: No generic gradient text, no thick colored card borders (`border-l-4`), no tacky bounce animations, no nested card containers.

## Evidence on Hand
- Seed database of real Gujarat & Rajasthan ASI monuments (Rani ki Vav, Sun Temple Modhera, Dholavira Citadel, Adalaj Stepwell).
- Real archival folios in Sanskrit, Devanagari, and Gujarati.
- 3D GLTF/GLB models and architectural metadata.

## Product Principles
1. Heritage Truth Before Synthetic Flourish: Visuals and transcriptions must respect architectural and epigraphic precision.
2. Grounded Attribution: Every AI synthesis or translation must cite its source folio, inscription line, or monument survey.
3. Tactile Archaeological Materiality: Digital surfaces feel like carved sandstone, brass, and illuminated parchment—never generic flat SaaS.
4. Inclusive Scholarly Access: High contrast (WCAG AA), accessible typography, and performant execution across mobile and desktop.
