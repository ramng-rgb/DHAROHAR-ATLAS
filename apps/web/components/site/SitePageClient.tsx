"use client";

import React, { useState } from "react";
import { SiteHero } from "./SiteHero";
import { StickySectionNav } from "./StickySectionNav";
import { SiteOverview } from "./SiteOverview";
import { DigitalTwinShowpiece } from "../viewer3d/DigitalTwinShowpiece";
import { SiteGallery } from "./SiteGallery";
import { FolkloreObservationsSection } from "./FolkloreObservationsSection";
import { NearbySitesSection } from "./NearbySitesSection";
import { SiteArchiveDocumentsSection } from "./SiteArchiveDocumentsSection";
import { CiteModal } from "./CiteModal";
import type { SiteFullDetail, Model3DDetail } from "@/lib/api-client";

interface SitePageClientProps {
  site: SiteFullDetail;
  model: Model3DDetail | null;
}

export function SitePageClient({ site, model }: SitePageClientProps) {
  const [isCiteOpen, setIsCiteOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0806] text-[#EFE6D8]">
      {/* 1. Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <SiteHero site={site} onOpenCite={() => setIsCiteOpen(true)} />
      </div>

      {/* 2. Sticky Navigation Bar */}
      <StickySectionNav />

      {/* Main Content Flow */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* 3. Monograph & Historical Overview */}
        <SiteOverview site={site} />

        {/* 4. 3D Digital Twin Showpiece or Fallback */}
        <section id="twin-3d" className="scroll-mt-28 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D4AF37]/20 pb-3">
            <div>
              <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
                Spatial Preservation Layer
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                3D Digital Twin & Architectural Hotspots
              </h2>
            </div>
            <p className="text-xs text-[#D8C3A5] font-mono">
              {model ? "Draco & Meshopt Compressed GLB" : "High-Resolution Archival Survey"}
            </p>
          </div>

          <DigitalTwinShowpiece
            model={model}
            modelSummary={site.model_summary}
            siteName={site.name}
            fallbackImages={site.media}
            heroImage={site.hero_image || undefined}
          />
        </section>

        {/* 5. Photographic Archive / Gallery */}
        <SiteGallery media={site.media || []} siteName={site.name} />

        {/* 5b. Archive Documents & Inscriptions */}
        <SiteArchiveDocumentsSection siteId={site.id} siteName={site.name} />

        {/* 6. Folklore & Field Observations */}
        <div id="folklore-section">
          <FolkloreObservationsSection
            folklore={site.folklore_items || []}
            observations={site.observation_items || []}
          />
        </div>

        {/* 7. Nearby Sites / Proximity Trail */}
        {site.nearby_sites && site.nearby_sites.length > 0 && (
          <NearbySitesSection
            nearbySites={site.nearby_sites}
            currentSiteName={site.name}
            currentLat={site.latitude}
            currentLng={site.longitude}
          />
        )}
      </main>

      {/* 8. Cite Record Modal */}
      <CiteModal
        slug={site.slug}
        siteName={site.name}
        isOpen={isCiteOpen}
        onClose={() => setIsCiteOpen(false)}
      />
    </div>
  );
}
