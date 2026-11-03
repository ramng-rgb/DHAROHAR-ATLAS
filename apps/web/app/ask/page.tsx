"use client";

import React from "react";
import { AskTheArchivePanel } from "@/components/search/AskTheArchivePanel";
import { MessageSquare, Sparkles } from "lucide-react";

export default function AskArchivePage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#F6F1E9]">
          Ask the Dharohar Archive
        </h1>
        <p className="text-sm sm:text-base text-[#D8C3A5] max-w-[55ch] mx-auto font-normal text-pretty">
          Inquire about Solanki stepwell engineering, medieval Rajput defensive fortifications, or Sanskrit inscriptions. Answers are synthesized strictly from retrieved archive records with inline citations and calibrated refusal.
        </p>
      </div>

      <AskTheArchivePanel />
    </div>
  );
}
