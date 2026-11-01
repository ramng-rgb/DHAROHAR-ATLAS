"use client";

import React from "react";
import { Box, Sparkles, Eye, Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShowpiecePosterProps {
  siteName: string;
  posterImage: string;
  polyCount?: number;
  fileSizeBytes?: number;
  format?: string;
  hotspotsCount?: number;
  isLoading: boolean;
  loadProgress: number; // 0 to 100
  onLoad3D: () => void;
}

export function ShowpiecePoster({
  siteName,
  posterImage,
  polyCount = 888,
  fileSizeBytes = 3216,
  format = "glb",
  hotspotsCount = 5,
  isLoading,
  loadProgress,
  onLoad3D,
}: ShowpiecePosterProps) {
  const sizeKb = (fileSizeBytes / 1024).toFixed(1);

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] rounded-3xl overflow-hidden border border-[#D4AF37]/50 shadow-2xl bg-[#0F0C09] flex flex-col justify-between p-6 sm:p-10">
      {/* Background Poster Image with Subdued Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 scale-105"
        style={{
          backgroundImage: `url(${posterImage})`,
          filter: "brightness(0.35) saturate(1.2)",
        }}
        aria-hidden="true"
      />

      {/* Decorative Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" 
        aria-hidden="true"
      />

      {/* Top Badges */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1510]/80 border border-[#D4AF37]/50 backdrop-blur-md text-xs text-[#D4AF37] font-serif font-semibold">
          <Box className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Interactive 3D Digital Twin</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#EFE6D8] font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
          <span>{polyCount.toLocaleString()} Polygons</span>
          <span>•</span>
          <span className="text-emerald-400">{sizeKb} KB (Meshopt)</span>
          <span>•</span>
          <span>{hotspotsCount} Hotspots</span>
        </div>
      </div>

      {/* Central Action CTA */}
      <div className="relative z-10 max-w-xl mx-auto text-center space-y-4 my-auto">
        <div className="inline-block p-3 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] shadow-xl animate-bounce-slow">
          <Compass className="w-8 h-8" />
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
          Explore the Subterranean Architecture of {siteName}
        </h3>

        <p className="text-xs sm:text-sm text-[#D8C3A5] leading-relaxed max-w-md mx-auto">
          High-fidelity digital twin with annotated architectural hotspots, measurement calipers, and astronomical sun-angle simulation.
        </p>

        <div className="pt-2 flex flex-col items-center gap-3">
          {isLoading ? (
            <div className="w-64 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#D8C3A5] font-mono">
                <span>Loading 3D mesh...</span>
                <span>{Math.round(loadProgress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-[#D4AF37]/40">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3C649] transition-all duration-300"
                  style={{ width: `${Math.max(5, loadProgress)}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              id="load-3d-button"
              variant="primary"
              size="lg"
              onClick={onLoad3D}
              icon={<Sparkles className="w-4 h-4 text-[#1A1510]" />}
              className="px-8 py-3 text-sm font-bold shadow-2xl hover:scale-105 transition-transform"
            >
              Load 3D Digital Twin
            </Button>
          )}

          <span className="text-[11px] text-[#D8C3A5]/70">
            Optimized payload ({sizeKb} KB). Does not block page performance.
          </span>
        </div>
      </div>

      {/* Bottom Features Strip */}
      <div className="relative z-10 grid grid-cols-3 gap-2 text-center border-t border-white/10 pt-4 text-xs text-[#D8C3A5]/90">
        <div>
          <strong className="text-white block font-serif">Annotated Hotspots</strong>
          <span className="text-[10px] text-[#D8C3A5]/60">Guided architectural tour</span>
        </div>
        <div>
          <strong className="text-white block font-serif">Measurement Caliper</strong>
          <span className="text-[10px] text-[#D8C3A5]/60">Interactive surface metric tool</span>
        </div>
        <div>
          <strong className="text-white block font-serif">Lighting Simulator</strong>
          <span className="text-[10px] text-[#D8C3A5]/60">Day, dusk & sun-angle shadows</span>
        </div>
      </div>
    </div>
  );
}
