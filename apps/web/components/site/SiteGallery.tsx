"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { components } from "../../lib/api-schema";

type SiteMediaResponse = components["schemas"]["SiteMediaResponse"];

interface SiteGalleryProps {
  media: SiteMediaResponse[];
  siteName: string;
}

export function SiteGallery({ media, siteName }: SiteGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = media.filter(
    (m) => !m.media_type || m.media_type === "image" || m.media_type === "photo"
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const showNext = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null) return null;
      return (curr + 1) % images.length;
    });
  }, [images.length]);

  const showPrev = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null) return null;
      return (curr - 1 + images.length) % images.length;
    });
  }, [images.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowRight") {
        showNext();
      } else if (e.key === "ArrowLeft") {
        showPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, closeLightbox, showNext, showPrev]);

  if (images.length === 0) {
    return (
      <section id="gallery" className="py-12 border-t border-border/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Photographic Archive</h2>
          <div className="p-8 rounded-xl bg-card/40 border border-border/60 text-center text-muted-foreground">
            No high-resolution archive photographs currently catalogued for this monument.
          </div>
        </div>
      </section>
    );
  }

  const activeImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <section id="gallery" className="py-12 border-t border-border/40 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Photographic Archive & Details
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {images.length} {images.length === 1 ? "archival plate" : "archival plates"} catalogued
          </p>
        </div>

        {/* Masonry / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((item, idx) => {
            const altText = item.caption || `${siteName} detail view ${idx + 1}`;
            return (
              <figure
                key={item.id || idx}
                className="group relative rounded-xl overflow-hidden bg-card border border-border/60 cursor-pointer shadow-sm hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => openLightbox(idx)}
                tabIndex={0}
                role="button"
                aria-label={`View image: ${altText}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLightbox(idx);
                  }
                }}
              >
                <div className="relative aspect-[4/3] w-full bg-muted/40 overflow-hidden">
                  <Image
                    src={item.url}
                    alt={altText}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-xs text-white/90 font-medium">Click to inspect in lightbox</span>
                  </div>
                </div>

                <figcaption className="p-3 bg-card text-xs space-y-1">
                  <p className="font-medium text-foreground line-clamp-1">{item.caption || `${siteName} detail`}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="truncate max-w-[65%]">{item.attribution || "Dharohar Archives"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[11px] uppercase font-semibold">
                      {item.license || "CC-BY-4.0"}
                    </span>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>

        {/* Lightbox Modal */}
        {lightboxIndex !== null && activeImage && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Image Lightbox"
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={closeLightbox}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white/90 z-10" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-mono text-white/60">
                Plate {lightboxIndex + 1} of {images.length}
              </span>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close Lightbox (Escape)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main Image Stage */}
            <div
              className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prev Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-transform active:scale-95"
                  aria-label="Previous Image (Left Arrow)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Display Image */}
              <div className="relative w-full h-full max-w-5xl max-h-[75vh]">
                <Image
                  src={activeImage.url}
                  alt={activeImage.caption || `${siteName} archival plate`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>

              {/* Next Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-transform active:scale-95"
                  aria-label="Next Image (Right Arrow)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Bottom Bar: Captions & Licences Always Visible */}
            <div
              className="max-w-3xl mx-auto w-full bg-white/10 backdrop-blur-md rounded-xl p-4 text-white border border-white/10 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium mb-1">
                {activeImage.caption || `${siteName} — Archival Photograph`}
              </p>
              <div className="flex flex-wrap items-center justify-between text-xs text-white/70 font-mono gap-2 pt-1 border-t border-white/10">
                <span>Attribution: {activeImage.attribution || "Archaeological Survey / Heritage Archives"}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px] uppercase font-semibold">
                  {activeImage.license || "CC-BY-4.0"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
