import React from "react";
import Link from "next/link";
import { Compass, RotateCcw, Search, ArrowLeft } from "lucide-react";
import { JaaliDivider } from "@/components/ui/JaaliDivider";

export default function NotFound() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-[#141A26] border border-[#D4AF37]/50 flex items-center justify-center shadow-xl shadow-[#D4AF37]/20">
        <Compass className="w-8 h-8 text-[#D4AF37] animate-spin-slow" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-serif font-bold text-[#C85A32] uppercase tracking-widest">
          404 • Coordinate Lost
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F6F1E9]">
          Heritage Site or Folio Not Located
        </h1>
        <p className="text-xs sm:text-sm text-[#D8C3A5] leading-relaxed">
          The monument or archival folio you requested does not exist in the current surveyed catalog or may have been reclassified.
        </p>
      </div>

      <div className="max-w-xs w-full">
        <JaaliDivider />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/explore"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk font-bold text-xs hover:opacity-90 shadow-lg flex items-center gap-1.5 transition"
        >
          <Compass className="w-3.5 h-3.5 text-indigoInk" />
          <span>Return to Explorer</span>
        </Link>

        <Link
          href="/search"
          className="px-4 py-2.5 rounded-xl bg-[#141A26] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Archive</span>
        </Link>
      </div>
    </div>
  );
}
