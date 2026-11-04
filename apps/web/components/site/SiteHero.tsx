"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  MapPin, Share2, Copy, Check, Quote, ExternalLink, 
  ShieldCheck, Box, ArrowLeft, Compass, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { speakNarration, stopNarration } from "@/lib/audioNarration";
import type { SiteFullDetail } from "@/lib/api-client";

interface SiteHeroProps {
  site: SiteFullDetail;
  onOpenCite: () => void;
}

export function SiteHero({ site, onOpenCite }: SiteHeroProps) {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);

  const handleAudioNarration = () => {
    if (speaking) {
      stopNarration();
      setSpeaking(false);
    } else {
      const eraText = site.era_label || site.era ? `Constructed in ${site.era_label || site.era}` : "";
      const text = `${site.name}. Located in ${site.state}. ${eraText}. ${site.summary || ""}`;
      setSpeaking(true);
      speakNarration(text, "en", () => setSpeaking(false));
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${site.name} | Dharohar Atlas`,
          text: site.summary || `Explore ${site.name} on Dharohar Atlas`,
          url: window.location.href,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-[#D4AF37]/50 shadow-2xl bg-[#0E0C09] text-white">
      {/* Full-bleed Hero Image Background via next/image */}
      {site.hero_image ? (
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={site.hero_image}
            alt={`${site.name}, ${site.district || ""}, ${site.state}`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-[#16120D] flex items-center justify-center text-amber-100/30 font-mono text-sm"
          aria-hidden="true"
        >
          Archival Monument Plate
        </div>
      )}

      {/* Atmospheric Multi-layer Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0E0C09] via-[#0E0C09]/80 to-[#0E0C09]/50" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#0E0C09]/90" />

      {/* Foreground Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-6">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#D8C3A5]">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Geospatial Explorer</span>
          </Link>

          {/* Image Attribution Strip */}
          <div className="flex items-center gap-2">
            {(!site.hero_image || site.hero_image.startsWith("http://placehold") || site.hero_image.includes("placeholder")) && (
              <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-200 border border-amber-500/40 text-[11px] font-mono">
                Placeholder
              </span>
            )}
            {site.hero_image && (
              <div className="text-xs text-[#D8C3A5] bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1.5">
                <span>Photo: <span className="text-white font-medium">{site.hero_image_attribution || "Wikimedia Commons Contributor"}</span></span>
                <span>•</span>
                <span className="text-white">{site.hero_image_license || "CC-BY-SA 4.0"}</span>
                <a
                  href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(site.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-goldLeaf hover:underline inline-flex items-center ml-1"
                  aria-label="View original image on Wikimedia Commons"
                >
                  <span>Commons</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Chips & Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#9E3D1D] text-white shadow-md">
            {site.site_type}
          </span>

          {site.era_label && (
            <span className="text-xs font-serif px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 backdrop-blur-md">
              {site.era_label}
            </span>
          )}

          {site.dynasty && (
            <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-[#EFE6D8] border border-white/15 backdrop-blur-md">
              {site.dynasty}
            </span>
          )}

          <span className="text-xs px-3 py-1 rounded-full bg-[#1A1510]/80 text-[#EFE6D8] border border-[#D4AF37]/30 flex items-center gap-1.5 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="capitalize">{site.data_confidence.replace("_", " ")}</span>
          </span>

          {site.has_3d_model && (
            <span className="text-xs font-serif px-3 py-1 rounded-full bg-[#D4AF37] text-[#1A1510] font-bold flex items-center gap-1 shadow-lg">
              <Box className="w-3.5 h-3.5" />
              <span>3D Digital Twin Ready</span>
            </span>
          )}
        </div>

        {/* Trilingual Title Block */}
        <div className="space-y-2 max-w-4xl">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F6F1E9] leading-tight">
            {site.name}
          </h1>

          {(site.name_hi || site.name_gu) && (
            <div className="flex flex-wrap items-center gap-3 text-lg sm:text-xl text-[#D8C3A5] font-serif pt-1">
              {site.name_hi && <span>{site.name_hi}</span>}
              {site.name_hi && site.name_gu && <span className="text-[#D4AF37]/40">•</span>}
              {site.name_gu && <span>{site.name_gu}</span>}
            </div>
          )}
        </div>

        {/* Summary Snippet */}
        {site.summary && (
          <p className="text-sm sm:text-base text-[#EFE6D8] leading-relaxed max-w-[48ch] text-pretty font-sans">
            {site.summary}
          </p>
        )}

        {/* Quick Actions Strip */}
        <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-[#D4AF37]/20">
          <Link href={`/explore?lat=${site.latitude}&lng=${site.longitude}&zoom=14&site=${site.slug}`}>
            <Button
              variant="primary"
              size="sm"
              icon={<MapPin className="w-3.5 h-3.5 text-[#1A1510]" />}
              className="font-bold"
            >
              Show on Map
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCite}
            icon={<Quote className="w-3.5 h-3.5" />}
          >
            Cite Record
          </Button>

          <Button
            variant={speaking ? "primary" : "secondary"}
            size="sm"
            onClick={handleAudioNarration}
            icon={<Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
          >
            {speaking ? "Pause Audio" : "Listen Guide"}
          </Button>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}&travelmode=walking`}
            target="_blank"
            rel="noreferrer"
            className="inline-block"
            title="Open Turn-by-Turn GPS Directions in Google Maps"
          >
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5 text-[#C85A32]" />}
            >
              Google Maps
            </Button>
          </a>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            icon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            icon={<Share2 className="w-3.5 h-3.5" />}
          >
            {shared ? "Shared!" : "Share"}
          </Button>

          <div className="ml-auto text-xs text-[#D8C3A5] font-serif hidden md:flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>GPS: {site.latitude.toFixed(4)}° N, {site.longitude.toFixed(4)}° E</span>
          </div>
        </div>
      </div>
    </div>
  );
}
