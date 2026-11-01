"use client";

import React, { useState, useEffect } from "react";
import { 
  X, ChevronLeft, ChevronRight, Play, Pause, 
  MapPin, Compass, Info, Languages, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { HotspotDetail } from "@/lib/api-client";

interface HotspotTourDrawerProps {
  hotspots: HotspotDetail[];
  activeHotspot: HotspotDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectHotspot: (hotspot: HotspotDetail) => void;
}

export function HotspotTourDrawer({
  hotspots,
  activeHotspot,
  isOpen,
  onClose,
  onSelectHotspot,
}: HotspotTourDrawerProps) {
  const [lang, setLang] = useState<"en" | "hi" | "gu">("en");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentIndex = activeHotspot
    ? hotspots.findIndex((h) => h.id === activeHotspot.id)
    : 0;

  // Auto-play guided tour
  useEffect(() => {
    if (!isPlaying || hotspots.length === 0) return;

    const timer = setInterval(() => {
      const nextIdx = (currentIndex + 1) % hotspots.length;
      onSelectHotspot(hotspots[nextIdx]);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, hotspots, onSelectHotspot]);

  if (!isOpen || !activeHotspot) return null;

  const getLabel = () => {
    if (lang === "hi" && activeHotspot.label_hi) return activeHotspot.label_hi;
    if (lang === "gu" && activeHotspot.label_gu) return activeHotspot.label_gu;
    return activeHotspot.label;
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + hotspots.length) % hotspots.length;
    onSelectHotspot(hotspots[prevIdx]);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % hotspots.length;
    onSelectHotspot(hotspots[nextIdx]);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="hotspot-drawer-title"
      className="absolute top-4 right-4 z-30 w-full max-w-sm sm:max-w-md glass-panel-gold rounded-2xl p-5 border border-[#D4AF37]/50 shadow-2xl bg-[#14100C]/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
        <div className="flex items-center gap-2 text-xs font-serif text-[#D4AF37]">
          <Compass className="w-4 h-4 text-[#D4AF37]" />
          <span>Hotspot {currentIndex + 1} of {hotspots.length}</span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-[#1A1510] p-1 rounded-lg border border-[#D4AF37]/30 text-[11px]">
          <button
            onClick={() => setLang("en")}
            className={`px-2 py-0.5 rounded transition-colors font-semibold ${
              lang === "en" ? "bg-[#D4AF37] text-[#1A1510]" : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("hi")}
            className={`px-2 py-0.5 rounded transition-colors font-semibold ${
              lang === "hi" ? "bg-[#D4AF37] text-[#1A1510]" : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => setLang("gu")}
            className={`px-2 py-0.5 rounded transition-colors font-semibold ${
              lang === "gu" ? "bg-[#D4AF37] text-[#1A1510]" : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            ગુજરાતી
          </button>
        </div>

        <button
          onClick={onClose}
          aria-label="Close hotspot drawer"
          className="p-1.5 rounded-lg text-[#D8C3A5] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Body */}
      <div className="space-y-2">
        <h3
          id="hotspot-drawer-title"
          className="font-serif text-lg font-bold text-white leading-snug"
        >
          {getLabel()}
        </h3>

        <p className="text-xs sm:text-sm text-[#EFE6D8] leading-relaxed">
          {activeHotspot.body_md}
        </p>
      </div>

      {/* Vector Coordinates Badge */}
      <div className="text-[11px] font-mono text-[#D8C3A5]/80 bg-[#1A1510]/60 px-3 py-1.5 rounded-lg border border-[#D4AF37]/15 flex items-center justify-between">
        <span>3D Position:</span>
        <span className="text-[#D4AF37]">
          [{activeHotspot.position[0].toFixed(2)}, {activeHotspot.position[1].toFixed(2)}, {activeHotspot.position[2].toFixed(2)}]
        </span>
      </div>

      {/* Stepper & Tour Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/20">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            aria-label="Previous architectural hotspot"
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            aria-label="Next architectural hotspot"
            icon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>

        <Button
          variant={isPlaying ? "secondary" : "primary"}
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        >
          {isPlaying ? "Pause Tour" : "Autoplay Tour"}
        </Button>
      </div>
    </div>
  );
}
