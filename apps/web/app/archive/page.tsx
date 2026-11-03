"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, UploadCloud, Search, Filter, CheckCircle2, 
  AlertTriangle, Clock, MapPin, Eye, FileText, Sparkles,
  Layers, ExternalLink, RefreshCw
} from "lucide-react";
import { apiClient, DocumentResponse } from "@/lib/api-client";
import { DocumentUploadModal } from "@/components/archive/DocumentUploadModal";

export default function ArchiveHubPage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDocuments();
      setDocuments(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load documents", err);
      setError(err.message || "Failed to load archival records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Filter logic
  const filteredDocuments = documents.filter((doc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchAttribution = doc.attribution?.toLowerCase().includes(q);
      const matchSource = doc.source?.toLowerCase().includes(q);
      if (!matchTitle && !matchAttribution && !matchSource) return false;
    }

    if (languageFilter !== "all") {
      const hint = (doc.language_hint || "").toLowerCase();
      if (languageFilter === "devanagari" && !hint.includes("hi") && !hint.includes("devanagari") && !hint.includes("san")) {
        return false;
      }
      if (languageFilter === "gujarati" && !hint.includes("gu")) {
        return false;
      }
      if (languageFilter === "english" && !hint.includes("en")) {
        return false;
      }
    }

    if (statusFilter !== "all" && doc.status !== statusFilter) {
      return false;
    }

    if (typeFilter !== "all" && doc.doc_type !== typeFilter) {
      return false;
    }

    return true;
  });

  const readyCount = documents.filter((d) => d.status === "ready").length;
  const reviewCount = documents.filter((d) => d.status === "needs_review").length;
  const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 1), 0);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#090D16] text-[#F6F1E9] flex flex-col">
      {/* Top Banner / Hero */}
      <section className="relative w-full border-b border-[#D4AF37]/30 bg-gradient-to-b from-[#14100B] to-[#090D16] px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#D4AF37] px-2 py-0.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                ARCHIVAL KNOWLEDGE LAYER
              </span>
              <span className="text-[11px] text-[#D8C3A5]/60">• Indian Epigraphy & Manuscripts</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#F6F1E9]">
              Revitalised Archival Corpus
            </h1>
            <p className="text-sm text-[#D8C3A5]/80 max-w-2xl font-light">
              High-resolution manuscripts, Solanki foundation tablets, and British-era architectural monographs.
              Digitised via multilingual OCR, aligned with domain heritage glossaries, and linked to spatial monuments.
            </p>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-black font-semibold text-sm tracking-wide flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Document Scan</span>
            </button>
            <button
              onClick={fetchDocs}
              className="p-2.5 rounded-lg border border-[#D4AF37]/30 hover:bg-white/5 text-[#D8C3A5] transition-colors"
              title="Refresh corpus"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Live Corpus Metrics */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
          <div className="p-3 rounded-lg bg-black/40 border border-white/5">
            <div className="text-xs text-[#D8C3A5]/70 font-serif">Total Ingested Folios</div>
            <div className="text-2xl font-bold text-[#F6F1E9] mt-1">{documents.length}</div>
            <div className="text-[10px] text-[#D4AF37] font-mono mt-0.5">{totalPages} rendered pages</div>
          </div>
          <div className="p-3 rounded-lg bg-black/40 border border-white/5">
            <div className="text-xs text-[#D8C3A5]/70 font-serif">Scripts Represented</div>
            <div className="text-2xl font-bold text-[#D4AF37] mt-1">3</div>
            <div className="text-[10px] text-[#D8C3A5]/60 font-mono mt-0.5">Devanagari • Gujarati • Latin</div>
          </div>
          <div className="p-3 rounded-lg bg-black/40 border border-white/5">
            <div className="text-xs text-[#D8C3A5]/70 font-serif">Fully Verified / Ready</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{readyCount}</div>
            <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">Automated quality certified</div>
          </div>
          <div className="p-3 rounded-lg bg-black/40 border border-white/5">
            <div className="text-xs text-[#D8C3A5]/70 font-serif">Needs Human Review</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{reviewCount}</div>
            <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">Low confidence flagged</div>
          </div>
        </div>
      </section>

      {/* Main Content & Filter Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col space-y-6">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-[#120E0A] border border-[#D4AF37]/30 shadow-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#D8C3A5]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, attribution or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-[#F6F1E9] placeholder-[#D8C3A5]/40 focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language */}
            <select
              aria-label="Filter documents by script or language"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-[#D8C3A5] focus:border-[#D4AF37] outline-none"
            >
              <option value="all">All Scripts & Languages</option>
              <option value="devanagari">Devanagari (Sanskrit/Hindi)</option>
              <option value="gujarati">Gujarati Script</option>
              <option value="english">English / Latin</option>
            </select>

            {/* Status */}
            <select
              aria-label="Filter documents by processing status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-[#D8C3A5] focus:border-[#D4AF37] outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready (High Confidence)</option>
              <option value="needs_review">Needs Review</option>
              <option value="processing">Processing</option>
            </select>

            {/* Type */}
            <select
              aria-label="Filter documents by archival type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-[#D8C3A5] focus:border-[#D4AF37] outline-none"
            >
              <option value="all">All Document Types</option>
              <option value="inscription">Inscriptions</option>
              <option value="printed">Printed Monographs</option>
              <option value="handwritten">Handwritten Folios</option>
              <option value="journal">Field Journals</option>
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-xl bg-[#120E0A] border border-[#D4AF37]/20 space-y-4">
            <BookOpen className="w-12 h-12 text-[#D4AF37]/50 mx-auto" />
            <h3 className="font-serif text-lg text-[#F6F1E9]">No Archival Documents Match Criteria</h3>
            <p className="text-xs text-[#D8C3A5]/60 max-w-md mx-auto">
              Try adjusting search terms or filter selections. You can also upload a scanned regional manuscript directly.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold hover:bg-[#D4AF37]/30 transition-all inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest New Document</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => {
              const firstPage = doc.pages?.[0];
              const totalLines = (doc.pages || []).reduce((acc, p) => acc + (p.ocr_lines?.length || 0), 0);
              const previewImg = firstPage?.image_key ? `http://localhost:8000${firstPage.image_key}` : null;

              return (
                <div
                  key={doc.id}
                  className="group flex flex-col rounded-xl bg-[#14100B] border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-lg hover:shadow-xl hover:shadow-[#D4AF37]/10 transition-all overflow-hidden"
                >
                  {/* Thumbnail / Image Preview Header */}
                  <div className="relative h-44 w-full bg-[#1A1510] border-b border-[#D4AF37]/20 flex items-center justify-center overflow-hidden">
                    {previewImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImg}
                        alt={doc.title}
                        className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        onError={(e) => {
                          // Hide on local mock fallback
                          (e.target as any).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#D8C3A5]/40">
                        <FileText className="w-10 h-10" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Scanned Folio</span>
                      </div>
                    )}

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-black/70 border border-[#D4AF37]/40 text-[#D4AF37] backdrop-blur-sm">
                        {doc.doc_type?.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium bg-black/60 border border-white/10 text-[#F6F1E9] backdrop-blur-sm">
                        {doc.language_hint === "gu" ? "Gujarati" : doc.language_hint === "hi" ? "Devanagari" : doc.language_hint?.toUpperCase()}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      {doc.status === "ready" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center gap-1 backdrop-blur-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      ) : doc.status === "needs_review" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 border border-amber-500/50 text-amber-400 flex items-center gap-1 backdrop-blur-sm">
                          <AlertTriangle className="w-3 h-3" />
                          Needs Review
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-950/80 border border-blue-500/50 text-blue-400 flex items-center gap-1 backdrop-blur-sm">
                          <Clock className="w-3 h-3 animate-spin" />
                          {doc.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-serif text-base font-bold text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-[#D8C3A5]/70 line-clamp-2 font-light">
                        {doc.attribution || doc.source || "Historical archival survey record"}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5 text-xs text-[#D8C3A5]/80">
                      {/* Linked site */}
                      {doc.site ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#D4AF37]">
                          <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                          <span className="font-medium truncate">{doc.site.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Unlinked regional archive</span>
                        </div>
                      )}

                      {/* Line & entity metrics */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#D8C3A5]/60">
                        <span>{totalLines > 0 ? `${totalLines} OCR lines` : "Digitising..."}</span>
                        <span>{doc.licence || "CC-BY-4.0"}</span>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="pt-2">
                      <Link
                        href={`/archive/${doc.id}`}
                        className="w-full py-2 px-3 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] font-medium text-xs flex items-center justify-center gap-2 group-hover:border-[#D4AF37] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Side-by-Side Viewer</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetchDocs();
        }}
      />
    </div>
  );
}
