"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, MapPin, BookOpen, MessageSquare, Play, Sparkles, 
  HelpCircle, Layers, ChevronRight, X, Search
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
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C85A32] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 text-indigoInk" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-wider text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors">
                  DHAROHAR ATLAS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                  IITGN Blithchron
                </span>
              </div>
              <p className="text-[11px] text-[#D8C3A5]/70 tracking-wide font-serif">
                धरोहर ज्ञान सेतु • Living Architectural Archive
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/explore"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname === "/explore" || pathname === "/explorer"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#EFE6D8]/80 hover:text-[#D4AF37] hover:bg-white/5"
              }`}
            >
              <Compass className="w-4 h-4 text-[#D4AF37]" />
              Explorer
            </Link>

            <Link
              href="/journey"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname === "/journey"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#EFE6D8]/80 hover:text-[#D4AF37] hover:bg-white/5"
              }`}
            >
              <MapPin className="w-4 h-4 text-[#C85A32]" />
              Fellowship Trail
            </Link>

            <Link
              href="/archive"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname === "/archive"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#EFE6D8]/80 hover:text-[#D4AF37] hover:bg-white/5"
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              Archive Folios
            </Link>

            <Link
              href="/search"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname === "/search"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#EFE6D8]/80 hover:text-[#D4AF37] hover:bg-white/5"
              }`}
            >
              <Search className="w-4 h-4 text-[#D4AF37]" />
              Search
            </Link>

            <Link
              href="/ask"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname === "/ask"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#EFE6D8]/80 hover:text-[#D4AF37] hover:bg-white/5"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
              Ask Archive
            </Link>
          </nav>

          {/* Quick Actions & Language */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-[#D8C3A5] hover:text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-md bg-black/40 hover:bg-[#D4AF37]/10 transition-all shadow-inner"
              title="Global Archive Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden lg:inline">Search Archive</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#D4AF37] border border-white/10">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => { setTourOpen(true); setTourStep(0); }}
              className="px-2.5 py-1.5 text-xs text-[#D8C3A5] hover:text-[#D4AF37] border border-[#D4AF37]/30 rounded-md bg-black/30 hover:bg-[#D4AF37]/10 transition-all flex items-center gap-1"
              title="First-run Guided Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Guided Tour</span>
            </button>

            <button
              type="button"
              id="nav-demo-mode-button"
              data-testid="demo-mode-btn"
              onClick={() => triggerDemoTour(0)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk hover:opacity-95 shadow-md shadow-[#D4AF37]/30 flex items-center gap-1.5 transition-all cursor-pointer"
              aria-label="Launch Guided 9-Step Demo Mode"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigoInk fill-indigoInk animate-pulse" />
              <span>Demo Mode</span>
            </button>
          </div>
        </div>
      </header>

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
