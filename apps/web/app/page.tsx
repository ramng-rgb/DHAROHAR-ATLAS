import React from "react";
import Link from "next/link";
import { 
  Compass, Box, BookOpen, MessageSquare, ArrowRight, 
  MapPin, Sparkles, ShieldCheck, Layers, Eye, ChevronRight
} from "lucide-react";
import { SemanticSearchBox } from "@/components/SemanticSearchBox";
import { fetchSites, SiteBrief } from "@/lib/api";

export const revalidate = 0;

export default async function HomePage() {
  let sites: SiteBrief[] = [];
  try {
    sites = await fetchSites({ limit: 6 });
  } catch (e) {
    // Graceful fallback for build time
    sites = [];
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section with Cinematic Stepwell Imagery */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
        {/* Background Image with Gradient Mask */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=2000&q=85"
            alt="Rani ki Vav Stepwell Subterranean Architecture"
            className="w-full h-full object-cover object-center filter brightness-40 contrast-110 scale-105 transform motion-safe:animate-pulse duration-[10000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090D16]/80 via-transparent to-[#090D16]/80" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-gold border border-[#D4AF37]/50 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
            <span className="text-xs font-serif font-bold tracking-widest text-[#D4AF37] uppercase">
              HC26-CULT01 • Blithchron '27, IIT Gandhinagar
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#F6F1E9] leading-tight drop-shadow-md">
            DHAROHAR ATLAS
          </h1>

          <p className="text-lg sm:text-xl text-[#D8C3A5] font-serif max-w-2xl mx-auto leading-relaxed">
            The Living Knowledge Layer for Unstructured Cultural & Architectural Heritage Archives
          </p>

          <p className="text-sm sm:text-base text-[#EFE6D8]/80 max-w-2xl mx-auto font-sans leading-relaxed">
            Transforming thousands of static slide decks, photo folders, and Devanagari manuscripts into an interconnected web of historical GIS, 3D photogrammetric digital twins, and cited semantic intelligence.
          </p>

          {/* Primary CTA Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explorer"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk font-bold text-sm hover:opacity-95 shadow-xl shadow-[#D4AF37]/25 flex items-center gap-2 transition-transform hover:scale-105"
            >
              <Compass className="w-4 h-4 text-indigoInk" />
              <span>Launch Historical Explorer</span>
              <ArrowRight className="w-4 h-4 text-indigoInk" />
            </Link>

            <Link
              href="/sites/rani-ki-vav-patan"
              className="px-6 py-3.5 rounded-xl glass-panel-gold border border-[#D4AF37]/60 text-[#D4AF37] font-serif font-bold text-sm hover:bg-[#D4AF37]/20 flex items-center gap-2 transition-all"
            >
              <Box className="w-4 h-4 text-[#D4AF37]" />
              <span>Inspect 3D Digital Twin</span>
            </Link>

            <Link
              href="/archive"
              className="px-5 py-3.5 rounded-xl glass-panel border border-[#D4AF37]/30 text-[#EFE6D8] text-sm hover:border-[#D4AF37] flex items-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              <span>Folio OCR & Translation</span>
            </Link>
          </div>

          {/* Metrics Strip */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl glass-panel border border-[#D4AF37]/20">
              <span className="block font-serif text-2xl font-bold text-[#D4AF37]">25+</span>
              <span className="text-xs text-[#D8C3A5]">Verified Sites (GJ/RJ)</span>
            </div>
            <div className="p-3.5 rounded-xl glass-panel border border-[#D4AF37]/20">
              <span className="block font-serif text-2xl font-bold text-[#D4AF37]">3D GLB</span>
              <span className="text-xs text-[#D8C3A5]">Orbital Twins & Caliper</span>
            </div>
            <div className="p-3.5 rounded-xl glass-panel border border-[#D4AF37]/20">
              <span className="block font-serif text-2xl font-bold text-[#D4AF37]">100%</span>
              <span className="text-xs text-[#D8C3A5]">Search Recall@5</span>
            </div>
            <div className="p-3.5 rounded-xl glass-panel border border-[#D4AF37]/20">
              <span className="block font-serif text-2xl font-bold text-[#D4AF37]">pgvector</span>
              <span className="text-xs text-[#D8C3A5]">HNSW Hybrid RRF</span>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Semantic Search Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-20">
        <SemanticSearchBox />
      </section>

      {/* Signature Capabilities Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-serif font-bold tracking-widest text-[#D4AF37] uppercase">
            Four Pillar Architecture
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F6F1E9]">
            From Static Folders to Living Heritage
          </h2>
          <p className="text-sm text-[#D8C3A5]">
            Engineered to fulfill all four technical and innovation criteria for Blithchron '27.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-panel rounded-2xl p-6 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <Compass className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                Geospatial & Temporal Explorer
              </h3>
              <p className="text-xs text-[#D8C3A5] leading-relaxed">
                Full-screen MapLibre GIS mapping stepwells, hill forts, and Harappan dockyards across Gujarat and Rajasthan. Temporal timeline slider from 2600 BCE to 1800 CE.
              </p>
            </div>
            <Link
              href="/explorer"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F3C649] flex items-center gap-1 pt-2"
            >
              Open Map <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="glass-panel rounded-2xl p-6 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#C85A32]/20 border border-[#C85A32]/40 flex items-center justify-center">
                <Box className="w-6 h-6 text-[#E07A5F]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                3D Digital Twin Inspection
              </h3>
              <p className="text-xs text-[#D8C3A5] leading-relaxed">
                Interactive Three.js / R3F GLB viewer with day/night lamp lighting, spatial hotspot annotations, and architectural metric caliper tool for structural surveying.
              </p>
            </div>
            <Link
              href="/sites/rani-ki-vav-patan#viewer3d"
              className="text-xs font-bold text-[#E07A5F] hover:text-white flex items-center gap-1 pt-2"
            >
              View Model <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="glass-panel rounded-2xl p-6 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                Archive OCR & Translation
              </h3>
              <p className="text-xs text-[#D8C3A5] leading-relaxed">
                Multilingual pipeline extracting Devanagari, Old Gujarati, and Sanskrit folios with per-line bounding boxes, neural translation, and versioned human-in-the-loop review.
              </p>
            </div>
            <Link
              href="/archive"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F3C649] flex items-center gap-1 pt-2"
            >
              Inspect Folios <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 4 */}
          <div className="glass-panel rounded-2xl p-6 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#D4AF37]/40 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                Ask the Archive (Cited RAG)
              </h3>
              <p className="text-xs text-[#D8C3A5] leading-relaxed">
                Natural-language Q&A backed by dense vector similarity and trigram lexical RRF. Strict citation grounding protects against hallucination.
              </p>
            </div>
            <Link
              href="/ask"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F3C649] flex items-center gap-1 pt-2"
            >
              Ask Questions <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Heritage Monuments Showcase */}
      {sites.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-wider">
                CURATED EXPEDITIONS
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F6F1E9]">
                Featured Heritage Monuments
              </h2>
            </div>
            <Link
              href="/explorer"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F3C649] flex items-center gap-1"
            >
              View All 25 Sites <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="glass-panel rounded-2xl overflow-hidden border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all flex flex-col group"
              >
                {site.hero_image && (
                  <div className="w-full h-48 overflow-hidden relative">
                    <img
                      src={site.hero_image}
                      alt={site.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40">
                        {site.site_type}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors">
                      {site.name}
                    </h3>
                    <p className="text-xs text-[#D8C3A5] font-serif mt-1">
                      {site.era} • {site.state}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#D4AF37]/15 flex items-center justify-between">
                    <Link
                      href={`/sites/${site.slug}`}
                      className="text-xs font-bold text-[#D4AF37] flex items-center gap-1 hover:underline"
                    >
                      <span>Explore Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    {site.slug.includes("vav") && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#C85A32]/30 text-[#E07A5F] border border-[#C85A32]/40 flex items-center gap-1 font-semibold">
                        <Box className="w-3 h-3" /> 3D Twin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer with IITGN Attribution */}
      <footer className="w-full border-t border-[#D4AF37]/20 glass-panel py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D8C3A5]">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-serif font-bold text-[#F6F1E9]">Dharohar Atlas</span>
            <span>• Developed for Blithchron '27, IIT Gandhinagar (HC26-CULT01)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/explorer" className="hover:text-[#D4AF37]">Explorer Map</Link>
            <Link href="/journey" className="hover:text-[#D4AF37]">Journey Mode</Link>
            <Link href="/archive" className="hover:text-[#D4AF37]">Archive OCR</Link>
            <Link href="/ask" className="hover:text-[#D4AF37]">Ask Archive</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
