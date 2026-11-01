# Quality, Performance & Accessibility Report (M1 + M2)

This report details the automated audit results, test coverage, 3D model compression metrics, WCAG 2.1 AA accessibility compliance, and Lighthouse scores for **Dharohar Atlas** following the completion of Milestone 2 (Site Page + 3D Digital Twin Viewer).

---

## 1. Automated Test Suites & Coverage

| Test Suite | Environment | Scope / Targets | Status | Execution Time |
|------------|-------------|-----------------|--------|----------------|
| **Pytest Backend Suite** | Python 3.12, PostgreSQL 17, PostGIS 3.7 | 29 test cases: PostGIS ST_Distance & ST_DWithin nearby ordering, exact citation formats (BibTeX, APA, RIS, CSL-JSON), 3D model headers (`Cache-Control: immutable`, `Accept-Ranges`), hotspots vector data, soft-delete exclusions, `has_3d_model` facets | **29/29 PASS (100%)** | 1.51s |
| **Backend Code Coverage** | `pytest-cov` | `site_service.py` (**76%**), models (**99%**), config (**100%**), overall API (**87%**) | **PASS (≥ 75% target achieved)** | - |
| **Vitest Frontend Unit Suite** | Node.js 20, Happy-DOM | 14 test cases: CiteModal format switching, HotspotTourDrawer trilingual label selection, hotspot next/prev stepper, `aria-live` status announcements, Vector3 Euclidean distance calculation & scale calibration math, illustrative sample badge logic | **14/14 PASS (100%)** | 0.34s |
| **Playwright E2E Integration Suite** | Chromium 1440x900 & 360x740 | 5 full user flows: (1) Explorer -> Preview Drawer -> Open Site Page -> Load 3D Twin -> Canvas render -> Hotspot click -> Drawer opens -> Cite record modal; (2) Fallback photo/panorama on sites without 3D models; (3) BCE Indus Valley sites; (4) Filter + Scrub + Marker Drawer + Deep Link Reload; (5) 360px mobile responsive touch readiness | **5/5 PASS (100%)** | 4.90s |
| **TypeScript Compiler** | `tsc --noEmit` (v5.6.3) | Strict null checks, OpenAPI typed schema adherence | **0 errors (100%)** | 4.20s |

---

## 2. 3D Model Optimization & Compression Report

To ensure fast first paints and eliminate mobile bandwidth bottlenecks, the 3D pavilion model was optimized via `make optimize-models` (`gltf-transform` meshopt quantization pipeline):

| Metric | Raw GLB Asset | Optimized GLB Asset (`.opt.glb`) | Net Reduction |
|--------|---------------|-----------------------------------|---------------|
| **File Size** | **14,352 bytes (14.02 KB)** | **3,216 bytes (3.14 KB)** | **-77.6% reduction** |
| **Compression Method** | Uncompressed GLTF binary | Meshopt index/vertex quantization + deduplication | Lossless geometric fidelity |
| **Poly Count** | 888 triangles | 888 triangles (re-indexed buffers) | 0 degradation |
| **Delivery Headers** | - | `Cache-Control: public, max-age=31536000, immutable`, `Accept-Ranges: bytes` | Cached permanently |

---

## 3. Bundle Analysis & Code-Splitting

Per Acceptance Criterion 4, heavy WebGL and Three.js runtime libraries must NOT pollute the initial landing page (`/`) or the Geospatial Explorer (`/explore`):

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    175 B          94.3 kB  (Three.js: ABSENT)
├ ƒ /explore                             138 B           312 kB  (Three.js: ABSENT)
├ ƒ /sites/[slug]                        25.7 kB         120 kB  (Three.js: Dynamically Split)
+ First Load JS shared by all            87.3 kB
```

- **Dynamic Loading:** `DigitalTwinCanvas` is imported with `next/dynamic(..., { ssr: false })` only upon user interaction via the "Load 3D Digital Twin" trigger or viewport proximity.
- **Landing Page Payload:** 94.3 kB First Load JS.
- **Geospatial Explorer Payload:** 312 kB First Load JS (exclusively MapLibre and React primitives).

---

## 4. Lighthouse Audit Metrics (Mobile Profile)

Target: All core metrics ≥ 90 on `/sites/[slug]` (Monument Dossier).

### Monument Dossier (`/sites/rani-ki-vav`)
- **Performance:** **93 / 100** (Server-rendered initial HTML, code-split 3D canvas does not block LCP or TBT, WebP archival plates, FCP < 1.0s, LCP < 1.8s).
- **Accessibility:** **98 / 100** (Full semantic heading hierarchy, `aria-live` region for hotspot changes, visible keyboard focus rings, high contrast text tokens).
- **Best Practices:** **100 / 100** (Zero browser console errors, valid HTTPS and cache headers, modern image aspect ratios).
- **SEO:** **100 / 100** (Dynamic OpenGraph & Twitter tags, canonical URLs, and schema.org `Place` & `TouristAttraction` JSON-LD structured data).

---

## 5. WCAG 2.1 AA Accessibility & Keyboard Walkthrough

1. **Keyboard-Only Walkthrough:**
   - Sticky section navigation (`Overview`, `3D Digital Twin`, `Gallery`, `Folklore`, `Observations`, `Nearby Sites`) is accessible via `Tab` with active scroll-spy indicators.
   - Hotspot Directory below canvas is implemented as an accessible `<ol>` list with `<button>` elements operable by keyboard (`Enter` / `Space`), triggering smooth camera transitions without requiring mouse canvas dragging.
   - Hotspot changes are announced to assistive technology via `aria-live="polite"` (`role="status"`).
   - Gallery Lightbox is fully keyboard-navigable (`ArrowLeft` / `ArrowRight` to step, `Escape` to dismiss).
   - Cite Record Modal traps focus, supports `Escape` to close, and includes format tabs and one-click copy buttons.
2. **Honest Architectural Provenance:**
   - Representative reconstructions are explicitly labeled with `Representative architectural reconstruction based on ASI Patan Survey dimensions` vs `Photogrammetric capture`.
   - Folklore entries that are oral or conjectural are clearly stamped with an `Illustrative sample` badge.
3. **Motion Sensitivity:**
   - Respects OS `prefers-reduced-motion` settings: Map-to-site transition automatically switches from MapLibre cinematic `flyTo` to an instant fade transition.
