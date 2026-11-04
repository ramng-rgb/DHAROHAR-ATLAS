import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, ShieldCheck, Camera, Layers, CheckCircle } from "lucide-react";
import fs from "fs";
import path from "path";

export const metadata = {
  title: "Image Credits & Cultural Heritage Provenance | Dharohar Atlas",
  description:
    "Complete attribution ledger, licensing details, and Wikimedia Commons origin sources for all photographic assets catalogued in Dharohar Atlas.",
};

interface PhotoCredit {
  site_slug: string;
  kind: string;
  url: string;
  thumbnail_url?: string;
  author: string;
  licence_short: string;
  licence_url: string;
  source_url: string;
  original_filename: string;
  caption?: string;
  is_placeholder: boolean;
  verified: boolean;
}

function loadPhotoCredits(): Record<string, PhotoCredit[]> {
  try {
    const jsonPath = path.join(process.cwd(), "../../db/seed/licensed_photos.json");
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not load licensed_photos.json from seed folder, trying fallback path:", err);
  }
  return {};
}

export const revalidate = 0;

export default function CreditsPage() {
  const creditsMap = loadPhotoCredits();
  const allEntries: { slug: string; photo: PhotoCredit }[] = [];

  for (const [slug, photos] of Object.entries(creditsMap)) {
    for (const p of photos) {
      allEntries.push({ slug, photo: p });
    }
  }

  const realCount = allEntries.filter((e) => !e.photo.is_placeholder).length;
  const siteCount = Object.keys(creditsMap).length;

  return (
    <div className="w-full min-h-screen bg-sandstone-50 text-indigoHeritage">
      {/* Header Banner */}
      <section className="border-b border-sandstone-300 bg-sandstone-200/70 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs font-serif font-bold text-terracotta hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explorer</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Access & Attribution Ledger</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-indigoHeritage">
                Image Credits & Data Provenance
              </h1>
              <p className="text-sm text-indigoHeritage/80 max-w-2xl mt-2 leading-relaxed">
                In strict adherence to Creative Commons guidelines, every photograph in Dharohar Atlas is catalogued with its verified author, license terms, and original Wikimedia Commons or archival repository link.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-sandstone-300 shadow-warm-sm">
              <div className="text-center px-3 border-r border-sandstone-200">
                <span className="block font-serif text-2xl font-bold text-terracotta">{siteCount}</span>
                <span className="text-[11px] text-indigoHeritage/70 font-mono">Catalogued Sites</span>
              </div>
              <div className="text-center px-3">
                <span className="block font-serif text-2xl font-bold text-emerald-700">{realCount}</span>
                <span className="text-[11px] text-indigoHeritage/70 font-mono">Licensed Photos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal & Licensing Principles */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 rounded-2xl bg-white border border-sandstone-300 shadow-warm-sm space-y-3">
          <h2 className="font-serif text-lg font-bold text-indigoHeritage flex items-center gap-2">
            <Camera className="w-5 h-5 text-terracotta" />
            <span>Licensing Policy & Acceptable Terms</span>
          </h2>
          <p className="text-xs text-indigoHeritage/80 leading-relaxed">
            All images displayed across our interactive explorer, digital twin monographs, and story trails are sourced strictly from:
            <strong> (1) Official Wikimedia Commons via MediaWiki API</strong> and
            <strong> (2) Verified field survey captures</strong> under open licenses:
            <span className="inline-block mx-1 font-mono text-[11px] px-2 py-0.5 rounded bg-sandstone-100 border border-sandstone-300">Public Domain</span>,
            <span className="inline-block mx-1 font-mono text-[11px] px-2 py-0.5 rounded bg-sandstone-100 border border-sandstone-300">CC0 1.0</span>,
            <span className="inline-block mx-1 font-mono text-[11px] px-2 py-0.5 rounded bg-sandstone-100 border border-sandstone-300">CC-BY (2.0, 3.0, 4.0)</span>, and
            <span className="inline-block mx-1 font-mono text-[11px] px-2 py-0.5 rounded bg-sandstone-100 border border-sandstone-300">CC-BY-SA (2.0, 3.0, 4.0)</span>.
            We explicitly reject Non-Commercial (NC), No-Derivatives (ND), and unverified scrapings.
          </p>
        </div>
      </section>

      {/* Photo Grid Ledger */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-8">
          {Object.entries(creditsMap).map(([siteSlug, photos]) => {
            const formattedSlug = siteSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={siteSlug} className="space-y-4">
                <div className="flex items-center justify-between border-b border-sandstone-300 pb-2">
                  <Link
                    href={`/sites/${siteSlug}`}
                    className="font-serif text-xl font-bold text-indigoHeritage hover:text-terracotta transition flex items-center gap-2"
                  >
                    <span>{formattedSlug}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-terracotta/70" />
                  </Link>
                  <span className="text-xs font-mono text-indigoHeritage/60">
                    {photos.length} {photos.length === 1 ? "asset" : "assets"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl overflow-hidden bg-white border border-sandstone-300 shadow-warm-sm flex flex-col justify-between"
                    >
                      <div className="relative aspect-[4/3] w-full bg-sandstone-100 overflow-hidden">
                        <Image
                          src={p.url}
                          alt={p.original_filename || p.caption || "Monument photo"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono uppercase">
                          {p.kind}
                        </div>
                      </div>

                      <div className="p-3 space-y-1.5 text-xs">
                        <p className="font-semibold text-indigoHeritage truncate" title={p.original_filename}>
                          {p.original_filename}
                        </p>
                        <div className="text-[11px] text-indigoHeritage/75 space-y-0.5 font-mono">
                          <p className="truncate">
                            <span className="text-indigoHeritage/50">Author:</span> {p.author || "Unknown"}
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-indigoHeritage/50">License:</span>
                            {p.licence_url ? (
                              <a
                                href={p.licence_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-terracotta hover:underline font-semibold"
                              >
                                {p.licence_short}
                              </a>
                            ) : (
                              <span className="font-semibold">{p.licence_short}</span>
                            )}
                          </p>
                        </div>

                        {p.source_url && (
                          <div className="pt-2 border-t border-sandstone-200">
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-terracotta hover:underline font-mono"
                            >
                              <span>Wikimedia Commons</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
