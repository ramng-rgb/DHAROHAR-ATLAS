"use client";

import React from "react";
import { Sparkles, Play } from "lucide-react";
import { triggerDemoTour } from "@/components/demo/DemoTourOverlay";

export function LandingDemoCta() {
  return (
    <button
      type="button"
      id="landing-demo-mode-cta"
      data-testid="landing-demo-cta"
      onClick={() => triggerDemoTour(0)}
      className="px-6 py-3.5 rounded-xl bg-[#141A26] hover:bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/50 font-bold text-sm shadow-xl shadow-black/50 flex items-center gap-2 transition-all cursor-pointer"
      aria-label="Launch 9-Step Guided Showcase Demo"
    >
      <Sparkles className="w-4 h-4 text-[#F3C649] fill-[#F3C649]" />
      <span>Launch Guided Demo Mode</span>
    </button>
  );
}
