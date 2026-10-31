"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, Sparkles, BookOpen, MapPin, Box, ArrowRight, 
  Layers, MessageSquare, Quote, AlertCircle, CheckCircle2, Compass
} from "lucide-react";
import { searchArchive, askTheArchive, SearchResponse, AskArchiveResponse } from "@/lib/api";

export function SemanticSearchBox() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"hybrid" | "ask">("hybrid");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [ragResult, setRagResult] = useState<AskArchiveResponse | null>(null);

  const sampleQueries = [
    "Who built Rani ki Vav and what is its architectural style?",
    "Solanki dynasty stepwells in Gujarat",
    "વાવ નિર્માણ શિલ્પશાસ્ત્ર (Stepwell architecture)",
    "Harappan water engineering in Dholavira",
    "Kumbhalgarh 36 km perimeter wall"
  ];

  const handleSearch = async (qText?: string) => {
    const q = qText || query;
    if (!q.trim()) return;

    try {
      setLoading(true);
      if (mode === "hybrid") {
        const res = await searchArchive(q);
        setSearchResult(res);
        setRagResult(null);
      } else {
        const res = await askTheArchive(q);
        setRagResult(res);
        setSearchResult(null);
      }
    } catch (err) {
      console.error(err);
      alert("Search request failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search Container */}
      <div className="glass-panel-gold rounded-2xl p-6 border border-[#D4AF37]/50 shadow-2xl space-y-4">
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode("hybrid"); setRagResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === "hybrid"
                  ? "bg-[#D4AF37] text-indigoInk shadow-md shadow-[#D4AF37]/20"
                  : "text-[#D8C3A5] hover:text-[#D4AF37]"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Hybrid Semantic Search (pgvector + RRF)</span>
            </button>

            <button
              onClick={() => { setMode("ask"); setSearchResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === "ask"
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk shadow-md shadow-[#D4AF37]/20"
                  : "text-[#D8C3A5] hover:text-[#D4AF37]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigoInk fill-indigoInk" />
              <span>Ask the Archive (Cited RAG)</span>
            </button>
          </div>

          <span className="text-[11px] text-[#D8C3A5]/60 font-serif hidden sm:inline">
            English • हिन्दी • ગુજરાતી • Sanskrit
          </span>
        </div>

        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "hybrid"
                ? "Search across all sites, OCR folios, and folklore (e.g. 'Solanki stepwell Patan')..."
                : "Ask any historical question with cited archaeological grounding..."
            }
            className="w-full bg-[#090D16] border-2 border-[#D4AF37]/50 rounded-xl py-3.5 pl-11 pr-32 text-sm text-[#F6F1E9] placeholder-[#D8C3A5]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-sans"
          />
          <Search className="w-5 h-5 text-[#D4AF37] absolute left-3.5" />

          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-1.5"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-indigoInk border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{mode === "hybrid" ? "Explore" : "Ask"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#D4AF37] font-serif mr-1">Suggested:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-[11px] px-2.5 py-1 rounded bg-[#1A1510] border border-[#D4AF37]/30 text-[#D8C3A5] hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* RAG "Ask the Archive" Answer Box with Inline Citations */}
      {ragResult && (
        <div className="glass-panel-gold rounded-2xl p-6 border-2 border-[#D4AF37]/60 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/30">
            <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
              <Sparkles className="w-4 h-4" />
              <span>Archive Synthesis (Grounding Confidence: {(ragResult.confidence * 100).toFixed(0)}%)</span>
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Peer-Cited Record
            </span>
          </div>

          <p className="text-base text-[#F6F1E9] leading-relaxed font-sans">
            {ragResult.answer}
          </p>

          {/* Citations List */}
          {ragResult.citations.length > 0 && (
            <div className="pt-4 border-t border-[#D4AF37]/20 space-y-2">
              <h4 className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-wider">
                Inline Archaeological Citations:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ragResult.citations.map((cite) => (
                  <div
                    key={cite.index}
                    className="p-3 rounded-lg bg-[#090D16] border border-[#D4AF37]/30 text-xs text-[#D8C3A5] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#D4AF37]">
                        [{cite.index}] {cite.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                        {cite.content_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#EFE6D8]/80 line-clamp-2 italic">
                      "{cite.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hybrid Search Results */}
      {searchResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs text-[#D8C3A5] font-serif">
            <span>
              Reciprocal Rank Fusion returned <strong>{searchResult.total}</strong> results for "{searchResult.query}"
            </span>
            <span className="text-[#D4AF37]">HNSW Dense Cosine + Trigram BM25</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {searchResult.results.map((item) => (
              <div
                key={item.id}
                className="glass-panel rounded-xl p-5 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C85A32]/30 text-[#E07A5F] border border-[#C85A32]/40">
                        {item.content_type.replace("_", " ")}
                      </span>
                      {item.era && (
                        <span className="text-[11px] text-[#D4AF37] font-serif">
                          {item.era}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                      {item.title}
                    </h3>
                  </div>

                  <span className="text-[11px] font-bold px-2 py-1 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex-shrink-0">
                    RRF Score: {item.rrf_score}
                  </span>
                </div>

                <p className="text-sm text-[#EFE6D8] leading-relaxed">
                  {item.text_snippet}
                </p>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3 border-t border-[#D4AF37]/15">
                  {item.slug && (
                    <Link
                      href={`/sites/${item.slug}`}
                      className="text-xs px-3 py-1.5 rounded bg-[#D4AF37] text-indigoInk font-bold hover:bg-[#F3C649] flex items-center gap-1"
                    >
                      <span>Open Site Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {item.has_3d && item.slug && (
                    <Link
                      href={`/sites/${item.slug}#viewer3d`}
                      className="text-xs px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1 font-semibold"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Open 3D Model</span>
                    </Link>
                  )}

                  {item.latitude && item.longitude && (
                    <Link
                      href={`/explorer?lat=${item.latitude}&lng=${item.longitude}`}
                      className="text-xs text-[#D8C3A5] hover:text-[#D4AF37] flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>View on Historical Map</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
