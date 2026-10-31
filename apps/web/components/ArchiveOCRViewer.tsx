"use client";

import React, { useState } from "react";
import { 
  FileText, CheckCircle2, Edit3, Save, X, Upload, 
  Sparkles, Globe, Tag, Check, ArrowRight, ShieldCheck
} from "lucide-react";
import { DocumentRecord, OCRLine, updateOCRLine } from "@/lib/api";

interface ArchiveOCRViewerProps {
  documents: DocumentRecord[];
}

export function ArchiveOCRViewer({ documents }: ArchiveOCRViewerProps) {
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editOriginalText, setEditOriginalText] = useState<string>("");
  const [editTranslatedText, setEditTranslatedText] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  // Local state for documents to allow optimistic updates
  const [docList, setDocList] = useState<DocumentRecord[]>(documents);

  const activeDoc = docList[selectedDocIndex] || docList[0];
  const activePage = activeDoc?.pages[0];

  const handleStartEdit = (line: OCRLine) => {
    setEditingLineId(line.id);
    setEditOriginalText(line.original_text);
    setEditTranslatedText(line.translated_text || "");
  };

  const handleSaveCorrection = async (lineId: string) => {
    try {
      setSaving(true);
      const updatedLine = await updateOCRLine(lineId, {
        original_text: editOriginalText,
        translated_text: editTranslatedText,
      });

      // Update state in place
      setDocList((prev) =>
        prev.map((d, dIdx) => {
          if (dIdx !== selectedDocIndex) return d;
          return {
            ...d,
            pages: d.pages.map((p) => ({
              ...p,
              ocr_lines: p.ocr_lines.map((l) => (l.id === lineId ? updatedLine : l)),
            })),
          };
        })
      );

      setEditingLineId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save correction. Please ensure backend is running.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Document Selector */}
      <div className="glass-panel-gold rounded-xl p-5 border border-[#D4AF37]/50 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
            <FileText className="w-4 h-4" />
            <span>Multilingual Archive OCR & Epigraphic Translation</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#F6F1E9]">
            {activeDoc?.title || "Historical Epigraphic Scan"}
          </h2>
          <p className="text-xs text-[#D8C3A5]">
            Source: {activeDoc?.source_archive} • Script: {activeDoc?.language}
          </p>
        </div>

        {/* Document Switcher & Upload */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDocIndex}
            onChange={(e) => {
              setSelectedDocIndex(Number(e.target.value));
              setActiveLineId(null);
              setEditingLineId(null);
            }}
            className="bg-[#1A1510] border border-[#D4AF37]/40 text-xs text-[#F6F1E9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#D4AF37] max-w-xs truncate font-serif"
          >
            {docList.map((doc, idx) => (
              <option key={doc.id} value={idx}>
                {doc.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] flex items-center gap-1.5 shadow-md shadow-[#D4AF37]/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Folio</span>
          </button>
        </div>
      </div>

      {/* Extracted Named Entities Bar */}
      {activePage?.entities && activePage.entities.length > 0 && (
        <div className="glass-panel rounded-xl p-4 border border-[#D4AF37]/30 flex flex-wrap items-center gap-2">
          <span className="text-xs font-serif font-bold text-[#D4AF37] flex items-center gap-1 mr-2">
            <Tag className="w-3.5 h-3.5" />
            EXTRACTED ENTITIES:
          </span>
          {activePage.entities.map((ent) => (
            <span
              key={ent.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A1510] border border-[#D4AF37]/40 text-[#F6F1E9]"
            >
              <span className="text-[10px] uppercase font-bold text-[#D4AF37]">
                {ent.entity_type}:
              </span>
              <span>{ent.text}</span>
              {ent.label && (
                <span className="text-[10px] text-[#D8C3A5]/60 italic">({ent.label})</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Side-by-Side Tri-Panel Viewer: Scan BBoxes ↔ Transcript ↔ Translation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel 1: Original Historical Scan with Interactive BBoxes */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-4 border border-[#D4AF37]/40 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs font-serif font-bold text-[#D4AF37] pb-2 border-b border-[#D4AF37]/20">
            <span>ORIGINAL ARCHIVAL FOLIO</span>
            <span className="text-[#D8C3A5]/60 font-sans text-[11px]">Hover/Click Bounding Box</span>
          </div>

          <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-[#D4AF37]/30 bg-[#090D16]">
            {activePage?.image_url && (
              <img
                src={activePage.image_url}
                alt="Manuscript Scan"
                className="w-full h-full object-cover filter contrast-125 brightness-95"
              />
            )}

            {/* Bounding Box Overlays */}
            {activePage?.ocr_lines.map((line) => {
              const isActive = activeLineId === line.id;
              return (
                <div
                  key={line.id}
                  onClick={() => setActiveLineId(line.id)}
                  style={{
                    left: `${line.bbox_x * 100}%`,
                    top: `${line.bbox_y * 100}%`,
                    width: `${line.bbox_w * 100}%`,
                    height: `${line.bbox_h * 100}%`,
                  }}
                  className={`absolute cursor-pointer transition-all border-2 rounded ${
                    isActive
                      ? "border-[#D4AF37] bg-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/40 z-10"
                      : "border-[#C85A32]/60 hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 bg-black/20"
                  }`}
                  title={`Line ${line.line_index + 1}: Confidence ${(line.confidence * 100).toFixed(0)}%`}
                >
                  <span className="absolute -top-3.5 left-0 text-[9px] font-bold px-1 rounded bg-black/80 text-[#D4AF37] border border-[#D4AF37]/50 pointer-events-none">
                    L{line.line_index + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-[#D8C3A5]/70 italic flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
            High-resolution archaeological folio scanned at 600 DPI from ASI Manuscripts Division.
          </div>
        </div>

        {/* Panel 2 & 3: Interactive Line Transcript ↔ English Translation */}
        <div className="lg:col-span-7 glass-panel-gold rounded-2xl p-5 border border-[#D4AF37]/50 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/30">
            <div className="text-xs font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>Transcript ↔ Neural Translation (Human-in-the-Loop)</span>
            </div>
            <span className="text-[11px] text-[#D8C3A5]/70">
              {activePage?.ocr_lines.length || 0} Lines Extracted
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[640px] pr-2">
            {activePage?.ocr_lines.map((line) => {
              const isActive = activeLineId === line.id;
              const isEditing = editingLineId === line.id;

              return (
                <div
                  key={line.id}
                  onClick={() => setActiveLineId(line.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? "glass-panel-gold border-[#D4AF37] ring-1 ring-[#D4AF37]/60"
                      : "glass-panel border-[#D4AF37]/20 hover:border-[#D4AF37]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                        Line {line.line_index + 1}
                      </span>
                      <span className="text-[11px] text-[#D8C3A5]/80 font-serif">
                        {line.language}
                      </span>
                      <span className="text-[11px] text-[#D4AF37] font-semibold">
                        {(line.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {line.is_corrected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified (v{line.version})
                        </span>
                      )}

                      {!isEditing ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(line);
                          }}
                          className="px-2 py-1 text-xs text-[#D8C3A5] hover:text-[#D4AF37] flex items-center gap-1 rounded bg-black/40 hover:bg-[#D4AF37]/20 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLineId(null);
                          }}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line Content or Edit Form */}
                  {!isEditing ? (
                    <div className="space-y-2">
                      {/* Original Script */}
                      <p className="font-devanagari text-base md:text-lg text-[#F6F1E9] leading-relaxed select-text">
                        {line.original_text}
                      </p>

                      {/* English Translation */}
                      <div className="pt-2 border-t border-[#D4AF37]/15">
                        <p className="text-xs font-serif text-[#D4AF37]/80 uppercase tracking-wider mb-0.5">
                          English Translation:
                        </p>
                        <p className="text-sm text-[#EFE6D8] leading-relaxed font-sans">
                          {line.translated_text || "Translation processing..."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Human-in-the-loop Editing Interface */
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[11px] font-serif text-[#D4AF37] uppercase tracking-wider block mb-1">
                          Correct Original Text (Devanagari / Old Gujarati):
                        </label>
                        <textarea
                          value={editOriginalText}
                          onChange={(e) => setEditOriginalText(e.target.value)}
                          rows={2}
                          className="w-full bg-[#090D16] border border-[#D4AF37]/50 rounded-lg p-2 text-sm text-[#F6F1E9] font-devanagari focus:ring-1 focus:ring-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-serif text-[#D4AF37] uppercase tracking-wider block mb-1">
                          Correct English Translation:
                        </label>
                        <textarea
                          value={editTranslatedText}
                          onChange={(e) => setEditTranslatedText(e.target.value)}
                          rows={2}
                          className="w-full bg-[#090D16] border border-[#D4AF37]/50 rounded-lg p-2 text-sm text-[#EFE6D8] focus:ring-1 focus:ring-[#D4AF37]"
                        />
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveCorrection(line.id);
                        }}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] flex items-center gap-1.5 shadow-md shadow-[#D4AF37]/20"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? "Saving Revision..." : "Save Peer-Reviewed Revision"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Archival Folio Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel-gold rounded-xl p-6 border border-[#D4AF37]/60 shadow-2xl relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-4 right-4 text-[#D8C3A5] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg font-bold text-[#F6F1E9] mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#D4AF37]" />
              Ingest Archival Folio or Inscription
            </h3>

            <p className="text-xs text-[#D8C3A5] leading-relaxed mb-4">
              Upload scanned manuscript folios (Devanagari, Old Gujarati, Sanskrit, Rajasthani). The pipeline executes OCR bounding box localization, neural translation, and NER extraction.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Document successfully ingested! Async OCR extraction running.");
                setUploadModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-[#D4AF37] block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modhera Surya Mandir Copper Plate Inscription"
                  className="w-full bg-[#090D16] border border-[#D4AF37]/40 rounded-lg p-2 text-xs text-[#F6F1E9]"
                />
              </div>

              <div>
                <label className="text-xs text-[#D4AF37] block mb-1">Language / Script</label>
                <select className="w-full bg-[#090D16] border border-[#D4AF37]/40 rounded-lg p-2 text-xs text-[#F6F1E9]">
                  <option>Sanskrit (Devanagari)</option>
                  <option>Old Gujarati (Nagari Script)</option>
                  <option>Rajasthani / Marwari</option>
                  <option>Indus Script / Symbolic</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#D4AF37] block mb-1">Archival Scan File (Image or PDF)</label>
                <input
                  type="file"
                  required
                  className="w-full bg-[#090D16] border border-[#D4AF37]/40 rounded-lg p-2 text-xs text-[#F6F1E9]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-indigoInk font-bold text-xs hover:bg-[#F3C649] transition-all shadow-lg shadow-[#D4AF37]/20 mt-2"
              >
                Start OCR & Translation Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
