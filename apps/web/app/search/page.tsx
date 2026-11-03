"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Compass, BookOpen, ScrollText, Sparkles, 
  MapPin, Box, ArrowRight, ExternalLink, Filter, 
  Layers, RefreshCw, HelpCircle
} from "lucide-react";
import { apiClient, SearchResponse, SearchHit } from "@/lib/api-client";
import { AskTheArchivePanel } from "@/components/search/AskTheArchivePanel";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTypes = searchParams.getAll("types");
  const initialState = searchParams.getAll("state");

  const [query, setQuery] = useState(initialQuery);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [selectedStates, setSelectedStates] = useState<string[]>(initialState);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "sites" | "documents" | "folklore" | "observations">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available filters
  const availableStates = ["Gujarat", "Rajasthan", "Maharashtra", "Madhya Pradesh"];
  const typeOptions = [
    { id: "site", label: "Monuments & Sites", icon: Compass },
    { id: "document_line_group", label: "Archival Folios & Epigraphs", icon: BookOpen },
    { id: "folklore", label: "Folklore & Oral Lore", icon: ScrollText },
    { id: "observation", label: "Field Observations", icon: Layers },
  ];

  const performSearch = async (qText: string) => {
    if (!qText.trim()) {
      setSearchResponse(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.searchArchive({
        q: qText.trim(),
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        state: selectedStates.length > 0 ? selectedStates : undefined,
        limit: 40,
      });
      setSearchResponse(res);
    } catch (err: any) {
      console.error("Search error:", err);
      setError("Failed to retrieve archive search results. Please check server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, selectedTypes, selectedStates]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const sp = new URLSearchParams();
    sp.set("q", query.trim());
    selectedTypes.forEach((t) => sp.append("types", t));
    selectedStates.forEach((s) => sp.append("state", s));
    router.push(`/search?${sp.toString()}`);
  };

  const toggleTypeFilter = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const toggleStateFilter = (st: string) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Helper to render matched-by badges
  const renderMatchedByBadges = (matchedBy: string[]) => {
    return (
      <div className="flex items-center gap-1">
        {(matchedBy || []).map((mb) => {
          if (mb === "semantic") {
            return (
              <span
                key={mb}
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
                title="Matched via HNSW vector semantic similarity"
              >
                Semantic
              </span>
            );
          }
          if (mb === "keyword") {
            return (
              <span
                key={mb}
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30"
                title="Matched via PostgreSQL Full-Text Search unaccent"
              >
                Keyword FTS
              </span>
            );
          }
          if (mb === "name") {
            return (
              <span
                key={mb}
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                title="Exact title or trigram lexical match"
              >
                Name Match
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const grouped = searchResponse?.grouped || {
    sites: [],
    documents: [],
    folklore: [],
    observations: [],
  };

  const totalHits = searchResponse?.total || 0;

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F6F1E9] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Search & Filter Bar */}
      <div className="glass-panel-gold rounded-2xl p-6 border border-[#D4AF37]/40 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-[#D4AF37]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across 25 monuments, 52 folios, and folklore (EN / हिन्दी / ગુજરાતી)..."
              className="w-full bg-black/50 border border-[#D4AF37]/40 rounded-xl pl-11 pr-4 py-3 text-sm text-[#F6F1E9] placeholder-[#A89F91] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#F3C649] text-indigoInk font-bold text-sm shadow-lg shadow-black/50 transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 text-indigoInk" />
            <span>Search Archive</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              showFilters || selectedTypes.length > 0 || selectedStates.length > 0
                ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                : "border-white/10 hover:border-white/20 text-[#D8C3A5]"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {(selectedTypes.length > 0 || selectedStates.length > 0) && (
              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-indigoInk text-[11px] font-bold flex items-center justify-center">
                {selectedTypes.length + selectedStates.length}
              </span>
            )}
          </button>
        </form>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            {/* Source Types */}
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] mb-2">
                Record Type
              </p>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((t) => {
                  const active = selectedTypes.includes(t.id);
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTypeFilter(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        active
                          ? "bg-[#D4AF37] text-indigoInk border-[#D4AF37] font-bold shadow-md shadow-black/50"
                          : "bg-white/5 border-white/10 text-[#D8C3A5] hover:border-white/25"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Geographic State */}
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] mb-2">
                Region / State
              </p>
              <div className="flex flex-wrap gap-2">
                {availableStates.map((st) => {
                  const active = selectedStates.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStateFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? "bg-[#D4AF37] text-indigoInk border-[#D4AF37] font-bold shadow-md shadow-black/50"
                          : "bg-white/5 border-white/10 text-[#D8C3A5] hover:border-white/25"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search Metadata & Detected Language */}
        {searchResponse && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[#D8C3A5]/70 font-mono">
            <div className="flex items-center gap-2">
              <span>Found <strong className="text-[#D4AF37]">{totalHits}</strong> records</span>
              <span>•</span>
              <span>Detected script: <span className="uppercase text-[#D4AF37] font-semibold">{searchResponse.detected_lang}</span></span>
              {searchResponse.detected_lang === "hi" && (
                <span className="text-[11px] text-amber-300 font-serif">
                  (हिन्दी देवनागरी खोज सक्रिय)
                </span>
              )}
              {searchResponse.detected_lang === "gu" && (
                <span className="text-[11px] text-amber-300 font-serif">
                  (ગુજરાતી અક્ષર શોધ સક્રિય)
                </span>
              )}
            </div>

            <div className="hidden sm:inline">
              Latency: {searchResponse.latency_ms} ms (pgvector HNSW + FTS RRF)
            </div>
          </div>
        )}
      </div>

      {/* Grounded "Ask the Archive" Panel */}
      {query && (
        <AskTheArchivePanel initialQuestion={query} />
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 py-8">
          <div className="flex items-center justify-center gap-3 text-sm text-[#D4AF37] font-mono">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Consulting pgvector HNSW index & PostgreSQL full-text search...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Grouped Results Sections */}
      {searchResponse && !loading && (
        <div className="space-y-8">
          {/* Group Tab Bar */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#D8C3A5]/70 hover:text-[#D4AF37]"
              }`}
            >
              <span>All Records</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                {totalHits}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sites")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "sites"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#D8C3A5]/70 hover:text-[#D4AF37]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Monuments & Sites</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                {grouped.sites.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("documents")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "documents"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#D8C3A5]/70 hover:text-[#D4AF37]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Archival Folios & Lines</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                {grouped.documents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("folklore")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "folklore"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#D8C3A5]/70 hover:text-[#D4AF37]"
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Folklore & Legends</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                {grouped.folklore.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("observations")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "observations"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                  : "text-[#D8C3A5]/70 hover:text-[#D4AF37]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architectural Observations</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                {grouped.observations.length}
              </span>
            </button>
          </div>

          {/* SITES SECTION */}
          {(activeTab === "all" || activeTab === "sites") && grouped.sites.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#F6F1E9] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#D4AF37]" />
                  <span>Monuments & Heritage Sites ({grouped.sites.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.sites.map((hit) => {
                  const siteMeta = (hit.metadata || {}) as Record<string, any>;
                  const siteSlug = (hit.site as any)?.slug || siteMeta.site_slug || siteMeta.slug;
                  const snippetText = hit.highlighted_snippet || hit.text;

                  return (
                    <div
                      key={hit.id}
                      className="glass-panel rounded-xl p-5 border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            href={siteSlug ? `/sites/${siteSlug}` : `/explore?site=${hit.site_id || hit.source_id}`}
                            className="font-serif font-bold text-base text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors"
                            aria-label={hit.title || "Heritage Site Record"}
                          >
                            {hit.title || "Heritage Site Record"}
                          </Link>
                          {renderMatchedByBadges(hit.matched_by)}
                        </div>

                        {/* Snippet with <mark> */}
                        <p
                          className="text-xs text-[#D8C3A5]/80 font-serif leading-relaxed mb-4 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: snippetText }}
                        />

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#D8C3A5]/60 mb-4">
                          {siteMeta.state && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              📍 {String(siteMeta.state)}
                            </span>
                          )}
                          {siteMeta.dynasty && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              👑 {String(siteMeta.dynasty)}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                            Confidence: {String(siteMeta.data_confidence || "verified")}
                          </span>
                          <span className="text-[#D4AF37]/80">
                            RRF: {hit.rrf_score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {siteSlug && (
                            <Link
                              href={`/sites/${siteSlug}`}
                              className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-xs font-semibold flex items-center gap-1"
                            >
                              <span>Open Site</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                          <Link
                            href={`/explore?site=${hit.site_id || hit.source_id}`}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#D8C3A5] text-xs font-semibold flex items-center gap-1 border border-white/10"
                          >
                            <MapPin className="w-3 h-3 text-[#C85A32]" />
                            <span>Show on Map</span>
                          </Link>
                        </div>

                        {siteSlug && (
                          <Link
                            href={`/sites/${siteSlug}#twin`}
                            className="text-xs text-[#D8C3A5]/70 hover:text-[#D4AF37] flex items-center gap-1 font-mono"
                          >
                            <Box className="w-3.5 h-3.5" />
                            <span>3D Twin</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOCUMENTS & FOLIOS SECTION */}
          {(activeTab === "all" || activeTab === "documents") && grouped.documents.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#C85A32]" />
                <span>Archival Folios & Document Inscriptions ({grouped.documents.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.documents.map((hit) => {
                  const firstLineId = hit.line_ids?.[0];
                  const lineRangeStr = hit.start_line_no ? `Lines ${hit.start_line_no}-${hit.end_line_no}` : null;
                  const deepLinkUrl = hit.document_id
                    ? `/archive/${hit.document_id}${firstLineId ? `?line=${firstLineId}` : ""}`
                    : "#";
                  const snippetText = hit.highlighted_snippet || hit.text;

                  return (
                    <div
                      key={hit.id}
                      className="glass-panel rounded-xl p-5 border border-[#C85A32]/30 hover:border-[#C85A32]/60 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            href={deepLinkUrl}
                            className="font-serif font-bold text-base text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors"
                            aria-label={hit.title || "Archival Inscription Folio"}
                          >
                            {hit.title || "Archival Inscription Folio"}
                          </Link>
                          {renderMatchedByBadges(hit.matched_by)}
                        </div>

                        {/* Highlighted text */}
                        <p
                          className="text-xs text-[#D8C3A5]/90 font-serif leading-relaxed mb-3 bg-black/40 p-2.5 rounded border border-white/5"
                          dangerouslySetInnerHTML={{ __html: snippetText }}
                        />

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#D8C3A5]/60 mb-4">
                          <span className="uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37]">
                            {hit.lang}
                          </span>
                          {lineRangeStr && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300">
                              📜 {lineRangeStr}
                            </span>
                          )}
                          {hit.is_illustrative && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Illustrative Sample
                            </span>
                          )}
                          <span className="text-[#D4AF37]/80">
                            RRF: {hit.rrf_score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <Link
                          href={deepLinkUrl}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk hover:opacity-95 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#D4AF37]/20"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigoInk" />
                          <span>Open at exact line</span>
                          <ExternalLink className="w-3 h-3 text-indigoInk" />
                        </Link>

                        {hit.site_id && (
                          <Link
                            href={`/explore?site=${hit.site_id}`}
                            className="text-xs text-[#D8C3A5]/70 hover:text-[#D4AF37] flex items-center gap-1 font-mono"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                            <span>Linked Site</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FOLKLORE & ORAL HISTORIES */}
          {(activeTab === "all" || activeTab === "folklore") && grouped.folklore.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9] flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-amber-400" />
                <span>Folklore, Legends & Oral Traditions ({grouped.folklore.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.folklore.map((hit) => {
                  const folkMeta = (hit.metadata || {}) as Record<string, any>;
                  const snippetText = hit.highlighted_snippet || hit.text;

                  return (
                    <div
                      key={hit.id}
                      className="glass-panel rounded-xl p-5 border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-serif font-bold text-base text-[#F6F1E9]">
                            {hit.title}
                          </h4>
                          {renderMatchedByBadges(hit.matched_by)}
                        </div>

                        <p
                          className="text-xs text-[#D8C3A5]/80 font-serif leading-relaxed mb-3 italic"
                          dangerouslySetInnerHTML={{ __html: snippetText }}
                        />

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#D8C3A5]/60 mb-4">
                          <span className="uppercase px-1.5 py-0.5 rounded bg-white/5 text-amber-300">
                            {hit.lang}
                          </span>
                          {folkMeta.source_tradition && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                              Tradition: {String(folkMeta.source_tradition)}
                            </span>
                          )}
                          <span className="text-amber-400/80">
                            RRF: {hit.rrf_score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        {hit.site_id && (
                          <Link
                            href={`/explore?site=${hit.site_id}`}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#D8C3A5] flex items-center gap-1 border border-white/10"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                            <span>Show on Map</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARCHITECTURAL OBSERVATIONS */}
          {(activeTab === "all" || activeTab === "observations") && grouped.observations.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9] flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Field Architectural Observations ({grouped.observations.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.observations.map((hit) => {
                  const obsMeta = (hit.metadata || {}) as Record<string, any>;
                  const snippetText = hit.highlighted_snippet || hit.text;

                  return (
                    <div
                      key={hit.id}
                      className="glass-panel rounded-xl p-5 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-serif font-bold text-base text-[#F6F1E9]">
                            {hit.title}
                          </h4>
                          {renderMatchedByBadges(hit.matched_by)}
                        </div>

                        <p
                          className="text-xs text-[#D8C3A5]/80 font-serif leading-relaxed mb-3"
                          dangerouslySetInnerHTML={{ __html: snippetText }}
                        />

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#D8C3A5]/60 mb-4">
                          {obsMeta.element_type && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 capitalize">
                              Element: {String(obsMeta.element_type)}
                            </span>
                          )}
                          {obsMeta.preservation_status && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 capitalize">
                              Status: {String(obsMeta.preservation_status)}
                            </span>
                          )}
                          <span className="text-emerald-400/80">
                            RRF: {hit.rrf_score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        {hit.site_id && (
                          <Link
                            href={`/explore?site=${hit.site_id}`}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#D8C3A5] flex items-center gap-1 border border-white/10"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                            <span>Show on Map</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zero results */}
          {totalHits === 0 && (
            <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#D4AF37]">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F6F1E9]">
                No matching records found in the archive
              </h3>
              <p className="text-xs text-[#D8C3A5]/70 max-w-md mx-auto">
                Try broader keywords, Indic spellings, or consult the curated inquiries below.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "Rani ki Vav",
                  "Solanki stepwell",
                  "વાવ",
                  "सोमनाथ",
                  "Dholavira reservoir",
                  "Sun Temple Modhera",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      performSearch(s);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dev / Quality indicator footer */}
      {searchResponse && (
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D8C3A5]/50 font-mono">
          <div className="flex items-center gap-3">
            <span>Dharohar Retrieval Pipeline: pgvector HNSW (cosine) + PostgreSQL FTS simple unaccent + pg_trgm</span>
            <span>•</span>
            <span>RRF k=60</span>
          </div>
          <Link
            href="/admin/search"
            className="text-[#D4AF37]/80 hover:underline flex items-center gap-1"
          >
            <span>Search Analytics & Diagnostic Metrics</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-sm text-[#D4AF37] font-mono">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Dharohar Search Archive...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
