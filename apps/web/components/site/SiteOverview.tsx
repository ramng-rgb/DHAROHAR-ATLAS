"use client";

import React from "react";
import { 
  Building2, Calendar, MapPin, Compass, FileText, 
  ExternalLink, Layers, Award, LandPlot 
} from "lucide-react";
import type { SiteFullDetail } from "@/lib/api-client";

interface SiteOverviewProps {
  site: SiteFullDetail;
}

export function SiteOverview({ site }: SiteOverviewProps) {
  const periodStr =
    site.period_start_year != null && site.period_end_year != null
      ? `${formatYear(site.period_start_year)} – ${formatYear(site.period_end_year)}`
      : site.era_label || "Classical Antiquity";

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
        <Building2 className="w-4 h-4 text-[#D4AF37]" />
        <span>Monograph & Architectural Dossier</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative Description (2 columns) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 bg-[#120E0A]/80 space-y-5 text-sm sm:text-base leading-relaxed text-[#EFE6D8]">
          <h2 className="font-serif text-2xl font-bold text-white">
            Historical Context & Significance
          </h2>

          <p>{site.description || site.summary}</p>

          {site.significance && (
            <div className="bg-[#1A1510]/80 p-4 rounded-2xl border-l-4 border-[#D4AF37] space-y-1.5">
              <strong className="text-white block font-serif text-sm">
                Cultural & Structural Significance
              </strong>
              <p className="text-xs sm:text-sm text-[#D8C3A5]">
                {site.significance}
              </p>
            </div>
          )}

          {site.tags && site.tags.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {site.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full bg-white/5 text-[#D8C3A5] border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Structured Facts Table & Mini Locator (1 column) */}
        <div className="space-y-6">
          <div className="glass-panel-gold rounded-3xl p-6 border border-[#D4AF37]/40 bg-[#14100C]/90 space-y-4">
            <h3 className="font-serif text-lg font-bold text-white border-b border-[#D4AF37]/20 pb-2">
              Monument Chronology
            </h3>

            <dl className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-[#D8C3A5]/70 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Dating / Period:</span>
                </dt>
                <dd className="font-semibold text-white text-right font-mono">
                  {periodStr}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-[#D8C3A5]/70 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Dynasty / Reign:</span>
                </dt>
                <dd className="font-semibold text-white text-right">
                  {site.dynasty || "Regional Solanki / Chaulukya"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-[#D8C3A5]/70 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Architecture:</span>
                </dt>
                <dd className="font-semibold text-white text-right">
                  {site.architectural_style || "Maru-Gurjara Subterranean"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-[#D8C3A5]/70 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>District & State:</span>
                </dt>
                <dd className="font-semibold text-white text-right">
                  {site.district ? `${site.district}, ` : ""}{site.state}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-[#D8C3A5]/70 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Coordinates:</span>
                </dt>
                <dd className="font-mono text-[#D4AF37] text-right">
                  {site.latitude.toFixed(4)}° N, {site.longitude.toFixed(4)}° E
                </dd>
              </div>

              <div className="pt-1">
                <dt className="text-[#D8C3A5]/70 text-[11px] block mb-1">
                  Primary Source Record:
                </dt>
                <dd className="text-[11px] text-[#EFE6D8] leading-tight">
                  {site.source_text || site.source}
                  {site.source_url && (
                    <a
                      href={site.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#D4AF37] ml-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Mini Locator Card */}
          <div className="glass-panel rounded-3xl p-5 border border-[#D4AF37]/30 bg-[#120E0A]/90 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-white flex items-center gap-1.5">
                <LandPlot className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Geospatial Locator</span>
              </span>
              <span className="text-[11px] text-[#D8C3A5]/70 font-mono">
                {site.state}
              </span>
            </div>

            {/* Locator Visual Box */}
            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-[#1A1510] flex items-center justify-center">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: "radial-gradient(circle at center, #D4AF37 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative z-10 flex flex-col items-center text-center p-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#1A1510] flex items-center justify-center shadow-lg animate-pulse mb-1">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-serif font-bold text-xs text-white">
                  {site.name}
                </span>
                <span className="text-[10px] text-[#D8C3A5] font-mono">
                  {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatYear(year: number | null | undefined): string {
  if (year == null) return "";
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}
