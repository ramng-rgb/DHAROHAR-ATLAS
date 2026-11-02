"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Eye, FileText, CheckCircle2, Clock, UploadCloud, MapPin } from "lucide-react";
import { apiClient, DocumentResponse } from "@/lib/api-client";
import { DocumentUploadModal } from "@/components/archive/DocumentUploadModal";

interface SiteArchiveDocumentsSectionProps {
  siteId: string;
  siteName: string;
}

export function SiteArchiveDocumentsSection({ siteId, siteName }: SiteArchiveDocumentsSectionProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchSiteDocuments = async () => {
    setLoading(true);
    try {
      const docs = await apiClient.getDocuments({ site_id: siteId });
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load site documents", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchSiteDocuments();
    }
  }, [siteId]);

  return (
    <section id="archive-section" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#D4AF37]/20 pb-3">
        <div>
          <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
            Archival Revitalisation Layer
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <span>Archive Documents & Inscriptions</span>
            <span className="text-xs font-mono font-normal text-[#D4AF37] px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              {documents.length} Folios
            </span>
          </h2>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Inscription / Folio</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#14100B] border border-[#D4AF37]/20 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#D4AF37]/40 mx-auto" />
          <p className="text-xs text-[#D8C3A5]/70 max-w-md mx-auto">
            No archival folios or epigraphical survey monographs currently linked to {siteName}.
            Upload a foundation tablet photo or historical scan to activate OCR and translation for this monument.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-3 py-1.5 rounded bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-xs font-semibold border border-[#D4AF37]/30 inline-flex items-center gap-1.5 transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Contribute First Folio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const firstPage = doc.pages?.[0];
            const lineCount = (doc.pages || []).reduce((acc, p) => acc + (p.ocr_lines?.length || 0), 0);
            const previewImg = firstPage?.image_key ? `http://localhost:8000${firstPage.image_key}` : null;

            return (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-xl bg-[#14100B] border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-lg transition-all overflow-hidden"
              >
                <div className="relative h-36 w-full bg-[#1A1510] border-b border-[#D4AF37]/20 flex items-center justify-center overflow-hidden">
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImg}
                      alt={doc.title}
                      className="w-full h-full object-cover object-top opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#D8C3A5]/40">
                      <FileText className="w-8 h-8" />
                      <span className="text-[9px] font-mono uppercase">Archival Record</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-black/70 border border-[#D4AF37]/40 text-[#D4AF37] backdrop-blur-sm">
                      {doc.doc_type}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    {doc.status === "ready" ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-1 backdrop-blur-sm">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-950/80 border border-blue-500/50 text-blue-300 flex items-center gap-1 backdrop-blur-sm">
                        <Clock className="w-2.5 h-2.5 animate-spin" />
                        {doc.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-[#D8C3A5]/60 line-clamp-1 mt-1 font-light">
                      {doc.attribution || doc.source}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#D8C3A5]/60">
                    <span>{lineCount} OCR lines</span>
                    <span>{doc.licence || "CC-BY-4.0"}</span>
                  </div>

                  <Link
                    href={`/archive/${doc.id}`}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Side-by-Side Viewer</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchSiteDocuments();
        }}
      />
    </section>
  );
}
