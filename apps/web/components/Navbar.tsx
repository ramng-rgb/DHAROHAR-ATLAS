"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, MapPin, BookOpen, MessageSquare, Play, Sparkles, 
  HelpCircle, Layers, ChevronRight, X, Search, AlertTriangle
} from "lucide-react";
import { CommandPalette } from "@/components/search/CommandPalette";
import { triggerDemoTour } from "@/components/demo/DemoTourOverlay";

export function Navbar() {
  const pathname = usePathname();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const tourSteps = [
    {
      title: "1. Geospatial & Temporal Explorer",
      desc: "Interact with 25+ authentic monuments across western India. Drag the historical era slider to reveal Solanki, Harappan, and Rajput golden ages.",
      link: "/explorer"
    },
    {
      title: "2. 3D Digital Twin & Spatial Hotspots",
      desc: "Open Rani ki Vav to inspect an architectural GLB model with orbit controls, day/night lighting, and annotated subterranean shrines.",
      link: "/sites/rani-ki-vav-patan"
    },
    {
      title: "3. Archive OCR & Translation",
      desc: "Inspect 11th-century Devanagari and Old Gujarati folios with bounding boxes, English translations, and live human-in-the-loop editing.",
      link: "/archive"
    },
    {
      title: "4. Ask the Archive (Cited RAG)",
      desc: "Query the knowledge layer in natural language. Every factual claim is backed by inline citations to verified archaeological records.",
      link: "/ask"
    }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-sandstone-100/90 backdrop-blur-md border-b border-sandstone-300/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2.5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center text-white shadow-warm-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C7.5 2 4 5.5 4 10v11h16V10c0-4.5-3.5-8-8-8zm0 2.2c2.8 0 5.2 2 5.8 4.8H6.2c.6-2.8 3-4.8 5.8-4.8zM6 19v-7h12v7H6z"/>
              </svg>
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-indigoHeritage flex items-center">
                Virasat<span className="text-terracotta">Yatra</span>
              </span>
              <span className="block text-[11px] font-semibold tracking-wider uppercase text-[#7A5C1E]">
                विरासत यात्रा • HERITAGE EXPLORER
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links Pill */}
          <nav className="hidden md:flex items-center gap-1 bg-sandstone-200/70 p-1.5 rounded-full border border-sandstone-300/80 shadow-sm">
            <Link
              href="/"
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                pathname === "/"
                  ? "bg-sandstone-100 text-terracotta shadow-warm-sm font-semibold"
                  : "text-indigoHeritage hover:text-terracotta"
              }`}
            >
              Home
            </Link>

            <Link
              href="/explore"
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                pathname === "/explore" || pathname === "/explorer"
                  ? "bg-sandstone-100 text-terracotta shadow-warm-sm font-semibold"
                  : "text-indigoHeritage hover:text-terracotta"
              }`}
            >
              Map Explorer
            </Link>

            <Link
              href="/sites/rani-ki-vav-patan"
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                pathname?.startsWith("/sites")
                  ? "bg-sandstone-100 text-terracotta shadow-warm-sm font-semibold"
                  : "text-indigoHeritage hover:text-terracotta"
              }`}
            >
              3D Twin
            </Link>

            <Link
              href="/archive"
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                pathname === "/archive"
                  ? "bg-sandstone-100 text-terracotta shadow-warm-sm font-semibold"
                  : "text-indigoHeritage hover:text-terracotta"
              }`}
            >
              Inscription AI
            </Link>

            <Link
              href="/search"
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                pathname === "/search" || pathname === "/ask"
                  ? "bg-sandstone-100 text-terracotta shadow-warm-sm font-semibold"
                  : "text-indigoHeritage hover:text-terracotta"
              }`}
            >
              Monument Dossier
            </Link>
          </nav>

          {/* Actions: Language Toggle & Demo Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Pill */}
            <div className="relative inline-flex items-center p-1 bg-indigoHeritage text-sandstone-100 rounded-full text-xs font-semibold shadow-inner border border-mutedGold/30">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("dharohar_locale", "en");
                    window.dispatchEvent(new Event("storage"));
                  }
                }}
                className="px-2.5 py-1 rounded-full transition-all bg-mutedGold text-indigoHeritage-dark shadow-sm font-bold"
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("dharohar_locale", "hi");
                    window.dispatchEvent(new Event("storage"));
                  }
                }}
                className="px-2.5 py-1 rounded-full transition-all text-sandstone-300 hover:text-white"
                title="हिन्दी"
              >
                हिन्दी
              </button>
            </div>

            {/* Test State Menu Pill */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 bg-sandstone-100 hover:bg-white text-indigoHeritage text-xs font-medium rounded-xl border border-sandstone-300 shadow-sm transition-all"
                title="View Design Edge Cases"
              >
                <Layers className="w-3.5 h-3.5 text-terracotta" />
                <span className="hidden sm:inline">States</span>
              </button>
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-warm-lg border border-sandstone-300 py-2 hidden group-hover:block z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Simulate Edge States
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("skeleton-preview-modal");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-indigoHeritage hover:bg-sandstone-100 flex items-center justify-between"
                >
                  <span>Skeleton Loader</span>
                  <span className="text-[10px] text-mutedGold bg-sandstone-200 px-1.5 py-0.5 rounded">View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("offline-banner-alert");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-indigoHeritage hover:bg-sandstone-100 flex items-center justify-between"
                >
                  <span>Offline Cache Warning</span>
                  <span className="text-[10px] text-terracotta bg-terracotta-50 px-1.5 py-0.5 rounded">Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("ocr-error-preview-modal");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-indigoHeritage hover:bg-sandstone-100 flex items-center justify-between"
                >
                  <span>OCR Read Error Modal</span>
                  <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Alert</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs text-indigoHeritage hover:text-terracotta border border-sandstone-300 rounded-xl bg-sandstone-100 hover:bg-white transition-all shadow-sm"
              title="Global Archive Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-mutedGold" />
              <kbd className="text-[10px] font-mono px-1 rounded bg-sandstone-200 text-indigoHeritage">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              id="nav-demo-mode-button"
              data-testid="demo-mode-btn"
              onClick={() => triggerDemoTour(0)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-mutedGold hover:bg-mutedGold-light text-indigoHeritage-dark shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              aria-label="Launch Guided Demo Mode"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigoHeritage-dark" />
              <span className="hidden sm:inline">Tour</span>
            </button>
          </div>
        </div>

        {/* Offline Cache Mode Banner (Toggleable) */}
        <div
          id="offline-banner-alert"
          className="hidden bg-[#141C2E] text-[#F6F1E9] px-4 py-2 border-b border-[#C9A24B]/40 text-xs font-medium flex items-center justify-between"
          role="alert"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span>
              Network offline: Dharohar Atlas is operating in <strong>Cached Heritage Mode</strong> (Rani ki Vav 3D Model & Patan Folios available offline).
            </span>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("offline-banner-alert");
                if (el) el.classList.add("hidden");
              }}
              className="ml-auto text-xs text-[#D4AF37] hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </header>

      {/* Global Skeleton Preview Overlay */}
      <div
        id="skeleton-preview-modal"
        className="hidden fixed inset-0 z-50 bg-[#090D16]/90 backdrop-blur-md p-6 sm:p-12 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C85A32]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                State Preview: Dynamic Photogrammetry Skeleton Loader
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("skeleton-preview-modal");
                if (el) el.classList.add("hidden");
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-[#D4AF37]/30 text-xs font-bold text-[#F6F1E9]"
            >
              Close Preview
            </button>
          </div>

          <div className="h-12 w-2/3 bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-6 w-1/3 bg-white/5 rounded-xl animate-pulse" />

          <div className="h-80 w-full bg-white/5 border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
            <span className="text-xs font-medium text-[#D8C3A5]/60">
              Synthesizing Subterranean Point Cloud Mesh & Solar Shadow Map...
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
            <div className="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* OCR Inscription Read Error Modal */}
      <div
        id="ocr-error-preview-modal"
        className="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="bg-[#141C2E] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#D4AF37]/40 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#F6F1E9] mb-2">
            Epigraph Read Anomaly Detected
          </h3>
          <p className="text-xs text-[#D8C3A5] leading-relaxed mb-6">
            The OCR neural pipeline detected surface flaking, deep hand shadows, or insufficient oblique contrast on the inscription face.
          </p>
          <div className="p-3 bg-black/40 rounded-xl text-left text-xs text-[#D8C3A5]/80 mb-6 space-y-1 border border-white/5">
            <span className="font-bold text-[#D4AF37] block">Field Recording Guidance:</span>
            <div>• Position indirect natural lighting at a 45° angle to the stone relief.</div>
            <div>• Avoid specular lens flare across eroded Brahmi or Devanagari characters.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("ocr-error-preview-modal");
              if (el) el.classList.add("hidden");
            }}
            className="w-full py-2.5 rounded-xl bg-[#9E3D1D] hover:bg-[#B5532F] text-white font-semibold text-xs transition-all"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* 30-Second Guided Tour Modal for Judges */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel-gold rounded-xl p-6 relative border border-[#D4AF37]/60 shadow-2xl">
            <button
              onClick={() => setTourOpen(false)}
              className="absolute top-4 right-4 text-[#D8C3A5]/60 hover:text-[#D4AF37]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
              <Sparkles className="w-4 h-4" />
              Dharohar 30-Second Guided Tour ({tourStep + 1} of {tourSteps.length})
            </div>
            
            <h3 className="text-lg font-serif font-bold text-[#F6F1E9] mb-2">
              {tourSteps[tourStep].title}
            </h3>
            
            <p className="text-sm text-[#D8C3A5] leading-relaxed mb-6">
              {tourSteps[tourStep].desc}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[#D4AF37]/20">
              <div className="flex gap-1.5">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      i === tourStep ? "bg-[#D4AF37]" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={tourSteps[tourStep].link}
                  onClick={() => setTourOpen(false)}
                  className="px-3 py-1.5 text-xs rounded bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 flex items-center gap-1 font-semibold"
                >
                  Jump to Feature <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                {tourStep < tourSteps.length - 1 ? (
                  <button
                    onClick={() => setTourStep(tourStep + 1)}
                    className="px-3 py-1.5 text-xs rounded bg-[#D4AF37] text-indigoInk font-bold hover:bg-[#F3C649]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setTourOpen(false)}
                    className="px-3 py-1.5 text-xs rounded bg-[#D4AF37] text-indigoInk font-bold hover:bg-[#F3C649]"
                  >
                    Start Exploring
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
