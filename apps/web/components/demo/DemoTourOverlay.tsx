"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass, Play, ChevronRight, ChevronLeft, X, Sparkles,
  RotateCcw, Check, HelpCircle, MapPin, Box, BookOpen, Search
} from "lucide-react";
import { fetchDemoScript, DemoScript, DemoStep } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function triggerDemoTour(step: number = 0) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("start-dharohar-demo", { detail: { step } }));
  }
}

export function DemoTourOverlay() {
  const router = useRouter();
  const pathname = usePathname();

  const [script, setScript] = useState<DemoScript | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [introOpen, setIntroOpen] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load demo script on mount
  useEffect(() => {
    fetchDemoScript()
      .then((data) => setScript(data))
      .catch((err) => console.error("Failed to load demo script:", err));
  }, []);

  // Check first-run intro in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("dharohar_demo_intro_dismissed");
    const isHeadless = typeof navigator !== "undefined" && navigator.userAgent?.includes("Headless");
    if (!dismissed && pathname === "/" && !isHeadless) {
      setIntroOpen(true);
    }
  }, [pathname]);

  // Listen for custom start event
  useEffect(() => {
    const handleStartEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ step?: number }>;
      const startIdx = customEvent.detail?.step ?? 0;
      setCurrentStepIndex(startIdx);
      setIsActive(true);
      setIntroOpen(false);
    };

    window.addEventListener("start-dharohar-demo", handleStartEvent);
    return () => window.removeEventListener("start-dharohar-demo", handleStartEvent);
  }, []);

  const steps = script?.steps || [];
  const currentStep: DemoStep | undefined = steps[currentStepIndex];

  // Update target element coordinates
  const updateTargetPosition = useCallback(() => {
    if (!currentStep || !isActive) {
      setTargetRect(null);
      return;
    }

    const selector = currentStep.target_selector;
    const el = document.querySelector(selector);

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      // Element may be loading on new route, retry after small interval
      setTargetRect(null);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        const retryEl = document.querySelector(selector);
        if (retryEl) {
          const rect = retryEl.getBoundingClientRect();
          setTargetRect(rect);
          if (typeof retryEl.scrollIntoView === "function") {
            retryEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 500);
    }
  }, [currentStep, isActive]);

  // Navigate route and update position when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Check if step requires route change
    const targetRoute = currentStep.route.split("?")[0];
    const currentRoute = pathname.split("?")[0];

    if (targetRoute !== currentRoute) {
      router.push(currentStep.route);
    }

    // Wait for DOM to settle
    const timer = setTimeout(updateTargetPosition, 600);
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
    };
  }, [currentStepIndex, currentStep, isActive, pathname, router, updateTargetPosition]);

  // Keyboard navigation inside tour
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsActive(false);
      } else if (e.key === "ArrowRight") {
        if (currentStepIndex < steps.length - 1) {
          e.preventDefault();
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) {
          e.preventDefault();
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStepIndex, steps.length]);

  // Advance to next step
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
    }
  };

  // Back to previous step
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Reset demo state
  const handleReset = () => {
    setCurrentStepIndex(0);
    router.push("/");
    setTimeout(updateTargetPosition, 400);
  };

  // Dismiss intro modal
  const handleDismissIntro = (startTour: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dharohar_demo_intro_dismissed", "1");
    }
    setIntroOpen(false);
    if (startTour) {
      triggerDemoTour(0);
    }
  };

  return (
    <>
      {/* 3-Step First-Run Intro Modal for Judges */}
      {introOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Dharohar Atlas"
        >
          <div className="glass-panel-gold max-w-lg w-full rounded-2xl p-6 md:p-8 border border-[#D4AF37] shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-3">
              <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
                <Sparkles className="w-4 h-4 text-[#F3C649]" />
                <span>Evaluation Quickstart</span>
              </div>
              <button
                onClick={() => handleDismissIntro(false)}
                className="text-[#D8C3A5] hover:text-white"
                aria-label="Close intro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-serif font-bold text-[#F6F1E9]">
                Welcome to Dharohar Atlas
              </h2>
              <p className="text-sm text-[#EFE6D8] leading-relaxed">
                A living multimodal heritage intelligence system preserving uncurated Indian monuments across five millennia.
              </p>
            </div>

            {/* 3 Step Highlights */}
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#141A26] border border-[#D4AF37]/20">
                <Compass className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#F3C649] block">1. Geospatial & Journey Mode</span>
                  <p className="text-[#D8C3A5]">Explore authentic monuments with temporal sliders and animated travel routes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#141A26] border border-[#D4AF37]/20">
                <Box className="w-5 h-5 text-[#C85A32] flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#F3C649] block">2. 3D Digital Twin & Multimodal Archive</span>
                  <p className="text-[#D8C3A5]">Inspect spatial hotspots on Rani ki Vav and OCR folios with bounding-box highlights.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#141A26] border border-[#D4AF37]/20">
                <Search className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#F3C649] block">3. Hindi Semantic Search & Grounded RAG</span>
                  <p className="text-[#D8C3A5]">Ask natural-language questions with verifiable inline citations to authentic records.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => handleDismissIntro(true)}
                className="flex-1 gap-2 bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] font-bold"
              >
                <Play className="w-4 h-4 fill-indigoInk" />
                <span>Launch 9-Step Guided Demo</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDismissIntro(false)}
                className="text-[#D8C3A5] border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 text-xs"
              >
                Explore On My Own
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Spotlight Tour Overlay */}
      {isActive && currentStep && (
        <div
          data-testid="demo-tour-overlay"
          className="fixed inset-0 z-50 pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-label={`Demo Tour Step ${currentStep.id}: ${currentStep.title}`}
        >
          {/* Darkened Backdrop with Spotlight Cutout */}
          <div
            className="fixed inset-0 bg-black/60 pointer-events-auto transition-all duration-300"
            onClick={handleNext}
          />

          {/* Spotlight Ring around Target Element */}
          {targetRect && (
            <div
              className="fixed rounded-xl ring-4 ring-[#F3C649] shadow-[0_0_50px_rgba(212,175,55,0.6)] pointer-events-none transition-all duration-300 animate-pulse"
              style={{
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`
              }}
            />
          )}

          {/* Floating Tour Popover Box */}
          <div
            ref={popoverRef}
            className="fixed z-50 pointer-events-auto max-w-md w-full glass-panel-gold rounded-2xl p-5 border border-[#D4AF37] shadow-2xl space-y-4 animate-scale-in"
            style={{
              top: targetRect
                ? targetRect.bottom + 20 + 260 > window.innerHeight
                  ? `${Math.max(20, targetRect.top - 280)}px`
                  : `${targetRect.bottom + 16}px`
                : "20%",
              left: targetRect
                ? `${Math.max(20, Math.min(window.innerWidth - 420, targetRect.left))}px`
                : "50%",
              transform: targetRect ? "none" : "translateX(-50%)"
            }}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#9E3D1D] text-white font-bold text-xs flex items-center justify-center">
                  {currentStepIndex + 1}
                </span>
                <span className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-wider">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-[11px] text-[#D8C3A5] hover:text-[#F3C649] flex items-center gap-1 transition"
                  title="Reset Demo State"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  onClick={() => setIsActive(false)}
                  className="text-[#D8C3A5] hover:text-white transition"
                  aria-label="Exit Demo Mode"
                  title="Exit (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step Body */}
            <div className="space-y-2">
              <h3 className="text-base font-serif font-bold text-[#F6F1E9]">
                {currentStep.title}
              </h3>
              <p className="text-xs text-[#EFE6D8] leading-relaxed">
                {currentStep.caption}
              </p>

              {currentStep.sample_query && (
                <div className="bg-[#141A26] p-2.5 rounded-lg border border-[#D4AF37]/30 text-xs">
                  <span className="text-[#D4AF37] font-semibold block text-[11px]">Live Sample Query:</span>
                  <span className="text-[#F6F1E9] font-mono">{currentStep.sample_query}</span>
                </div>
              )}

              {currentStep.sample_question && (
                <div className="bg-[#141A26] p-2.5 rounded-lg border border-[#D4AF37]/30 text-xs">
                  <span className="text-[#D4AF37] font-semibold block text-[11px]">Grounded Ask Question:</span>
                  <span className="text-[#F6F1E9] font-serif italic">"{currentStep.sample_question}"</span>
                </div>
              )}
            </div>

            {/* Progress dots & Navigation buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/25">
              <div className="flex items-center gap-1">
                {steps.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStepIndex
                        ? "w-4 bg-[#F3C649]"
                        : idx < currentStepIndex
                        ? "bg-[#C85A32]"
                        : "bg-white/20 hover:bg-white/40"
                    }`}
                    title={`Jump to ${st.title}`}
                    aria-label={`Jump to step ${st.id}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="text-xs px-2.5 py-1 text-[#D8C3A5] border-[#D4AF37]/40 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Button>

                <Button
                  data-testid="demo-tour-next"
                  variant="primary"
                  size="sm"
                  onClick={handleNext}
                  className="text-xs px-3 py-1 bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] font-bold"
                >
                  <span>{currentStepIndex === steps.length - 1 ? "Finish Demo" : "Next"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
