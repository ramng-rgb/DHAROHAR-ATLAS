# ADR 004: Binary glTF 2.0 (GLB) with PBR Materials for Web Digital Twins

## Status
Accepted

## Context
Interactive 3D digital twins of subterranean stepwells and fortresses must run smoothly across mobile browsers, low-bandwidth museum tablets, and desktop workstations without requiring high-end discrete GPUs. While 3D Gaussian Splatting (.splat/.ply) offers photorealistic novel view synthesis, current web renderers consume excessive VRAM (1.5GB+), suffer from high transfer sizes (50MB–200MB per capture), and lack built-in geometric mesh primitives required for spatial measurement caliper tools and collision raycasting.

## Decision
We selected Binary glTF 2.0 (`.glb`) as the primary digital twin standard, enhanced with:
- Standard PBR (Physically Based Rendering) sandstone materials (`metallicFactor: 0.05`, `roughnessFactor: 0.82`).
- Embedded spatial hotspot coordinates and normal vectors.
- Raycasting-compatible surface triangles enabling interactive metric caliper distance measurement.
- Draco / meshopt geometry compression for transfer sizes < 2MB.

For the photo-to-3D pipeline, the asynchronous worker outputs standardized GLB assets and exposes a pre-processed demo asset fallback when GPU CUDA resources are unavailable.

## Consequences
- **Positive:** Guaranteed 60 FPS performance on mobile and desktop web browsers via React Three Fiber.
- **Positive:** Accurate metric measurement tool capabilities between any two surface points.
- **Trade-off:** Point-cloud and Gaussian splat formats remain experimental secondary view options rather than the primary asset standard.
