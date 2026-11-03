"use client";

import React from "react";
import { AskTheArchivePanel } from "@/components/search/AskTheArchivePanel";
import { MessageSquare, Sparkles } from "lucide-react";

export default function AskArchivePage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[#D4AF37]/40 text-xs font-serif font-bold text-[#D4AF37]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Strictly Grounded Heritage RAG Assistant</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#F6F1E9]">
          Ask the Dharohar Archive
        </h1>
        <p className="text-sm sm:text-base text-[#D8C3A5] max-w-2xl mx-auto font-serif">
          Inquire about Solanki stepwell engineering, medieval Rajput defensive fortifications, or Sanskrit inscriptions. Answers are synthesized strictly from retrieved archive records with inline citations and calibrated refusal.
        </p>
      </div>

      <AskTheArchivePanel />
    </div>
  );
}
