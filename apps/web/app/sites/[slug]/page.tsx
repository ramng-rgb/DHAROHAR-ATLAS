import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  fetchSiteBySlug, fetchNearbySites 
} from "@/lib/api";
import { DigitalTwinViewer3D } from "@/components/DigitalTwinViewer3D";
import { 
  MapPin, Calendar, Compass, ShieldCheck, Box, BookOpen, 
  Share2, ArrowLeft, ChevronRight, Eye, Info, Sparkles
} from "lucide-react";

export const revalidate = 0;

export default async function SiteDetailPage({ params }: { params: { slug: string } }) {
  let site;
  let nearby = [];
  try {
    site = await fetchSiteBySlug(params.slug);
    nearby = await fetchNearbySites(params.slug);
  } catch (err) {
    notFound();
  }

  if (!site) notFound();

  const primaryModel = site.models_3d && site.models_3d.length > 0 ? site.models_3d[0] : undefined;
  const fallbackImages = site.media ? site.media.map((m) => m.url) : [site.hero_image || ""];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between text-xs text-[#D8C3A5]">
        <Link
          href="/explorer"
          className="inline-flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Geospatial Explorer</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[#D4AF37] font-serif">{site.state}</span>
          <span>/</span>
          <span className="text-[#F6F1E9]">{site.name}</span>
        </div>
      </div>

      {/* Hero Header & Metadata Dossier */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-10 border border-[#D4AF37]/50 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-[#C85A32] text-white">
              {site.site_type}
            </span>
            <span className="text-xs font-serif px-3 py-1 rounded-md bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
              {site.era}
            </span>
            <span className="text-xs px-3 py-1 rounded-md bg-[#1A1510] text-[#EFE6D8] border border-[#D4AF37]/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{site.data_confidence.replace("_", " ").toUpperCase()}</span>
            </span>
          </div>

          <div className="text-xs text-[#D8C3A5] font-serif">
            GPS: {site.latitude.toFixed(4)}° N, {site.longitude.toFixed(4)}° E
          </div>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#F6F1E9] leading-tight">
          {site.name}
        </h1>

        {site.alternative_names && site.alternative_names.length > 0 && (
          <p className="text-xs text-[#D8C3A5] italic">
            Also known as: {site.alternative_names.join(", ")}
          </p>
        )}

        <p className="text-base sm:text-lg text-[#EFE6D8] leading-relaxed font-sans max-w-4xl">
          {site.description}
        </p>

        {/* Structural Specs Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#D4AF37]/20 text-xs">
          <div>
            <span className="text-[#D4AF37] block font-serif uppercase tracking-wider text-[11px]">Dynasty:</span>
            <span className="font-semibold text-white">{site.dynasty || "Classical Indian"}</span>
          </div>
          <div>
            <span className="text-[#D4AF37] block font-serif uppercase tracking-wider text-[11px]">Architecture:</span>
            <span className="font-semibold text-white">{site.architectural_style || "Nagara / Solanki"}</span>
          </div>
          <div>
            <span className="text-[#D4AF37] block font-serif uppercase tracking-wider text-[11px]">District / State:</span>
            <span className="font-semibold text-white">{site.district || "Historic"}, {site.state}</span>
          </div>
          <div>
            <span className="text-[#D4AF37] block font-serif uppercase tracking-wider text-[11px]">Source Dossier:</span>
            <span className="font-semibold text-white truncate block" title={site.source}>{site.source}</span>
          </div>
        </div>
      </div>

      {/* 3D Digital Twin Section */}
      <section id="viewer3d" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
              <Box className="w-4 h-4 text-[#D4AF37]" />
              <span>3D Digital Twin & Subterranean Hotspots</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#F6F1E9]">
              Photogrammetric Model Inspection
            </h2>
          </div>
          <span className="text-xs text-[#D8C3A5] hidden sm:inline">
            Drag to orbit • Scroll to zoom • Click gold nodes for architectural details
          </span>
        </div>

        <DigitalTwinViewer3D
          model={primaryModel}
          fallbackImages={fallbackImages}
          siteName={site.name}
        />
      </section>

      {/* Architectural Observations & Masonry Analysis */}
      {site.observations && site.observations.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#F6F1E9] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Archaeological & Masonry Survey</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {site.observations.map((obs) => (
              <div
                key={obs.id}
                className="glass-panel rounded-xl p-5 border border-[#D4AF37]/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-[#D4AF37] text-base">
                    {obs.title}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                    {obs.preservation_status}
                  </span>
                </div>
                <p className="text-xs text-[#EFE6D8] leading-relaxed">
                  {obs.description}
                </p>
                <div className="text-[11px] text-[#D8C3A5]/70 pt-2 border-t border-[#D4AF37]/10 flex items-center justify-between">
                  <span>Masonry: {obs.masonry_detail}</span>
                  <span>Surveyor: {obs.recorded_by}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Folklore & Oral Traditions with Authenticity Label */}
      {site.folklore && site.folklore.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#F6F1E9] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>Oral Tradition & Regional Folklore</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {site.folklore.map((item) => (
              <div
                key={item.id}
                className="glass-panel-gold rounded-xl p-5 border border-[#D4AF37]/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-[#F6F1E9] text-base">
                    {item.title}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#C85A32]/30 text-[#E07A5F] border border-[#C85A32]/40">
                    {item.authenticity_status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-[#EFE6D8] leading-relaxed italic">
                  "{item.narrative}"
                </p>
                <div className="text-[11px] text-[#D4AF37] font-serif pt-2 border-t border-[#D4AF37]/15">
                  Source Tradition: {item.source_tradition}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Heritage Confluences */}
      {nearby.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-[#D4AF37]/20">
          <h2 className="font-serif text-xl font-bold text-[#F6F1E9] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <span>Nearby Heritage Sites (Within Travel Corridor)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nearby.map((nSite) => (
              <Link
                key={nSite.id}
                href={`/sites/${nSite.slug}`}
                className="glass-panel rounded-xl p-4 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-serif">
                    {nSite.distance_km} km away • {nSite.site_type}
                  </span>
                  <h3 className="font-serif font-bold text-sm text-[#F6F1E9] group-hover:text-[#D4AF37] transition-colors mt-0.5">
                    {nSite.name}
                  </h3>
                  <p className="text-xs text-[#D8C3A5]/70 font-serif">
                    {nSite.era}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1">
                  <span>View Record</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Citation Export Strip */}
      <div className="glass-panel rounded-xl p-4 border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D8C3A5]">
        <span>
          <strong>Academic Citation:</strong> Dharohar Atlas (Blithchron '27 IIT Gandhinagar). "{site.name}." Accession #{site.slug}.
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`Dharohar Atlas. (2027). ${site.name}. Archaeological Record: ${site.source}. Retrieved from http://localhost:3000/sites/${site.slug}`);
            alert("Citation copied to clipboard (APA / Chicago format)!");
          }}
          className="px-3 py-1.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 font-semibold"
        >
          Copy Citation
        </button>
      </div>
    </div>
  );
}
