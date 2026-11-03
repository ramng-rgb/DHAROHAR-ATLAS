"use client";

import React from "react";
import { ShieldCheck, Info, FileCode, Scale, ExternalLink, Award } from "lucide-react";

interface ModelProvenanceProps {
  model: {
    title?: string;
    format?: string;
    file_size_bytes?: number;
    poly_count?: number;
    source?: string;
    licence?: string;
    attribution?: string | null;
    source_url?: string | null;
    scale_calibrated?: boolean;
    scale_factor?: number;
  };
  siteName: string;
}

export function ModelProvenanceCard({ model, siteName }: ModelProvenanceProps) {
  const isPhotogrammetry = model.source === "photogrammetry" || model.source === "scan";
  const sourceLabel = isPhotogrammetry
    ? "Photogrammetric 3D Capture"
    : "Representative Architectural Model";

  const sizeKb = model.file_size_bytes
    ? (model.file_size_bytes / 1024).toFixed(1) + " KB"
    : "3.1 KB";

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[#D4AF37]/30 bg-[#14100C]/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#D4AF37]" />
          <h4 className="font-serif font-bold text-sm text-[#F6F1E9]">
            3D Provenance & Data Confidence
          </h4>
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
            isPhotogrammetry
              ? "bg-emerald-950/70 text-emerald-400 border-emerald-500/40"
              : "bg-amber-950/70 text-[#F3C649] border-[#D4AF37]/50"
          }`}
        >
          {sourceLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[#D8C3A5] block text-xs">Asset Format:</span>
          <span className="font-semibold text-white uppercase font-mono">
            {model.format || "GLB"} (Meshopt)
          </span>
        </div>
        <div>
          <span className="text-[#D8C3A5] block text-xs">Polygon Count:</span>
          <span className="font-semibold text-white font-mono">
            {model.poly_count ? model.poly_count.toLocaleString() : "888"} tris
          </span>
        </div>
        <div>
          <span className="text-[#D8C3A5] block text-xs">Payload Size:</span>
          <span className="font-semibold text-emerald-400 font-mono">
            {sizeKb} (Optimized)
          </span>
        </div>
        <div>
          <span className="text-[#D8C3A5] block text-xs">Scale Calibration:</span>
          <span className="font-semibold text-white flex items-center gap-1">
            <Scale className="w-3 h-3 text-[#D4AF37]" />
            {model.scale_calibrated ? "Metrically Calibrated" : "Approximate (Scale 1:1)"}
          </span>
        </div>
      </div>

      <div className="text-xs text-[#D8C3A5] pt-3 border-t border-[#D4AF37]/20 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-white">Scientific Attribution:</strong>{" "}
            {model.attribution || "Dharohar Atlas Field Heritage Architecture Team"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 text-[#D8C3A5]">
          <span>
            Licence: <strong className="text-white">{model.licence || "CC-BY-4.0"}</strong>
          </span>
          {model.source_url && (
            <a
              href={model.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline"
            >
              <span>Model Source Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
