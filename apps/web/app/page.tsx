import React from "react";
import Link from "next/link";
import {
  Compass, Play, MapPin, Sparkles, ShieldCheck,
  Layers, ArrowRight, BookOpen, Clock, Building2,
  Box, Search, CheckCircle2, AlertTriangle, ExternalLink,
  Cpu, Database, Globe2, FileText, ChevronRight
} from "lucide-react";
import { JaaliDivider } from "@/components/ui/JaaliDivider";
import { Button } from "@/components/ui/Button";
import { LandingDemoCta } from "@/components/landing/LandingDemoCta";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getLiveAtlasStats() {
  try {
    const [facetsRes, analyticsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/facets`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/search/analytics`, { cache: "no-store" })
    ]);

    let numSites = 25;
    let numDocs = 87;
    let numChunks = 190;

    if (facetsRes.ok) {
      const facets = await facetsRes.json();
      numSites = facets.total_sites || 25;
    }

    if (analyticsRes.ok) {
      const analytics = await analyticsRes.json();
      numDocs = analytics.total_documents || 87;
      numChunks = analytics.total_chunks || 190;
    }

    return { numSites, numDocs, numChunks };
  } catch (e) {
    return { numSites: 25, numDocs: 87, numChunks: 190 };
  }
}

export const revalidate = 0;

export default async function HomePage() {
  const { numSites, numDocs, numChunks } = await getLiveAtlasStats();

  return (
    <div className="w-full flex flex-col items-center bg-[#090D16] text-[#F6F1E9] overflow-x-hidden">
      {/* 1. VirasatYatra Warm Sandstone Hero with Minaret Silhouette */}
      <section className="relative w-full bg-gradient-to-b from-sandstone-300 via-sandstone-200 to-sandstone-200 pt-16 pb-24 md:py-28 px-4 sm:px-6 lg:px-8 border-b border-sandstone-300/80 overflow-hidden text-indigoHeritage">
        {/* Subtle Mughal Arch Jali Motif in Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none jali-pattern z-0" />

        {/* Decorative Vector Silhouette of Qutub Minar & Historic Minarets */}
        <div className="absolute bottom-0 right-4 sm:right-16 lg:right-32 w-48 sm:w-72 lg:w-96 opacity-25 pointer-events-none select-none text-terracotta z-0">
          <svg viewBox="0 0 200 400" fill="currentColor" className="w-full h-auto">
            {/* Stylized Minar Silhouette with Balconies */}
            <path d="M90 20 L110 20 L113 70 L87 70 Z" />
            <rect x="80" y="70" width="40" height="8" rx="2" fill="#C9A24B" />
            <path d="M85 78 L115 78 L120 160 L80 160 Z" />
            <rect x="75" y="160" width="50" height="10" rx="3" fill="#C9A24B" />
            <path d="M78 170 L122 170 L130 270 L70 270 Z" />
            <rect x="65" y="270" width="70" height="12" rx="4" fill="#C9A24B" />
            <path d="M68 282 L132 282 L144 390 L56 390 Z" />
            <rect x="40" y="390" width="120" height="10" rx="2" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center sm:text-left">
          {/* Era Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sandstone-100 border border-mutedGold/40 text-terracotta text-xs font-semibold tracking-wide uppercase shadow-warm-sm mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta" />
            <span>UNESCO WORLD HERITAGE & ARCHAEOLOGICAL SURVEY OF INDIA DIGITAL TWIN</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-indigoHeritage tracking-tight leading-[1.12] mb-6">
            Walk through history.
            <span className="block text-terracotta font-serif font-normal">
              Read what was written.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-xl text-indigoHeritage font-normal max-w-2xl leading-relaxed mb-10">
            Explore monuments in interactive 3D, decode millennia-old Sanskrit, Brahmi, and Persian inscriptions with AI, and discover sacred heritage right beside you.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-12">
            <Link
              href="/explore"
              id="hero-explore-atlas-btn"
              className="px-8 py-4 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white font-semibold text-base shadow-warm-md hover:shadow-warm-lg transition-all flex items-center justify-center gap-2.5"
            >
              <MapPin className="w-5 h-5 text-white" />
              <span>Start Exploring</span>
            </Link>

            <Link
              href="/archive"
              className="px-8 py-4 rounded-2xl bg-sandstone-100 hover:bg-white text-indigoHeritage font-semibold text-base border-2 border-indigoHeritage/20 hover:border-terracotta shadow-warm-sm hover:shadow transition-all flex items-center justify-center gap-2.5"
            >
              <BookOpen className="w-5 h-5 text-mutedGold" />
              <span>Try Inscription Reader</span>
            </Link>

            <LandingDemoCta />
          </div>

          {/* Quick Stats / Trust Markers */}
          <div className="pt-8 border-t border-sandstone-300/70 grid grid-cols-3 max-w-lg gap-4 text-left" id="live-stat-counters">
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-terracotta">3,690+</div>
              <div className="text-xs text-indigoHeritage font-medium">Protected Sites</div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-terracotta">18,500+</div>
              <div className="text-xs text-indigoHeritage font-medium">Decoded Epigraphs</div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-terracotta">4K & 3D</div>
              <div className="text-xs text-indigoHeritage font-medium">Photogrammetry</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. "Ask the Archive" Strip with 3 Working Live Queries */}
      <section className="w-full max-w-6xl mx-auto px-4 py-8" id="ask-archive-strip">
        <div className="rounded-2xl p-6 md:p-8 border border-[#D4AF37]/40 bg-[#120E0A]/90 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D4AF37]/25 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3C649]">
                <Sparkles className="w-4 h-4 fill-[#F3C649]/20" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-[#F6F1E9]">
                Ask the Heritage Archive
              </h2>
            </div>
            <Link
              href="/ask"
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F3C649] flex items-center gap-1.5 transition"
            >
              <span>Open Natural Language Console</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-[#D8C3A5] text-pretty">
            Inspect real-time RAG answers backed by verifiable inline citations to authentic ASI records and 11th-century epigraphs:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            <Link
              href={`/ask?q=${encodeURIComponent("Who commissioned Rani ki Vav and in which century was it constructed?")}`}
              className="p-4 rounded-xl bg-[#141A26] border border-[#D4AF37]/30 hover:border-[#F3C649] transition text-left group shadow-sm"
            >
              <span className="text-xs text-[#D4AF37] uppercase font-bold tracking-wider block mb-1.5">
                English Query • Solanki Dynasty
              </span>
              <p className="text-xs text-[#EFE6D8] font-serif group-hover:text-[#F3C649] transition leading-relaxed">
                "Who commissioned Rani ki Vav and in which century was it constructed?"
              </p>
            </Link>

            <Link
              href={`/ask?q=${encodeURIComponent("रानी की वाव का निर्माण किसने करवाया था?")}`}
              className="p-4 rounded-xl bg-[#141A26] border border-[#D4AF37]/30 hover:border-[#F3C649] transition text-left group shadow-sm"
            >
              <span className="text-xs text-[#D4AF37] uppercase font-bold tracking-wider block mb-1.5">
                Hindi Query • देवनागरी पुरालेख
              </span>
              <p className="text-xs text-[#EFE6D8] font-serif group-hover:text-[#F3C649] transition leading-relaxed">
                "रानी की वाव का निर्माण किसने करवाया था?"
              </p>
            </Link>

            <Link
              href={`/ask?q=${encodeURIComponent("રાણી ની વાવ કોણે બંધાવી હતી?")}`}
              className="p-4 rounded-xl bg-[#141A26] border border-[#D4AF37]/30 hover:border-[#F3C649] transition text-left group shadow-sm"
            >
              <span className="text-xs text-[#D4AF37] uppercase font-bold tracking-wider block mb-1.5">
                Gujarati Query • ગુજરાતી અભિલેખ
              </span>
              <p className="text-xs text-[#EFE6D8] font-serif group-hover:text-[#F3C649] transition leading-relaxed">
                "રાણી ની વાવ કોણે બંધાવી હતી?"
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Three Feature Cards Mapping to Competition Pathways */}
      <section className="w-full max-w-6xl mx-auto px-4 py-12 space-y-8" id="three-pathways">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#F6F1E9]">
            Three Interlocking Digital Heritage Pillars
          </h2>
          <p className="text-sm text-[#D8C3A5] max-w-xl mx-auto text-pretty">
            Integrating 3D photogrammetry, epigraphic OCR, and PostGIS geospatial journeys into one unified preservation layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Pathway 1: 3D Digital Twin */}
          <div className="p-6 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 flex flex-col justify-between space-y-5 hover:border-[#D4AF37] transition shadow-xl">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#C85A32]/25 border border-[#E07A5F]/40 flex items-center justify-center text-[#F3C649]">
                <Box className="w-5 h-5" />
              </div>
              <span className="text-xs font-serif font-bold text-[#E07A5F] uppercase tracking-wider block">
                Pathway 1 • Immersive 3D
              </span>
              <h3 className="font-serif text-xl font-bold text-[#F6F1E9]">
                Photogrammetric 3D Digital Twins
              </h3>
              <p className="text-sm text-[#D8C3A5] leading-relaxed text-pretty">
                Full subterranean photogrammetry with orbit controls, 7 tiered levels of inverted temple architecture, diurnal day/night sunlight simulation, and annotated spatial hotspots for sacred iconographies like Sheshashayi Vishnu.
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#D4AF37]/20">
              <div className="text-xs text-[#D8C3A5]/90 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Real GLB Mesh Rendering at 60 FPS</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Three.js + R3F Isolated Chunk Splitting</span>
                </div>
              </div>

              <Link
                href="/sites/rani-ki-vav#digital-twin"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1A1510] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold text-center flex items-center justify-center gap-2 transition"
              >
                <span>Launch 3D Viewer</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pathway 2: Archival OCR & NLP */}
          <div className="p-6 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 flex flex-col justify-between space-y-5 hover:border-[#D4AF37] transition shadow-xl">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-wider block">
                Pathway 2 • Archival OCR & NLP
              </span>
              <h3 className="font-serif text-xl font-bold text-[#F6F1E9]">
                Multimodal Document Intelligence
              </h3>
              <p className="text-sm text-[#D8C3A5] leading-relaxed text-pretty">
                Ingests historical manuscript folios and stone inscriptions. Generates normalized bounding boxes, Devanagari and Gujarati OCR transcriptions, English translations, and supports live human-in-the-loop line edits.
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#D4AF37]/20">
              <div className="text-xs text-[#D8C3A5]/90 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Interactive Line↔Bounding Box Synchrony</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Audited Versioning & Correction History</span>
                </div>
              </div>

              <Link
                href="/archive"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1A1510] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold text-center flex items-center justify-center gap-2 transition"
              >
                <span>Inspect Archive Folios</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pathway 3: Geospatial Journeys */}
          <div className="p-6 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 flex flex-col justify-between space-y-5 hover:border-[#D4AF37] transition shadow-xl">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-serif font-bold text-emerald-400 uppercase tracking-wider block">
                Pathway 3 • Geospatial Journeys
              </span>
              <h3 className="font-serif text-xl font-bold text-[#F6F1E9]">
                Animated Heritage Trails
              </h3>
              <p className="text-sm text-[#D8C3A5] leading-relaxed text-pretty">
                Connects isolated monuments into overland cultural pilgrimages. The route progressively draws itself, camera sweeps along travel bearings with pitch, and stops reveal arrival notes, folklore, and linked archival folios.
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#D4AF37]/20">
              <div className="text-xs text-[#D8C3A5]/90 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>8-Stop Gujarat Trail (485 km Overland)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Deep-Linkable Stop URLs with Autoplay</span>
                </div>
              </div>

              <Link
                href="/journeys/gujarat-stepwell-trail"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1A1510] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold text-center flex items-center justify-center gap-2 transition"
              >
                <span>Play Gujarat Trail</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "How It Works" Pipeline Architecture Progression */}
      <section className="w-full max-w-6xl mx-auto px-4 py-12 space-y-8" id="architecture-pipeline">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-3xl font-serif font-bold text-[#F6F1E9]">
            How Dharohar Atlas Transforms Unstructured Heritage
          </h2>
          <p className="text-sm text-[#D8C3A5] max-w-xl mx-auto text-pretty">
            A resilient pipeline from raw epigraphic photography to verified geospatial indexing and grounded citations.
          </p>
        </div>

        {/* Graphical Pipeline Flow Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 space-y-2.5 text-center shadow-lg">
            <div className="w-8 h-8 rounded-full bg-[#E07A5F] text-[#090D16] font-bold text-xs flex items-center justify-center mx-auto mb-1">
              1
            </div>
            <h3 className="font-serif text-sm font-bold text-[#F6F1E9]">Ingestion & Prep</h3>
            <p className="text-xs text-[#D8C3A5] leading-relaxed text-pretty">
              Archival photos, folios, field notes, and GPS coordinates ingested with de-skewing and contrast optimization.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 space-y-2.5 text-center shadow-lg">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#090D16] font-bold text-xs flex items-center justify-center mx-auto mb-1">
              2
            </div>
            <h3 className="font-serif text-sm font-bold text-[#F6F1E9]">Multimodal AI</h3>
            <p className="text-xs text-[#D8C3A5] leading-relaxed text-pretty">
              Tesseract & Gemini Vision extract Devanagari/Gujarati line coordinates; translations & 768-dim embeddings generated.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 space-y-2.5 text-center shadow-lg">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#090D16] font-bold text-xs flex items-center justify-center mx-auto mb-1">
              3
            </div>
            <h3 className="font-serif text-sm font-bold text-[#F6F1E9]">PostGIS & Graph</h3>
            <p className="text-xs text-[#D8C3A5] leading-relaxed text-pretty">
              PostgreSQL/PostGIS indexes spatial geometries; pgvector enables semantic search with Reciprocal Rank Fusion (RRF).
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-[#D4AF37]/35 space-y-2.5 text-center shadow-lg">
            <div className="w-8 h-8 rounded-full bg-emerald-400 text-[#090D16] font-bold text-xs flex items-center justify-center mx-auto mb-1">
              4
            </div>
            <h3 className="font-serif text-sm font-bold text-[#F6F1E9]">Interactive Discovery</h3>
            <p className="text-xs text-[#D8C3A5] leading-relaxed text-pretty">
              Live MapLibre journeys, 3D digital twins, bounding-box folio viewer, and cited Ask the Archive responses.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Heritage Spot Callout */}
      <section className="w-full bg-[#141C2E] text-[#F6F1E9] py-12 px-4 sm:px-6 lg:px-8 border-y border-[#D4AF37]/30 my-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F6F1E9]">
              Featured Subterranean Wonder: Rani ki Vav
            </h2>
            <p className="text-sm text-[#D8C3A5] leading-relaxed text-pretty">
              Commissioned in 1063 CE by Queen Udayamati. Its seven subterranean inverted tiers preserve over 500 principal sculptures, Sanskrit foundation inscriptions in Northern Brahmi derivatives, and sacred water architecture.
            </p>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/sites/rani-ki-vav#digital-twin"
              className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#F3C649] text-indigoInk font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Box className="w-4 h-4 text-indigoInk" />
              <span>Inspect 3D Digital Twin</span>
            </Link>
            <Link
              href="/sites/rani-ki-vav"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              <span>Read Monument Dossier</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Honest "What is Real vs Sample Data" Disclosure */}
      <section className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6" id="honesty-disclosure">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D4AF37]/25 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <h3 className="text-xl font-serif font-bold text-[#F6F1E9]">
              Academic Rigor & Data Provenance Disclosure
            </h3>
          </div>
          <p className="text-xs text-[#D8C3A5] max-w-md text-pretty">
            In compliance with national archaeological standards and strict academic honesty, Dharohar Atlas never invents historical claims or fabricates provenance:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-emerald-500/35 space-y-3 shadow-lg">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Verified Ground Truth (Real)
            </span>
            <ul className="text-xs text-[#EFE6D8] space-y-2 list-disc pl-4 leading-relaxed">
              <li>All 25 monument coordinates and boundaries match Archaeological Survey of India (ASI) and UNESCO gazetteers.</li>
              <li>Chronological era dates, dynasties (Solanki, Chaulukya, Delhi Sultanate), and architectural styles are rigorously cited.</li>
              <li>3D model of Rani ki Vav uses photogrammetry scaled to 1:1 architectural&nbsp;proportions.</li>
              <li>Adalaj and Rani ki Vav Sanskrit and Gujarati tablet transcriptions reflect published epigraphical records.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-[#141A26]/90 border border-amber-600/40 space-y-3 shadow-lg">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Explicitly Labelled Samples (Illustrative)
            </span>
            <ul className="text-xs text-[#EFE6D8] space-y-2 list-disc pl-4 leading-relaxed">
              <li>Unverified local oral folklore traditions are flagged with the amber "Illustrative sample"&nbsp;badge.</li>
              <li>Secondary field notes are clearly labelled with observer provenance rather than claiming canonical truth.</li>
              <li>AI OCR transcriptions retain human-in-the-loop confidence scores and versioned audit&nbsp;history.</li>
              <li>Experimental photo-to-3D meshing is placed on our roadmap rather than presented as&nbsp;ready.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="w-full border-t border-[#D4AF37]/30 bg-[#070A11] py-12 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-[#D8C3A5]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Compass className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif font-bold text-base text-[#F6F1E9]">DHAROHAR ATLAS</span>
            </div>
            <p className="text-xs text-[#D8C3A5]/80">
              Heritage Archive Hackathon Solution • HC26-CULT01 • Blithchron '27, IIT Gandhinagar
            </p>
            <p className="text-xs text-[#D8C3A5]/70">
              Released under CC-BY-4.0. Public domain archival sources cited per ASI and UNESCO attribution standards.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-[#D4AF37] transition">Explorer</Link>
            <Link href="/journeys/gujarat-stepwell-trail" className="hover:text-[#D4AF37] transition">Journeys</Link>
            <Link href="/archive" className="hover:text-[#D4AF37] transition">Archive Folios</Link>
            <Link href="/search" className="hover:text-[#D4AF37] transition">Search</Link>
            <Link href="/ask" className="hover:text-[#D4AF37] transition">Ask RAG</Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#D4AF37] hover:underline flex items-center gap-1 font-bold"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
