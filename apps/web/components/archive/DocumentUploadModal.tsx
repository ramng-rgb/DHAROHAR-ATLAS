"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, UploadCloud, FileText, Camera, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, ShieldCheck, ArrowRight,
  RotateCcw, ExternalLink
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (docId: string) => void;
}

interface SiteOption {
  id: string;
  name: string;
  slug: string;
}

interface PipelineEvent {
  job_id: string;
  status: string;
  stage: string;
  progress: number;
  error?: string;
  result?: any;
}

const STAGES = [
  { id: "validate", label: "Security & Magic Bytes", desc: "ClamAV scan & format validation" },
  { id: "render_pages", label: "Rasterisation", desc: "PDF rendering & high-DPI normalisation" },
  { id: "preprocess", label: "Image Preprocessing", desc: "Adaptive thresholding & script detection" },
  { id: "ocr", label: "OCR & Bounding Boxes", desc: "Devanagari/Gujarati stroke analysis" },
  { id: "translate", label: "Heritage Translation", desc: "Vav/Baoli term preservation" },
  { id: "extract_entities", label: "Entity Extraction", desc: "Dynasty, place & site linking" },
  { id: "finalise", label: "Quality Audit", desc: "Confidence review & search indexing" },
];

export function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [langHint, setLangHint] = useState("auto");
  const [docType, setDocType] = useState("inscription");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [licence, setLicence] = useState("CC-BY-4.0");
  const [attribution, setAttribution] = useState("ASI Epigraphia Indica & Regional Survey");
  const [consent, setConsent] = useState(false);
  const [ocrEngine, setOcrEngine] = useState("fake");
  const [translationEngine, setTranslationEngine] = useState("fake");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const [jobEvent, setJobEvent] = useState<PipelineEvent | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch available sites for dropdown
  useEffect(() => {
    if (isOpen) {
      apiClient.getSites({ limit: 100 }).then((res: any) => {
        const items = Array.isArray(res) ? res : res.items || [];
        setSites(items.map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })));
      }).catch(() => {});
    }
  }, [isOpen]);

  // Clean up SSE stream on unmount or close
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (selected: File) => {
    if (selected.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds 25 MB archival limit. Please select an optimized file.");
      return;
    }
    setFile(selected);
    setUploadError(null);
    if (!title) {
      // Auto-populate title from clean filename
      const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const startSSEListener = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const sseUrl = apiClient.getJobEventsUrl(jobId);
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data);
        setJobEvent(data);
        if (data.status === "succeeded" || data.status === "failed" || data.status === "dead") {
          es.close();
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    es.onerror = () => {
      // Poll fallback if SSE connection interrupted
      apiClient.getJob(jobId).then((j: any) => {
        setJobEvent({
          job_id: j.id,
          status: j.status,
          stage: j.stage,
          progress: j.progress,
          error: j.error,
          result: j.result,
        });
      }).catch(() => {});
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please provide an image scan or document PDF.");
      return;
    }
    if (!title.trim()) {
      setUploadError("Document title is required.");
      return;
    }
    if (!licence.trim() || !attribution.trim()) {
      setUploadError("Licence and archival provenance attribution are required.");
      return;
    }
    if (!consent) {
      setUploadError("Please certify the archival copyright consent checkbox.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("language_hint", langHint);
    formData.append("doc_type", docType);
    if (selectedSiteId) {
      formData.append("site_id", selectedSiteId);
    }
    formData.append("licence", licence);
    formData.append("attribution", attribution);
    formData.append("ocr_engine", ocrEngine);
    formData.append("translation_engine", translationEngine);

    try {
      const resp = await apiClient.uploadDocument(formData);
      setCreatedDocId(resp.document.id);
      setActiveJobId(resp.job.id);
      setJobEvent({
        job_id: resp.job.id,
        status: resp.job.status,
        stage: resp.job.stage || "queued",
        progress: resp.job.progress || 5,
      });
      startSSEListener(resp.job.id);
      if (onUploadSuccess) {
        onUploadSuccess(resp.document.id);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to start document ingestion pipeline.");
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setActiveJobId(null);
    setCreatedDocId(null);
    setJobEvent(null);
    setUploading(false);
    setUploadError(null);
  };

  const currentStageIndex = jobEvent
    ? STAGES.findIndex((s) => s.id === jobEvent.stage || (jobEvent.stage === "done" && s.id === "finalise"))
    : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-[#120E0A] border border-[#D4AF37]/40 rounded-xl shadow-2xl p-6 md:p-8 text-[#F6F1E9] my-8 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37]/30 to-[#C85A32]/30 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="font-serif text-xl font-bold text-[#D4AF37]">
                Ingest Archival Folio
              </h2>
              <p className="text-xs text-[#D8C3A5]/70">
                OCR digitisation, heritage translation, and entity extraction pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#D8C3A5]/60 hover:text-[#F6F1E9] hover:bg-white/5 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Pipeline Stepper View */}
        {activeJobId ? (
          <div className="py-6 space-y-6" aria-live="polite">
            <div className="p-4 rounded-lg bg-black/40 border border-[#D4AF37]/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#D4AF37] font-semibold flex items-center gap-2">
                  {jobEvent?.status === "succeeded" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : jobEvent?.status === "failed" || jobEvent?.status === "dead" ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  )}
                  Job Status: {jobEvent?.status?.toUpperCase() || "PROCESSING"}
                </span>
                <span className="text-[#D8C3A5]/80">{jobEvent?.progress || 0}% Complete</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    jobEvent?.status === "succeeded"
                      ? "bg-emerald-500"
                      : jobEvent?.status === "failed" || jobEvent?.status === "dead"
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-[#D4AF37] to-[#C85A32]"
                  }`}
                  style={{ width: `${jobEvent?.progress || 5}%` }}
                />
              </div>

              {jobEvent?.error && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-rose-200 text-xs">
                  <strong>Pipeline Error:</strong> {jobEvent.error}
                </div>
              )}
            </div>

            {/* Stepper list */}
            <div className="space-y-3">
              {STAGES.map((stage, idx) => {
                const isPassed = currentStageIndex > idx || jobEvent?.status === "succeeded";
                const isCurrent = currentStageIndex === idx && jobEvent?.status !== "succeeded" && jobEvent?.status !== "dead";
                const isFailed = currentStageIndex === idx && (jobEvent?.status === "failed" || jobEvent?.status === "dead");

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isPassed
                        ? "border-emerald-500/30 bg-emerald-950/10"
                        : isCurrent
                        ? "border-[#D4AF37] bg-[#D4AF37]/10"
                        : isFailed
                        ? "border-rose-500/40 bg-rose-950/20"
                        : "border-white/5 bg-white/[0.02] opacity-40"
                    }`}
                  >
                    <div className="mt-0.5">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[10px] text-white/50">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-[#F6F1E9] flex items-center justify-between">
                        <span>{stage.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-mono animate-pulse">
                            Processing
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#D8C3A5]/70">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions once completed or failed */}
            <div className="pt-4 flex items-center justify-between border-t border-[#D4AF37]/20">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 text-xs font-medium text-[#D8C3A5]/80 hover:text-[#F6F1E9] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Upload Another Folio
              </button>

              {jobEvent?.status === "succeeded" && createdDocId && (
                <Link
                  href={`/archive/${createdDocId}`}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-black font-semibold text-xs tracking-wide flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all"
                  onClick={onClose}
                >
                  <span>Open in Document Viewer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            {uploadError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? "border-[#D4AF37] bg-[#D4AF37]/5"
                  : "border-[#D4AF37]/30 hover:border-[#D4AF37]/60 bg-black/20 hover:bg-black/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />

              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  {file ? <FileText className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                </div>

                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-[#F6F1E9]">{file.name}</p>
                    <p className="text-xs text-[#D8C3A5]/60 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || "Document"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-[#F6F1E9]">
                      Drag and drop scan or PDF here, or <span className="text-[#D4AF37] underline">browse files</span>
                    </p>
                    <p className="text-xs text-[#D8C3A5]/60 mt-1">
                      Supports high-res PNG, JPEG, TIFF, WEBP, and PDF (Max 25 MB)
                    </p>
                  </div>
                )}

                {/* Mobile Camera Button */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-white/5 hover:bg-white/10 border border-[#D4AF37]/30 text-[#D8C3A5] flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Use Camera</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Document Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[#D8C3A5] font-medium">Document Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Rani ki Vav Foundation Inscription (Sanskrit/Solanki)"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">Language Script Hint</label>
                <select
                  value={langHint}
                  onChange={(e) => setLangHint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                >
                  <option value="auto">Auto-Detect Script</option>
                  <option value="hi">Devanagari (Sanskrit / Hindi / Marathi)</option>
                  <option value="gu">Gujarati Script</option>
                  <option value="en">English / Latin Transliteration</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                >
                  <option value="inscription">Epigraphic Inscription (Stone / Copper)</option>
                  <option value="printed">Printed Survey Monograph / Journal</option>
                  <option value="handwritten">Handwritten Field Note / Scribe Folio</option>
                  <option value="journal">Travel Diary / Archival Ledger</option>
                  <option value="slide">Historical Slide / Photograph</option>
                  <option value="other">Other Unstructured Archive</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">Link to Heritage Site (Optional)</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                >
                  <option value="">No Site Linked</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">Licence *</label>
                <input
                  type="text"
                  required
                  value={licence}
                  onChange={(e) => setLicence(e.target.value)}
                  placeholder="e.g. CC-BY-4.0, Public Domain"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[#D8C3A5] font-medium">Provenance & Attribution *</label>
                <input
                  type="text"
                  required
                  value={attribution}
                  onChange={(e) => setAttribution(e.target.value)}
                  placeholder="e.g. Archaeological Survey of Western India, Vol IV / Epigraphia Indica"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                />
              </div>

              {/* Provider Selection (for evaluating Tesseract vs Hosted LLM) */}
              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">OCR Provider</label>
                <select
                  value={ocrEngine}
                  onChange={(e) => setOcrEngine(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                >
                  <option value="fake">Deterministic Demo Engine (Fast)</option>
                  <option value="tesseract">Tesseract OCR (Open-Source hin/guj/eng)</option>
                  <option value="gemini_vision">Gemini Vision OCR (Hosted Multi-script)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#D8C3A5] font-medium">Translation Engine</label>
                <select
                  value={translationEngine}
                  onChange={(e) => setTranslationEngine(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F6F1E9] text-xs"
                >
                  <option value="fake">Glossary-Guided Neural Fallback</option>
                  <option value="gemini">Gemini LLM (Preserves Vav/Toran Glossary)</option>
                </select>
              </div>
            </div>

            {/* Copyright Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#D8C3A5]/90">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#D4AF37] text-[#D4AF37] focus:ring-0"
                />
                <span>
                  I certify that this document is in the public domain or appropriately licensed for non-commercial heritage revitalization and research indexing.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#D4AF37]/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-[#D8C3A5] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-black font-semibold text-xs tracking-wide flex items-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20 transition-all"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload & Process</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
