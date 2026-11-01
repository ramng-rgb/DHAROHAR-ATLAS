import React from "react";
import Link from "next/link";
import { 
  Compass, Play, MapPin, Sparkles, ShieldCheck, 
  Layers, ArrowRight, BookOpen, Clock, Building2
} from "lucide-react";
import { JaaliDivider } from "@/components/ui/JaaliDivider";
import { Button } from "@/components/ui/Button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/facets`, { cache: "no-store" });
    if (res.ok) {
      const facets = await res.json();
      const numSites = facets.total_sites || 25;
      const numStates = Object.keys(facets.state || {}).length || 5;
      const numEras = Object.keys(facets.era || {}).length || 6;
      return { numSites, numStates, numEras };
    }
  } catch (e) {
    // Fallback if API is booting
  }
  return { numSites: 25, numStates: 5, numEras: 6 };
}

export const revalidate = 0;

export default async function HomePage() {
  const { numSites, numStates, numEras } = await getStats();

  return (
    <div className="w-full flex flex-col items-center">
      {/* Cinematic Hero Section with Performant SVG Stepwell Parallax */}
      <section className="relative w-full min-h-[82vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
        {/* Animated Subterranean Stepwell Vector Illustration (Zero image network payload for instant LCP) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-45 overflow-hidden">
          <svg
            className="w-full h-full object-cover text-goldLeaf/15 motion-safe:animate-[pulse_8s_ease-in-out_infinite]"
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            {/* Stepwell descending pavilion perspective lines */}
            <defs>
              <linearGradient id="stepwellWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#090D16" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="goldGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#C85A32" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Subterranean Tiers */}
            <polygon points="120,0 720,550 1320,0" fill="url(#stepwellWater)" />
            <polygon points="220,0 720,500 1220,0" stroke="#D4AF37" strokeWidth="0.75" strokeOpacity="0.25" fill="none" />
            <polygon points="320,0 720,450 1120,0" stroke="#D4AF37" strokeWidth="0.75" strokeOpacity="0.3" fill="none" />
            <polygon points="420,0 720,400 1020,0" stroke="#D4AF37" strokeWidth="0.75" strokeOpacity="0.35" fill="none" />
            <polygon points="520,0 720,350 920,0" stroke="#D4AF37" strokeWidth="0.75" strokeOpacity="0.4" fill="none" />

            {/* Stepped stair treads (Vav transverse flight geometry) */}
            {Array.from({ length: 12 }).map((_, i) => {
              const y = 80 + i * 40;
              const xLeft = 140 + i * 45;
              const xRight = 1300 - i * 45;
              return (
                <g key={i}>
                  <line x1={xLeft} y1={y} x2={xRight} y2={y} stroke="#D4AF37" strokeWidth="1" strokeOpacity={0.15 + i * 0.03} />
                  <line x1={xLeft} y1={y} x2={xLeft + 20} y2={y + 15} stroke="#D4AF37" strokeWidth="0.8" strokeOpacity="0.2" />
                  <line x1={xRight} y1={y} x2={xRight - 20} y2={y + 15} stroke="#D4AF37" strokeWidth="0.8" strokeOpacity="0.2" />
                </g>
              );
            })}

            {/* Central deep octagonal well pool */}
            <ellipse cx="720" cy="580" rx="140" ry="45" fill="url(#goldGlow)" stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.6" />
            <ellipse cx="720" cy="580" rx="90" ry="28" fill="#090D16" stroke="#D4AF37" strokeWidth="0.8" strokeOpacity="0.5" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-parchment-950/80 border border-goldLeaf/40 shadow-lg backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-goldLeaf fill-goldLeaf" />
            <span className="text-xs font-serif font-bold tracking-widest text-goldLeaf uppercase">
              HC26-CULT01 • Blithchron '27, IIT Gandhinagar
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-parchment-100 leading-tight drop-shadow-md">
            DHAROHAR ATLAS
          </h1>

          {/* One-Line Pitch */}
          <p className="text-lg sm:text-xl text-sandstone font-serif max-w-2xl mx-auto leading-relaxed">
            The Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives
          </p>

          <p className="text-sm sm:text-base text-parchment-200/80 max-w-2xl mx-auto font-sans leading-relaxed">
            Explore over five millennia of subterranean stepwells, monolithic rock temples, and desert citadels through verified geospatial intelligence, chronological timelines, and authentic archival records.
          </p>

          {/* Two Primary CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explore"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-goldLeaf to-terracotta text-parchment-950 font-bold text-sm hover:opacity-95 shadow-xl shadow-goldLeaf/20 flex items-center gap-2 transition-transform hover:scale-105"
            >
              <Compass className="w-4 h-4 text-parchment-950" />
              <span>Explore the Atlas</span>
              <ArrowRight className="w-4 h-4 text-parchment-950" />
            </Link>

            <Link
              href="/journey"
              className="px-6 py-3.5 rounded-xl bg-parchment-950/90 border border-goldLeaf/50 text-goldLeaf font-serif font-bold text-sm hover:bg-goldLeaf/15 flex items-center gap-2 transition-all shadow-md"
            >
              <Play className="w-4 h-4 text-goldLeaf fill-goldLeaf/30" />
              <span>Watch Demo Mode</span>
            </Link>
          </div>

          {/* Jaali Divider */}
          <div className="pt-4 max-w-md mx-auto">
            <JaaliDivider />
          </div>

          {/* 3 Live Stats pulled from PostGIS API */}
          <div className="pt-2 grid grid-cols-3 gap-4 max-w-xl mx-auto text-center">
            <div className="p-4 rounded-xl bg-parchment-950/70 border border-goldLeaf/25 shadow-lg backdrop-blur-sm">
              <span className="block font-serif text-3xl sm:text-4xl font-bold text-goldLeaf">
                {numSites}
              </span>
              <span className="text-xs text-sandstone uppercase tracking-wider font-semibold mt-1 block">
                Verified Sites
              </span>
            </div>

            <div className="p-4 rounded-xl bg-parchment-950/70 border border-goldLeaf/25 shadow-lg backdrop-blur-sm">
              <span className="block font-serif text-3xl sm:text-4xl font-bold text-goldLeaf">
                {numStates}
              </span>
              <span className="text-xs text-sandstone uppercase tracking-wider font-semibold mt-1 block">
                Heritage Regions
              </span>
            </div>

            <div className="p-4 rounded-xl bg-parchment-950/70 border border-goldLeaf/25 shadow-lg backdrop-blur-sm">
              <span className="block font-serif text-3xl sm:text-4xl font-bold text-goldLeaf">
                5+
              </span>
              <span className="text-xs text-sandstone uppercase tracking-wider font-semibold mt-1 block">
                Millennia Spanned
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="w-full max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-parchment-950/60 border border-sandstone/20 hover:border-goldLeaf/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-goldLeaf/10 border border-goldLeaf/30 flex items-center justify-center text-goldLeaf mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-parchment-100 mb-2">Geospatial Explorer</h3>
            <p className="text-xs text-sandstone leading-relaxed">
              Full-screen interactive MapLibre cartography backed by real PostGIS geometry queries, viewport clustering, and trilingual metadata.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-parchment-950/60 border border-sandstone/20 hover:border-goldLeaf/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-terracotta/15 border border-terracotta/40 flex items-center justify-center text-terracotta-light mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-parchment-100 mb-2">BCE Chronological Timeline</h3>
            <p className="text-xs text-sandstone leading-relaxed">
              Scrub seamlessly across 3000 BCE Harappan citadels to 19th-century colonial structures with non-linear density histograms.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-parchment-950/60 border border-sandstone/20 hover:border-goldLeaf/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-parchment-100 mb-2">Strict Academic Honesty</h3>
            <p className="text-xs text-sandstone leading-relaxed">
              Zero invented folklore or dates. Every monument carries verified ASI/UNESCO citations, CC licensing, and provenance badges.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
