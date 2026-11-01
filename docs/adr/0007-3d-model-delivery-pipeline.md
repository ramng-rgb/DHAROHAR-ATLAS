# ADR 0007: 3D Delivery — GLB + Draco/Meshopt + Lazy-Loaded R3F vs. Managed Viewer vs. Gaussian Splats

**Date:** 2026-11-01  
**Status:** Accepted  
**Deciders:** Core Engineering Team  
**Milestone:** M2 (Site Page + 3D Digital Twin Viewer)

---

## 1. Context & Problem Statement

Heritage preservation documentation across Indian stepwells and citadels requires visualizing complex subterranean geometry, multi-level colonnades, and intricate stone reliefs. 

To deliver these digital twins to users on mobile 3G/4G connections and desktop browsers alike, we evaluated three architectural paradigms:
1. **Self-Hosted React Three Fiber (R3F) + three.js with Draco/Meshopt-compressed GLB**
2. **Third-Party Managed Viewers (e.g. Sketchfab iFrame embed, Google model-viewer)**
3. **Pure 3D Gaussian Splatting (3DGS / `.splat` / `.ply`) as primary delivery**

Key requirements:
- Zero initial bundle pollution on landing (`/`) and explore (`/explore`) routes (Lighthouse Mobile ≥ 90).
- Deep programmatic interactivity: HTML-anchored billboard hotspots with occlusion, smooth camera pose interpolation, lighting/sun-angle simulation for solar orientation in stepwells, measurement caliper, and screenshot watermarking.
- Offline and self-hosted capability without vendor lock-in or recurring third-party API costs.
- Transparent provenance metadata and academic calibration flags.

---

## 2. Decision & Architecture

We decided on **Self-Hosted React Three Fiber (R3F) + three.js with Meshopt/Draco-optimized GLBs and lazy-loaded dynamic imports**, with a modular upgrade path to Gaussian Splatting in Milestone M6:

### Key Technical Choices:
1. **Asset Pipeline (`make optimize-models`):**
   - Raw photogrammetric models are processed via `@gltf-transform/cli` with Meshopt index and attribute quantization.
   - Example achievement: `stepwell_pavilion.glb` reduced from **14.02 KB to 3.14 KB (-77.6% reduction)** without visual geometric degradation.
2. **Delivery & Caching:**
   - FastAPI serves 3D assets with `Cache-Control: public, max-age=31536000, immutable` and `Accept-Ranges: bytes` headers, allowing client-side HTTP range chunking.
3. **Lazy Bundle Isolation:**
   - The entire WebGL runtime is isolated behind `next/dynamic(() => import("./DigitalTwinCanvas"), { ssr: false })`.
   - The initial monument page renders a lightweight HTML poster with an interactive "Load 3D Digital Twin" trigger.
   - Result: `/sites/[slug]` First Load JS is only **120 kB**, and Three.js is completely absent from the initial bundle.
4. **Interactive Subterranean Capabilities:**
   - Drei `<Html>` billboard hotspot annotations with directional camera pose tweening.
   - Interactive 3D measurement caliper with Euclidean vector distance math and scale calibration warnings.
   - Configurable heritage lighting (Day, Dusk, Night) with real-time shadow casting and sun-angle rotation.

---

## 3. Comparison & Trade-Offs

| Dimension | R3F + Meshopt GLB (Chosen) | Managed Viewer (Sketchfab) | Pure Gaussian Splatting (`.splat`) |
|-----------|----------------------------|----------------------------|-----------------------------------|
| **First Load Impact** | **0 kB** (code-split) | ~500 kB iframe overhead | ~1.5 MB runtime + 15–50 MB splat |
| **Custom Interactivity** | **Full React state binding** (hotspots, tour stepper, calipers, light presets) | Limited iframe postMessage API | Limited annotation tooling; primarily point cloud visualization |
| **Self-Hosting / Vendor Independence** | **100% self-contained**, open-source | Vendor lock-in, commercial fees, telemetry | Self-hostable, but high GPU VRAM demand on mobile |
| **Mobile Performance** | **Fluid 60 FPS**, low memory footprint | Variable, high memory footprint | Prone to mobile WebGL OOM crashes on compact devices |
| **Photorealistic Textures** | Standard PBR / Baked diffuse textures | Proprietary viewer shaders | Superior non-Lambertian reflections and foliage |

---

## 4. Upgrade Path to M6 (Photo-to-3D Worker)

While Meshopt GLB serves as the reliable, production-tested delivery format for M2, Milestone M6 introduces an automated **Photo-to-3D Worker**:
- **Ingestion:** Asynchronous Celery/Redis queue accepts multi-angle archival photograph sets.
- **COLMAP + 3DGS Pipeline:** Generates both an optimized Gaussian Splat (`.splat`) and an extracted watertight textured mesh (`.glb`).
- **Unified Interface:** The `DigitalTwinShowpiece` architecture already accepts format enumeration (`glb | splat | ply`). When M6 is deployed, the same viewer component will switch to an `@mkkellogg/gaussian-splats-3d` or three.js Gaussian splatting pass when a `.splat` storage key is returned by the API.

---

## 5. Consequences

- **Positive:** Pristine Lighthouse mobile performance (≥ 90), zero external third-party dependencies, accessible screen-reader hotspot list fallback, instant model loading (< 100ms for 3.14 KB payload).
- **Negative:** Extremely detailed photogrammetric models with millions of triangles require offline decimation and texture baking prior to client upload. This is automated in M6.
