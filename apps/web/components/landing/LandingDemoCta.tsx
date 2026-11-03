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
      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk font-bold text-sm hover:opacity-95 shadow-xl shadow-[#D4AF37]/30 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
      aria-label="Launch 9-Step Guided Showcase Demo"
    >
      <Sparkles className="w-4 h-4 text-indigoInk fill-indigoInk animate-pulse" />
      <span>Launch Guided Demo Mode</span>
    </button>
  );
}
