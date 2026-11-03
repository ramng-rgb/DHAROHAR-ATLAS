"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { components } from "../../lib/api-schema";

type NearbySiteItem = components["schemas"]["NearbySiteItem"];

interface NearbySitesSectionProps {
  nearbySites: NearbySiteItem[];
  currentSiteName: string;
  currentLat: number;
  currentLng: number;
}

export function NearbySitesSection({
  nearbySites,
  currentSiteName,
  currentLat,
  currentLng,
}: NearbySitesSectionProps) {
  if (nearbySites.length === 0) {
    return null;
  }

  const exploreTrailUrl = `/explore?lat=${currentLat.toFixed(4)}&lng=${currentLng.toFixed(4)}&zoom=10`;

  return (
    <section id="nearby" className="py-12 border-t border-border/40 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Nearby Monuments & Heritage Trail
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Calculated via spherical geodesic distance from {currentSiteName}
            </p>
          </div>

          <Link
            href={exploreTrailUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-medium transition-all shadow-sm active:scale-95 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Plan a trail on Explorer map
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {nearbySites.map((site) => (
            <Link
              key={site.id}
              href={`/sites/${site.slug}`}
              className="group rounded-xl overflow-hidden bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden">
                  {site.hero_image ? (
                    <Image
                      src={site.hero_image}
                      alt={site.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/40 font-mono text-xs">
                      No photo
                    </div>
                  )}

                  {/* Distance badge */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-white font-mono text-[11px] font-medium border border-white/20 flex items-center gap-1">
                    <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {site.distance_km < 1 ? "< 1 km" : `${site.distance_km.toFixed(1)} km`}
                  </div>

                  {/* 3D Badge if available */}
                  {site.has_3d_model && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono text-[11px] uppercase font-bold tracking-wider shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      3D Model
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
                    <span>{site.site_type.replace("_", " ")}</span>
                    {site.district && (
                      <>
                        <span>•</span>
                        <span>{site.district}</span>
                      </>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {site.name}
                  </h3>

                  {(site.name_hi || site.name_gu) && (
                    <p className="text-xs text-muted-foreground line-clamp-1 font-sans">
                      {[site.name_hi, site.name_gu].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 bg-muted/40 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>{site.era_label || site.state}</span>
                <span className="text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 font-sans font-medium text-xs">
                  Explore record &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
