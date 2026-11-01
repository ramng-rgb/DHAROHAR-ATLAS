"use client";

import React from "react";
import { Compass, ChevronRight } from "lucide-react";
import type { HotspotDetail } from "@/lib/api-client";

interface HotspotAriaListProps {
  hotspots: HotspotDetail[];
  activeHotspot: HotspotDetail | null;
  onSelectHotspot: (hotspot: HotspotDetail) => void;
}

export function HotspotAriaList({
  hotspots,
  activeHotspot,
  onSelectHotspot,
}: HotspotAriaListProps) {
  if (hotspots.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-bold text-sm text-[#F6F1E9] flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#D4AF37]" />
          <span>Hotspot Directory & Tour Stops ({hotspots.length})</span>
        </h4>
        <span className="text-xs text-[#D8C3A5]/70">
          Keyboard accessible • Press Enter to fly camera
        </span>
      </div>

      {/* Screen-reader announcement region */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {activeHotspot
          ? `Current hotspot: ${activeHotspot.label}. ${activeHotspot.body_md}`
          : "No hotspot selected."}
      </div>

      {/* Ordered list */}
      <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 list-none p-0 m-0">
        {hotspots.map((hs, idx) => {
          const isSelected = activeHotspot?.id === hs.id;
          return (
            <li key={hs.id}>
              <button
                onClick={() => onSelectHotspot(hs)}
                aria-current={isSelected ? "true" : undefined}
                className={`w-full p-3 rounded-xl text-left border transition-all flex items-start gap-3 group focus:outline-none focus:ring-2 focus:ring-[#D4AF37] ${
                  isSelected
                    ? "bg-[#D4AF37]/20 border-[#D4AF37] shadow-lg"
                    : "glass-panel border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-white/5"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#D4AF37] text-[#1A1510]"
                      : "bg-[#1A1510] text-[#D4AF37] border border-[#D4AF37]/40 group-hover:bg-[#D4AF37] group-hover:text-[#1A1510]"
                  }`}
                >
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="font-serif font-bold text-xs text-white truncate group-hover:text-[#D4AF37] transition-colors">
                    {hs.label}
                  </div>
                  {hs.label_hi && (
                    <div className="text-[10px] text-[#D8C3A5]/60 truncate font-sans">
                      {hs.label_hi}
                    </div>
                  )}
                  <div className="text-[11px] text-[#EFE6D8]/80 line-clamp-2 mt-1">
                    {hs.body_md}
                  </div>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 mt-1 transition-transform ${
                    isSelected ? "text-[#D4AF37] translate-x-1" : "text-[#D8C3A5]/40 group-hover:translate-x-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
