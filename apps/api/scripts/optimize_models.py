#!/usr/bin/env python3
"""
3D Model Optimization Script using gltf-transform
Compresses GLB models with meshopt / Draco quantization and reports before/after sizes.
"""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = REPO_ROOT / "apps" / "web" / "public" / "models"

def optimize_models():
    if not MODELS_DIR.exists():
        print(f"Models directory not found: {MODELS_DIR}")
        return

    print("=== DHAROHAR ATLAS: 3D MODEL OPTIMIZATION PIPELINE ===")
    glb_files = list(MODELS_DIR.glob("*.glb"))
    # Filter out already optimized models
    target_files = [f for f in glb_files if not f.name.endswith(".opt.glb")]

    if not target_files:
        print("No source GLB models found to optimize.")
        return

    for src in target_files:
        opt_dst = src.with_suffix(".opt.glb")
        src_size = src.stat().st_size
        print(f"\nSource Model: {src.name} ({src_size / 1024:.2f} KB)")
        print(f"Target Optimized: {opt_dst.name}")

        cmd = [
            "npx", "-y", "@gltf-transform/cli", "optimize",
            str(src), str(opt_dst)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            if opt_dst.exists():
                opt_size = opt_dst.stat().st_size
                reduction_pct = ((src_size - opt_size) / src_size) * 100
                print(f"✓ Optimization Complete: {src_size / 1024:.2f} KB -> {opt_size / 1024:.2f} KB ({reduction_pct:.1f}% reduction)")
                print("Compression: meshopt index/attribute quantization + vertex deduping + scene flattening")
            else:
                print(f"Warning: Optimized file not produced: {res.stderr}")
        except subprocess.CalledProcessError as e:
            print(f"Error optimizing {src.name}: {e.stderr}", file=sys.stderr)

if __name__ == "__main__":
    optimize_models()
