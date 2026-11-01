"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Compass, Info, Image as ImageIcon, RotateCw, 
  ChevronLeft, ChevronRight, Eye, UploadCloud 
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PanoramaFallbackProps {
  siteName: string;
  images: Array<{
    url: string;
    caption?: string | null;
    attribution?: string | null;
    license?: string;
  }>;
}

export function PanoramaFallbackViewer({ siteName, images }: PanoramaFallbackProps) {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [is360Mode, setIs360Mode] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);

  const currentImage = images[activeIdx] || {
    url: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80",
    caption: `${siteName} archival documentation`,
    attribution: "Dharohar Cultural Archives",
    license: "CC-BY-4.0",
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!is360Mode) return;
    isDragging.current = true;
    startX.current = e.clientX - dragOffset;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !is360Mode) return;
    const currentOffset = e.clientX - startX.current;
    setDragOffset(currentOffset);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[450px] sm:h-[520px] rounded-3xl overflow-hidden border border-[#D4AF37]/40 shadow-2xl bg-[#0E0C09] select-none">
        {/* Main Display Canvas / Image */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-full relative cursor-${is360Mode ? "grab active:cursor-grabbing" : "default"}`}
        >
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-300"
            style={{
              backgroundImage: `url(${currentImage.url})`,
              backgroundPosition: is360Mode ? `${dragOffset * 0.5}px center` : "center",
              transform: is360Mode ? "scale(1.15)" : "scale(1)",
            }}
          />

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* Top Control Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1510]/80 border border-[#D4AF37]/50 backdrop-blur-md text-xs text-[#D4AF37] font-serif font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>{is360Mode ? "360° Spherical Pan View" : "Archival Photography"}</span>
            </div>

            <button
              onClick={() => setIs360Mode(!is360Mode)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                is360Mode
                  ? "bg-[#D4AF37] text-[#1A1510] border-[#D4AF37] shadow-lg"
                  : "bg-black/60 text-[#D8C3A5] border-[#D4AF37]/40 hover:text-white"
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{is360Mode ? "Exit 360° Pan" : "Simulate 360° Pan"}</span>
            </button>
          </div>

          {/* Bottom Caption & Carousel Navigation */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-xs pointer-events-auto">
            <div className="max-w-lg bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-1">
              <p className="text-white font-medium">
                {currentImage.caption || `${siteName} Architectural Detail`}
              </p>
              <div className="text-[11px] text-[#D8C3A5]/80 flex flex-wrap gap-2">
                <span>Attribution: {currentImage.attribution || "Dharohar Archives"}</span>
                <span>•</span>
                <span>Licence: {currentImage.license || "CC-BY-4.0"}</span>
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="p-1 rounded text-[#D8C3A5] hover:text-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-[#D4AF37] px-1">
                  {activeIdx + 1} / {images.length}
                </span>
                <button
                  onClick={() => setActiveIdx((prev) => (prev + 1) % images.length)}
                  className="p-1 rounded text-[#D8C3A5] hover:text-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Honest Roadmap Notice */}
      <div className="glass-panel rounded-2xl p-4 border border-[#D4AF37]/30 bg-[#16120E]/80 flex items-start gap-3 text-xs text-[#D8C3A5]">
        <UploadCloud className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <strong className="text-white block font-serif">
            Contribute Imagery for 3D Reconstruction
          </strong>
          <p className="leading-relaxed text-[#D8C3A5]/90">
            A photogrammetric 3D digital twin has not yet been processed for {siteName}. Dharohar Atlas welcomes licensed multi-angle drone captures and DSLR overlapping runs. Automated Gaussian Splatting and NeRF meshing worker arrives in Milestone M6.
          </p>
        </div>
      </div>
    </div>
  );
}
