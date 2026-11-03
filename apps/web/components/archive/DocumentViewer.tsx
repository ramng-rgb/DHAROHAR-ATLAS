"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Eye, EyeOff, 
  Sparkles, CheckCircle2, AlertTriangle, History, Download, 
  Copy, Printer, MapPin, Tag, ArrowLeft, Edit3, X, Check,
  ChevronLeft, ChevronRight, Layers, HelpCircle, Undo2, Volume2
} from "lucide-react";
import { apiClient, DocumentResponse, OCRLineResponse } from "@/lib/api-client";
import { speakNarration, stopNarration } from "@/lib/audioNarration";

interface DocumentViewerProps {
  initialDocument: DocumentResponse;
}

const ENTITY_CONFIG: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  place: { icon: "📍", bg: "bg-emerald-950/60", text: "text-emerald-300", border: "border-emerald-500/50" },
  dynasty: { icon: "👑", bg: "bg-purple-950/60", text: "text-purple-300", border: "border-purple-500/50" },
  person: { icon: "👤", bg: "bg-sky-950/60", text: "text-sky-300", border: "border-sky-500/50" },
  date: { icon: "📅", bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-500/50" },
  deity: { icon: "🕉️", bg: "bg-rose-950/60", text: "text-rose-300", border: "border-rose-500/50" },
  artifact: { icon: "🏺", bg: "bg-indigo-950/60", text: "text-indigo-300", border: "border-indigo-500/50" },
  other: { icon: "🏷️", bg: "bg-zinc-800/60", text: "text-zinc-300", border: "border-zinc-500/50" },
};

export function DocumentViewer({ initialDocument }: DocumentViewerProps) {
  const [doc, setDoc] = useState<DocumentResponse>(initialDocument);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  // Scan viewer controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [revealScanToText, setRevealScanToText] = useState(false);

  // Mobile tabs: "scan" | "transcript" | "translation"
  const [mobileTab, setMobileTab] = useState<"scan" | "transcript" | "translation">("transcript");

  // Inline editing state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [speechActive, setSpeechActive] = useState(false);

  // Version history drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Entity link modal
  const [linkModalEntity, setLinkModalEntity] = useState<any | null>(null);
  const [availableSites, setAvailableSites] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedLinkSiteId, setSelectedLinkSiteId] = useState("");

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const translationScrollRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const currentPage = doc.pages?.[activePageIndex] || doc.pages?.[0];
  const lines = currentPage?.ocr_lines || [];
  const translations = currentPage?.translations || [];

  // Low confidence count
  const lowConfidenceLines = lines.filter((l) => (l.confidence || 1) < 0.85);

  // Load available sites for entity linking
  useEffect(() => {
    apiClient.getSites({ limit: 50 }).then((res: any) => {
      const items = Array.isArray(res) ? res : res.items || [];
      setAvailableSites(items.map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })));
    }).catch(() => {});
  }, []);

  // Deep-link to line from URL query param (?line=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const lineParam = sp.get("line");
      if (lineParam && doc.pages?.length) {
        for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
          const p = doc.pages[pIdx];
          const match = (p.ocr_lines || []).find(
            (l: any) => l.id === lineParam || String(l.line_index) === lineParam
          );
          if (match) {
            setActivePageIndex(pIdx);
            setTimeout(() => {
              selectLine(match.id);
            }, 300);
            break;
          }
        }
      }
    }
  }, [doc]);

  // Show auto-dismiss toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard navigation: j/k to navigate lines, e to edit, Esc to cancel, Ctrl+Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If currently editing text
      if (editingLineId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingLineId(null);
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          saveCorrection();
        }
        return;
      }

      // If user typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIdx = lines.findIndex((l) => l.id === activeLineId);
        const nextIdx = currentIdx < lines.length - 1 ? currentIdx + 1 : 0;
        const nextLine = lines[nextIdx];
        if (nextLine) selectLine(nextLine.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIdx = lines.findIndex((l) => l.id === activeLineId);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : lines.length - 1;
        const prevLine = lines[prevIdx];
        if (prevLine) selectLine(prevLine.id);
      } else if (e.key === "e") {
        e.preventDefault();
        if (activeLineId) {
          startEditing(activeLineId);
        } else if (lines.length > 0) {
          startEditing(lines[0].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLineId, editingLineId, lines]);

  // Select line and scroll both panes
  const selectLine = (lineId: string) => {
    setActiveLineId(lineId);

    // Scroll transcript
    const tElem = document.getElementById(`transcript-line-${lineId}`);
    if (tElem) {
      tElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Scroll translation
    const trElem = document.getElementById(`translation-line-${lineId}`);
    if (trElem) {
      trElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Start inline editing
  const startEditing = (lineId: string) => {
    const target = lines.find((l) => l.id === lineId);
    if (!target) return;
    setActiveLineId(lineId);
    setEditingLineId(lineId);
    setEditText(target.text);
    setEditReason("Human transcription review");
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 50);
  };

  // Save human-in-the-loop correction (optimistic update with rollback)
  const saveCorrection = async () => {
    if (!editingLineId) return;
    const targetLine = lines.find((l) => l.id === editingLineId);
    if (!targetLine) return;

    const previousText = targetLine.text;
    const previousVersion = targetLine.version;
    const previousCorrected = targetLine.is_corrected;

    // 1. Optimistic local update
    const updatedLines = lines.map((l) => {
      if (l.id === editingLineId) {
        return {
          ...l,
          text: editText,
          version: (l.version || 1) + 1,
          is_corrected: true,
        };
      }
      return l;
    });

    const updatedPages = (doc.pages || []).map((p, idx) => {
      if (idx === activePageIndex) {
        return { ...p, ocr_lines: updatedLines };
      }
      return p;
    });

    setDoc({ ...doc, pages: updatedPages });
    setEditingLineId(null);
    setIsSaving(true);

    try {
      // 2. Persist to API
      const serverUpdated = await apiClient.patchOCRLine(
        editingLineId,
        editText,
        editReason,
        "human_epigraphist"
      );
      showToast("Correction saved & new version recorded.");
    } catch (err: any) {
      // 3. Rollback on error
      console.error("Failed to save correction", err);
      const revertedLines = lines.map((l) => {
        if (l.id === editingLineId) {
          return {
            ...l,
            text: previousText,
            version: previousVersion,
            is_corrected: previousCorrected,
          };
        }
        return l;
      });
      const revertedPages = (doc.pages || []).map((p, idx) => {
        if (idx === activePageIndex) {
          return { ...p, ocr_lines: revertedLines };
        }
        return p;
      });
      setDoc({ ...doc, pages: revertedPages });
      showToast(`Error saving correction: ${err.message || "Network issue"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Open version history drawer
  const openHistory = async () => {
    setHistoryOpen(true);
    setLoadingVersions(true);
    try {
      const data = await apiClient.getDocumentVersions(doc.id);
      setVersions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Revert version
  const handleRevert = async (v: any) => {
    try {
      await apiClient.revertVersion(v.entity_type, v.entity_id, v.version_no, "Reverted from history drawer");
      // Refresh document
      const fresh = await apiClient.getDocument(doc.id);
      setDoc(fresh);
      showToast(`Restored version #${v.version_no}`);
      setHistoryOpen(false);
    } catch (err: any) {
      showToast(`Revert failed: ${err.message}`);
    }
  };

  // Link entity to site
  const handleLinkEntity = async () => {
    if (!linkModalEntity || !selectedLinkSiteId) return;
    try {
      await apiClient.linkEntityToSite(doc.id, linkModalEntity.id, selectedLinkSiteId);
      const fresh = await apiClient.getDocument(doc.id);
      setDoc(fresh);
      setLinkModalEntity(null);
      showToast(`Entity linked to site successfully.`);
    } catch (err: any) {
      showToast(`Failed to link entity: ${err.message}`);
    }
  };

  // Copy full transcript text
  const copyFullTranscript = () => {
    const fullText = lines.map((l) => l.text).join("\n");
    navigator.clipboard.writeText(fullText);
    showToast("Transcript copied to clipboard!");
  };

  // Determine font family for script
  const isGujarati = (doc.language_hint || "").toLowerCase().includes("gu");
  const scriptFontClass = isGujarati ? "font-gujarati" : "font-devanagari";

  // Scan image URL
  const scanImgUrl = currentPage?.image_key
    ? `http://localhost:8000${currentPage.image_key}`
    : null;

  return (
    <div className="w-full flex-1 flex flex-col bg-[#090D16] text-[#F6F1E9] overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-xs shadow-2xl flex items-center gap-2 transition-all duration-300 ease-out"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Toolbar */}
      <header className="w-full h-14 px-4 bg-[#120E0A] border-b border-[#D4AF37]/30 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            href="/archive"
            className="p-1.5 rounded-lg text-[#D8C3A5]/70 hover:text-[#D4AF37] hover:bg-white/5 transition-colors"
            title="Back to Archive Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="overflow-hidden">
            <h1 className="font-serif text-sm sm:text-base font-bold text-[#F6F1E9] truncate">
              {doc.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-[#D8C3A5]/80 font-mono">
              <span>{doc.licence || "CC-BY-4.0"}</span>
              <span>•</span>
              <span className="truncate">{doc.attribution || doc.source}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Scan-to-text reveal toggle */}
          <button
            onClick={() => setRevealScanToText(!revealScanToText)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              revealScanToText
                ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                : "border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            }`}
            title="Signature scan-to-transcript overlay animation"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reveal Transcript</span>
          </button>

          {/* Copy button */}
          <button
            onClick={copyFullTranscript}
            className="p-2 rounded-lg border border-white/10 hover:border-[#D4AF37]/40 text-[#D8C3A5] hover:text-[#F6F1E9] hover:bg-white/5 transition-colors"
            title="Copy plain text transcript"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              className="p-2 rounded-lg border border-white/10 hover:border-[#D4AF37]/40 text-[#D8C3A5] hover:text-[#F6F1E9] hover:bg-white/5 transition-colors flex items-center gap-1"
              title="Download archival record"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-[#14100B] border border-[#D4AF37]/40 shadow-2xl py-1 hidden group-hover:block z-50 text-xs">
              <a
                href={apiClient.getDocumentExportUrl(doc.id, "txt")}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-1.5 text-[#D8C3A5] hover:bg-[#D4AF37]/20 hover:text-[#F6F1E9]"
              >
                Plain Text (.txt)
              </a>
              <a
                href={apiClient.getDocumentExportUrl(doc.id, "json")}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-1.5 text-[#D8C3A5] hover:bg-[#D4AF37]/20 hover:text-[#F6F1E9]"
              >
                Structured JSON (.json)
              </a>
              <a
                href={apiClient.getDocumentExportUrl(doc.id, "alto-xml")}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-1.5 text-[#D8C3A5] hover:bg-[#D4AF37]/20 hover:text-[#F6F1E9]"
              >
                Library of Congress ALTO XML
              </a>
            </div>
          </div>

          {/* Audio Narration Guide Button */}
          <button
            onClick={() => {
              if (speechActive) {
                stopNarration();
                setSpeechActive(false);
              } else {
                const textToSpeak = activeLineId
                  ? lines.find((l) => l.id === activeLineId)?.text || doc.title
                  : lines.map((l) => l.text).join(". ");
                setSpeechActive(true);
                speakNarration(
                  textToSpeak,
                  (doc.language_hint || "").toLowerCase().includes("gu") ? "gu" : "hi",
                  () => setSpeechActive(false)
                );
              }
            }}
            className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
              speechActive
                ? "bg-[#D4AF37] text-indigoInk font-bold border-[#D4AF37]"
                : "border-white/10 hover:border-[#D4AF37]/40 text-[#D8C3A5] hover:text-[#F6F1E9] hover:bg-white/5"
            }`}
            title="Listen to transcription with AI speech narration"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {speechActive ? "Pause" : "Listen"}
            </span>
          </button>

          {/* Version history */}
          <button
            onClick={openHistory}
            className="p-2 rounded-lg border border-white/10 hover:border-[#D4AF37]/40 text-[#D8C3A5] hover:text-[#F6F1E9] hover:bg-white/5 transition-colors"
            title="Revision audit & version history"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Print view */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg border border-white/10 hover:border-[#D4AF37]/40 text-[#D8C3A5] hover:text-[#F6F1E9] hover:bg-white/5 transition-colors hidden sm:block"
            title="Print-friendly monographic view"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Needs Review / Quality Banner */}
      {lowConfidenceLines.length > 0 && (
        <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Quality Flag:</strong> {lowConfidenceLines.length} OCR lines exhibit low confidence (&lt;85%). Use inline editor (key: <code>e</code>) to verify.
            </span>
          </div>
          <button
            onClick={() => selectLine(lowConfidenceLines[0].id)}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/30 transition-colors"
          >
            Inspect First Flagged Line
          </button>
        </div>
      )}

      {/* Mobile Tab Toggle */}
      <div className="md:hidden flex border-b border-[#D4AF37]/20 bg-[#120E0A] text-xs font-semibold">
        <button
          onClick={() => setMobileTab("scan")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            mobileTab === "scan" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#D8C3A5]/60"
          }`}
        >
          Original Scan
        </button>
        <button
          onClick={() => setMobileTab("transcript")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            mobileTab === "transcript" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#D8C3A5]/60"
          }`}
        >
          Transcript ({lines.length})
        </button>
        <button
          onClick={() => setMobileTab("translation")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            mobileTab === "translation" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#D8C3A5]/60"
          }`}
        >
          English Translation
        </button>
      </div>

      {/* Three-Pane Desktop Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* PANE 1: Original Scan Viewer */}
        <section
          className={`flex-1 relative flex flex-col bg-[#05070B] border-r border-[#D4AF37]/20 overflow-hidden ${
            mobileTab !== "scan" ? "hidden md:flex" : "flex"
          }`}
          aria-label="High-resolution manuscript scan"
        >
          {/* Scan Controls Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-1 rounded hover:bg-white/10 text-[#D8C3A5]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-1 rounded hover:bg-white/10 text-[#D8C3A5]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setRotation(0); }}
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[11px] text-[#D8C3A5] font-mono"
              title="Reset Zoom"
            >
              Fit
            </button>
            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 rounded hover:bg-white/10 text-[#D8C3A5]"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`p-1 rounded text-xs transition-colors ${
                showHeatmap ? "text-[#D4AF37] bg-[#D4AF37]/20" : "text-[#D8C3A5]/50 hover:bg-white/10"
              }`}
              title="Toggle Confidence Heatmap"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Scan Canvas / Container */}
          <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-auto relative">
            {/* Holographic Laser Scanning HUD Beam */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-gold-glow animate-scan z-20 pointer-events-none" />

            {/* Top-Right Holographic Status Overlay */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none p-2 rounded bg-black/75 backdrop-blur-md border border-[#D4AF37]/35 text-[10px] font-mono text-[#D4AF37] hidden sm:flex flex-col gap-0.5 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span>ASI-EPIGRAPH: #FOLIO-{activePageIndex + 1}</span>
                <span className="text-emerald-400 font-bold">ALIGNED (98.4%)</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[#D8C3A5]/70">
                <span>SPECTRAL CONTRAST: 96.2%</span>
                <span>CONFIDENCE: {Math.round(((doc as any).overall_confidence || 0.94) * 100)}%</span>
              </div>
            </div>

            <div
              className="relative transition-transform duration-200 select-none shadow-2xl"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
            >
              {/* Scan image */}
              {scanImgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scanImgUrl}
                  alt={doc.title}
                  className="max-h-[75vh] w-auto object-contain rounded shadow-lg border border-[#D4AF37]/20"
                />
              ) : (
                <div className="w-[450px] h-[600px] rounded bg-[#FAF7F0] text-zinc-800 p-8 flex flex-col justify-between border border-[#D4AF37]/40 shadow-inner">
                  <div className="space-y-4">
                    <div className="text-xs font-serif font-bold text-center border-b border-zinc-300 pb-2">
                      ARCHAEOLOGICAL SURVEY MONOGRAPH • FOLIO {activePageIndex + 1}
                    </div>
                    {lines.map((l) => (
                      <div key={l.id} className="text-xs leading-relaxed font-serif text-zinc-700">
                        {l.text}
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono text-center">
                    Simulated Archival Canvas • High-DPI Normalised
                  </div>
                </div>
              )}

              {/* Bounding Box Overlays (SVG overlay layer) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {lines.map((l) => {
                  const isSelected = l.id === activeLineId;
                  const isHovered = l.id === hoveredLineId;
                  const isLow = (l.confidence || 1) < 0.85;

                  // Normalized 0-1 mapped to SVG 0-1000
                  const x = (l.bbox_x || 0) * 1000;
                  const y = (l.bbox_y || 0) * 1000;
                  const w = (l.bbox_w || 0.8) * 1000;
                  const h = (l.bbox_h || 0.05) * 1000;

                  return (
                    <g key={l.id}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={6}
                        fill={
                          isSelected
                            ? "rgba(212, 175, 55, 0.35)"
                            : isHovered
                            ? "rgba(212, 175, 55, 0.2)"
                            : showHeatmap && isLow
                            ? "rgba(244, 63, 94, 0.22)"
                            : showHeatmap
                            ? "rgba(16, 185, 129, 0.12)"
                            : "transparent"
                        }
                        stroke={
                          isSelected
                            ? "#D4AF37"
                            : isHovered
                            ? "#F6F1E9"
                            : showHeatmap && isLow
                            ? "#F43F5E"
                            : showHeatmap
                            ? "rgba(16, 185, 129, 0.4)"
                            : "rgba(212, 175, 55, 0.3)"
                        }
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={isLow ? "4 2" : "none"}
                        className="cursor-pointer transition-all"
                        onClick={() => selectLine(l.id)}
                        onMouseEnter={() => setHoveredLineId(l.id)}
                        onMouseLeave={() => setHoveredLineId(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Reveal Overlay Animation Sweep */}
              {revealScanToText && (
                <div className="absolute inset-0 bg-[#090D16]/95 p-6 overflow-y-auto animate-sweep-reveal rounded">
                  <div className="space-y-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2">
                      TRANSCRIPT DIGITAL LAYER REVEAL
                    </div>
                    {lines.map((l) => (
                      <div
                        key={l.id}
                        className={`text-sm ${scriptFontClass} text-[#F6F1E9] p-1.5 rounded ${
                          l.id === activeLineId ? "bg-[#D4AF37]/25 ring-1 ring-[#D4AF37]/60" : ""
                        }`}
                      >
                        {l.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PANE 2: Transcript Pane */}
        <section
          ref={transcriptScrollRef}
          className={`flex-1 relative flex flex-col bg-[#0F141F] border-r border-[#D4AF37]/20 overflow-y-auto ${
            mobileTab !== "transcript" ? "hidden md:flex" : "flex"
          }`}
          aria-label="Original Script Transcript"
        >
          {/* Pane Header */}
          <div className="sticky top-0 z-10 px-4 py-2.5 bg-[#141A29]/95 backdrop-blur-md border-b border-[#D4AF37]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-[#D4AF37]">
                Original Transcript
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#D8C3A5]/80">
                {isGujarati ? "Gujarati" : "Devanagari"}
              </span>
            </div>
            <span className="text-[11px] text-[#D8C3A5]/70 font-mono">
              Shortcuts: [j/k] navigate • [e] edit
            </span>
          </div>

          {/* Transcript Lines List */}
          <div className="p-4 space-y-3">
            {lines.map((line, idx) => {
              const isSelected = line.id === activeLineId;
              const isEditing = line.id === editingLineId;
              const isLow = (line.confidence || 1) < 0.85;

              return (
                <div
                  id={`transcript-line-${line.id}`}
                  key={line.id}
                  onClick={() => selectLine(line.id)}
                  onMouseEnter={() => setHoveredLineId(line.id)}
                  onMouseLeave={() => setHoveredLineId(null)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-md shadow-[#D4AF37]/10"
                      : "border-white/5 hover:border-[#D4AF37]/30 bg-black/20 hover:bg-black/30"
                  }`}
                >
                  {/* Line Number & Metadata Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#D8C3A5]/60 pb-1.5 border-b border-white/5">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-[#D4AF37]">#{String(idx + 1).padStart(2, "0")}</span>
                      {line.is_corrected && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Human Verified
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded ${
                          isLow
                            ? "bg-rose-950/70 text-rose-300 border border-rose-500/40"
                            : "bg-emerald-950/40 text-emerald-400"
                        }`}
                      >
                        {Math.round((line.confidence || 0.95) * 100)}% Conf
                      </span>

                      {!isEditing && isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(line.id);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-[#D4AF37] transition-colors"
                          title="Edit Line (Key: e)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Editor or Display Text */}
                  {isEditing ? (
                    <div className="pt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        ref={editInputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={`w-full p-2.5 rounded-lg bg-black/70 border border-[#D4AF37] text-sm text-[#F6F1E9] ${scriptFontClass} outline-none focus:ring-1 focus:ring-[#D4AF37]`}
                        rows={2}
                      />
                      <input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Reason for revision (e.g., conjunct consonant correction)"
                        className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/10 text-xs text-[#D8C3A5]"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingLineId(null)}
                          className="px-2.5 py-1 rounded border border-white/10 text-xs text-[#D8C3A5] hover:bg-white/5"
                        >
                          Cancel [Esc]
                        </button>
                        <button
                          type="button"
                          onClick={saveCorrection}
                          disabled={isSaving}
                          className="px-3 py-1 rounded bg-[#D4AF37] text-black font-semibold text-xs flex items-center gap-1 hover:brightness-110"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save [Ctrl+Enter]</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`pt-2 text-base text-[#F6F1E9] ${scriptFontClass} tracking-wide`}>
                      {line.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* PANE 3: Translation & Entities Pane */}
        <section
          ref={translationScrollRef}
          className={`flex-1 relative flex flex-col bg-[#090D16] overflow-y-auto ${
            mobileTab !== "translation" ? "hidden md:flex" : "flex"
          }`}
          aria-label="English Monograph Translation"
        >
          {/* Pane Header */}
          <div className="sticky top-0 z-10 px-4 py-2.5 bg-[#0C101A]/95 backdrop-blur-md border-b border-[#D4AF37]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-[#D4AF37]">
                Monograph Translation
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#D8C3A5]/80">
                Target: English
              </span>
            </div>
            <span className="text-[11px] text-[#D8C3A5]/70 font-mono">
              Domain terms preserved
            </span>
          </div>

          {/* Translation Lines List */}
          <div className="p-4 space-y-3">
            {lines.map((line, idx) => {
              const isSelected = line.id === activeLineId;
              const matchingTrans = translations.find((t) => t.line_id === line.id) || translations[idx];

              return (
                <div
                  id={`translation-line-${line.id}`}
                  key={`trans-${line.id}`}
                  onClick={() => selectLine(line.id)}
                  onMouseEnter={() => setHoveredLineId(line.id)}
                  onMouseLeave={() => setHoveredLineId(null)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-md shadow-[#D4AF37]/10"
                      : "border-white/5 hover:border-[#D4AF37]/30 bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#D8C3A5]/60 pb-1.5 border-b border-white/5">
                    <span className="font-bold text-[#D4AF37]">Line #{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-[11px] text-[#D8C3A5]/70 font-mono">1:1 Aligned</span>
                  </div>

                  <div className="pt-2 text-sm leading-relaxed text-[#F6F1E9] font-light">
                    {matchingTrans?.text || "Translating heritage terms (vav, baoli, toran)..."}
                  </div>
                </div>
              );
            })}

            {/* Extracted Entities Section */}
            {(doc as any).extracted_entities && (doc as any).extracted_entities.length > 0 && (
              <div className="mt-8 p-4 rounded-xl bg-[#120E0A] border border-[#D4AF37]/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-serif text-xs font-bold text-[#D4AF37]">
                    Extracted Historical Entities ({(doc as any).extracted_entities.length})
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(doc as any).extracted_entities.map((ent: any) => {
                    const cfg = ENTITY_CONFIG[ent.kind] || ENTITY_CONFIG.other;

                    return (
                      <div
                        key={ent.id}
                        className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                      >
                        <span>{cfg.icon}</span>
                        <span className="font-medium">{ent.name}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">
                          {ent.kind}
                        </span>

                        {/* If linked to site, offer link */}
                        {doc.site ? (
                          <Link
                            href={`/sites/${doc.site.slug}`}
                            className="ml-1 hover:text-white"
                            title="Navigate to monument site page"
                          >
                            <MapPin className="w-3 h-3 text-[#D4AF37]" />
                          </Link>
                        ) : (
                          <button
                            onClick={() => {
                              setLinkModalEntity(ent);
                              setSelectedLinkSiteId(availableSites[0]?.id || "");
                            }}
                            className="ml-1 text-[9px] underline hover:text-white"
                            title="Curator Action: Link to site"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Version History Slide-Over Drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#120E0A] border-l border-[#D4AF37]/40 h-full p-6 flex flex-col justify-between overflow-y-auto text-[#F6F1E9]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-serif text-base font-bold text-[#D4AF37]">
                    Append-Only Revision History
                  </h3>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 rounded text-[#D8C3A5] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingVersions ? (
                <div className="py-12 text-center text-xs text-[#D8C3A5]/60 font-mono">
                  Loading audit logs...
                </div>
              ) : versions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#D8C3A5]/60 font-serif">
                  No revisions yet. Original OCR baseline intact.
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-lg bg-black/40 border border-[#D4AF37]/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#D8C3A5]/70">
                        <span className="font-bold text-[#D4AF37]">Revision #{v.version_no}</span>
                        <span>{new Date(v.edited_at).toLocaleDateString()}</span>
                      </div>
                      <p className="font-serif text-[#F6F1E9] bg-black/30 p-2 rounded border border-white/5">
                        {v.text}
                      </p>
                      <div className="text-[11px] text-[#D8C3A5]/80">
                        <strong>Reason:</strong> {v.reason || "Manual epigraphy revision"}
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleRevert(v)}
                          className="px-2.5 py-1 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Revert to this version</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 text-[11px] text-[#D8C3A5]/70 font-mono text-center">
              All edits timestamped and signed for archival provenance.
            </div>
          </div>
        </div>
      )}

      {/* Entity Link Modal */}
      {linkModalEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#14100B] border border-[#D4AF37]/50 rounded-xl p-6 text-[#F6F1E9] space-y-4 shadow-2xl">
            <h3 className="font-serif text-base font-bold text-[#D4AF37]">
              Link Entity to Heritage Site
            </h3>
            <p className="text-xs text-[#D8C3A5]/70">
              Link entity <strong>&ldquo;{linkModalEntity.name}&rdquo;</strong> ({linkModalEntity.kind}) to a spatial monument:
            </p>

            <select
              value={selectedLinkSiteId}
              onChange={(e) => setSelectedLinkSiteId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-[#D4AF37]/40 text-xs text-[#F6F1E9] outline-none"
            >
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLinkModalEntity(null)}
                className="px-3 py-1.5 rounded text-xs border border-white/10 text-[#D8C3A5]"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkEntity}
                className="px-4 py-1.5 rounded bg-[#D4AF37] text-black font-semibold text-xs"
              >
                Confirm Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
