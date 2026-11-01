"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Download, BookOpen, Quote, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CiteModalProps {
  slug: string;
  siteName: string;
  isOpen: boolean;
  onClose: () => void;
}

type CiteFormat = "bibtex" | "apa" | "ris" | "csl-json";

export function CiteModal({ slug, siteName, isOpen, onClose }: CiteModalProps) {
  const [activeFormat, setActiveFormat] = useState<CiteFormat>("bibtex");
  const [citationText, setCitationText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    fetch(`${API_BASE}/sites/${encodeURIComponent(slug)}/cite?format=${activeFormat}`)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) {
          setCitationText(text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setCitationText(`Error loading citation: ${err.message}`);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, slug, activeFormat]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<CiteFormat, string> = {
      bibtex: "bib",
      apa: "txt",
      ris: "ris",
      "csl-json": "json",
    };
    const mimeMap: Record<CiteFormat, string> = {
      bibtex: "application/x-bibtex",
      apa: "text/plain",
      ris: "application/x-research-info-systems",
      "csl-json": "application/json",
    };

    const blob = new Blob([citationText], { type: mimeMap[activeFormat] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-citation.${extMap[activeFormat]}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cite-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl glass-panel-gold rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/50 shadow-2xl bg-[#14100C]/95 text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cite-modal-title" className="font-serif text-lg sm:text-xl font-bold">
                Cite This Heritage Record
              </h3>
              <p className="text-xs text-[#D8C3A5]">
                {siteName} • Dharohar Cultural Archives
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close cite modal"
            className="p-2 rounded-xl text-[#D8C3A5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#1A1510] border border-[#D4AF37]/30 text-xs">
          {(["bibtex", "apa", "ris", "csl-json"] as CiteFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl font-semibold uppercase tracking-wider transition-all text-center ${
                activeFormat === fmt
                  ? "bg-[#D4AF37] text-[#1A1510] shadow-md font-bold"
                  : "text-[#D8C3A5] hover:text-white"
              }`}
            >
              {fmt === "csl-json" ? "CSL-JSON" : fmt}
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="relative">
          {isLoading ? (
            <div className="h-44 rounded-2xl bg-[#1A1510]/80 border border-[#D4AF37]/20 flex items-center justify-center text-xs text-[#D8C3A5]">
              <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mr-2" />
              <span>Generating {activeFormat.toUpperCase()} citation...</span>
            </div>
          ) : (
            <pre className="h-48 p-4 rounded-2xl bg-[#0E0B08] border border-[#D4AF37]/30 text-xs text-[#EFE6D8] font-mono overflow-auto whitespace-pre-wrap leading-relaxed">
              {citationText}
            </pre>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-[#D8C3A5]/70">
            Compliant with standard academic reference managers (Zotero, Mendeley, EndNote).
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Download
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? "Copied!" : "Copy Citation"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
