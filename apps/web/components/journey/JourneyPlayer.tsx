"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play, Pause, ChevronRight, ChevronLeft, RotateCcw,
  Compass, MapPin, Eye, Box, FileText, Share2, Check,
  X, List, Map as MapIcon, Volume2, ShieldCheck,
  AlertCircle, Sparkles, Navigation, Layers
} from "lucide-react";
import { JourneyDetail, JourneyStop } from "@/lib/api";
import { translations, SupportedLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface JourneyPlayerProps {
  journey: JourneyDetail;
  embedded?: boolean;
  onExit?: () => void;
  locale?: SupportedLocale;
}

export function JourneyPlayer({
  journey,
  embedded = false,
  onExit,
  locale = "en"
}: JourneyPlayerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = translations[locale] || translations.en;

  // Initialize stop from URL or default to 0
  const initialStopParam = searchParams.get("stop");
  const initialPlayingParam = searchParams.get("playing");
  const initialStopIndex = initialStopParam
    ? Math.max(0, Math.min(journey.stops.length - 1, parseInt(initialStopParam, 10) - 1))
    : 0;

  const [currentStopIndex, setCurrentStopIndex] = useState<number>(initialStopIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlayingParam === "1");
  const [speed, setSpeed] = useState<number>(1.0);
  const [activeView, setActiveView] = useState<"map" | "text">("map");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [ariaMessage, setAriaMessage] = useState<string>("");

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const travelerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stops = journey.stops || [];
  const activeStop: JourneyStop | undefined = stops[currentStopIndex] || stops[0];

  // Detect reduced motion safely
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  // Update URL state
  const syncUrlState = useCallback((stopIdx: number, playing: boolean) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("stop", String(stopIdx + 1));
    if (playing) {
      params.set("playing", "1");
    } else {
      params.delete("playing");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, []);

  // Announce stop change to screen readers
  useEffect(() => {
    if (!activeStop) return;
    const name = locale === "hi" && activeStop.site_name_hi
      ? activeStop.site_name_hi
      : locale === "gu" && activeStop.site_name_gu
      ? activeStop.site_name_gu
      : activeStop.site_name;
    setAriaMessage(`Stop ${activeStop.stop_order} of ${stops.length}: ${name}. ${activeStop.arrival_note}`);
  }, [currentStopIndex, activeStop, locale, stops.length]);

  // Jump to stop handler
  const handleJumpToStop = useCallback((index: number) => {
    const target = Math.max(0, Math.min(stops.length - 1, index));
    setCurrentStopIndex(target);
    setIsSummaryOpen(target === stops.length - 1 && target > 0);
    syncUrlState(target, isPlaying);
  }, [stops.length, isPlaying, syncUrlState]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const nextState = !prev;
      syncUrlState(currentStopIndex, nextState);
      return nextState;
    });
  }, [currentStopIndex, syncUrlState]);

  // Share link handler
  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/journeys/${journey.slug}?stop=${currentStopIndex + 1}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  }, [journey.slug, currentStopIndex]);

  // Exit handler
  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      router.push("/explore");
    }
  }, [onExit, router]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleJumpToStop(currentStopIndex + 1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleJumpToStop(currentStopIndex - 1);
      } else if (e.code === "Escape") {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStopIndex, handleTogglePlay, handleJumpToStop, handleExit]);

  // Autoplay dwell pacing timer
  useEffect(() => {
    if (!isPlaying || isSummaryOpen) return;

    const dwellSec = activeStop?.dwell_seconds || 12;
    const adjustedMs = (dwellSec / speed) * 1000;

    const timer = setTimeout(() => {
      if (currentStopIndex < stops.length - 1) {
        handleJumpToStop(currentStopIndex + 1);
      } else {
        setIsPlaying(false);
        setIsSummaryOpen(true);
        syncUrlState(currentStopIndex, false);
      }
    }, adjustedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStopIndex, speed, activeStop, stops.length, isSummaryOpen, handleJumpToStop, syncUrlState]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const initialCoords: [number, number] = [
      activeStop?.longitude || 72.57,
      activeStop?.latitude || 23.02
    ];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap, © CARTO"
          }
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: initialCoords,
      zoom: 8.8,
      pitch: prefersReducedMotion ? 0 : 45,
      bearing: activeStop?.bearing_deg || 0
    });

    map.on("load", () => {
      const allCoords = stops.map((s) => [s.longitude, s.latitude]);

      // 1. Static full route background guide
      map.addSource("full-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: allCoords
          }
        }
      });

      map.addLayer({
        id: "full-route-glow",
        type: "line",
        source: "full-route",
        paint: {
          "line-color": "#5A4228",
          "line-width": 4,
          "line-opacity": 0.35,
          "line-dasharray": [2, 2]
        }
      });

      // 2. Dynamic progressively drawn route line
      const drawnCoords = allCoords.slice(0, currentStopIndex + 1);
      map.addSource("drawn-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: drawnCoords.length >= 2 ? drawnCoords : [initialCoords, initialCoords]
          }
        }
      });

      // Outer gold bloom
      map.addLayer({
        id: "drawn-route-glow",
        type: "line",
        source: "drawn-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#D4AF37",
          "line-width": 8,
          "line-opacity": 0.5,
          "line-blur": 3
        }
      });

      // Core terracotta-gold line
      map.addLayer({
        id: "drawn-route-core",
        type: "line",
        source: "drawn-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#F3C649",
          "line-width": 3.5
        }
      });

      // 3. Add Stop Markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      stops.forEach((stop, idx) => {
        const isCurrent = idx === currentStopIndex;
        const el = document.createElement("div");
        el.className = "journey-stop-marker cursor-pointer group";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `Stop ${stop.stop_order}: ${stop.site_name}`);
        el.tabIndex = 0;

        el.innerHTML = `
          <div class="relative flex flex-col items-center justify-center transition-transform hover:scale-110">
            <div class="w-8 h-8 rounded-full ${
              isCurrent
                ? "bg-[#C85A32] border-2 border-[#F3C649] text-white shadow-lg shadow-[#C85A32]/60 scale-110"
                : "bg-[#1A1510] border-2 border-[#D4AF37] text-[#D4AF37] shadow-md shadow-black"
            } font-bold text-xs flex items-center justify-center">
              ${stop.stop_order}
            </div>
            <div class="absolute -bottom-6 text-[11px] font-serif font-bold text-[#F6F1E9] bg-black/85 px-2 py-0.5 rounded border border-[#D4AF37]/40 whitespace-nowrap pointer-events-none shadow">
              ${stop.site_name.split(" ")[0]}
            </div>
          </div>
        `;

        el.addEventListener("click", () => handleJumpToStop(idx));
        el.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault();
            handleJumpToStop(idx);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 4. Animated Traveler Pulsing Compass Marker
      const travelerEl = document.createElement("div");
      travelerEl.className = "traveler-compass-pin pointer-events-none";
      travelerEl.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-[#C85A32] to-[#D4AF37] p-1 shadow-2xl shadow-[#D4AF37]/70 flex items-center justify-center ring-4 ring-[#D4AF37]/40 animate-pulse">
          <svg class="w-5 h-5 text-[#0F141C]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `;
      travelerMarkerRef.current = new maplibregl.Marker({ element: travelerEl })
        .setLngLat(initialCoords)
        .addTo(map);
    });

    mapInstance.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [journey, stops, prefersReducedMotion, handleJumpToStop]);

  // Update map camera & progressively draw line on stop change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !activeStop) return;

    const targetCoords: [number, number] = [activeStop.longitude, activeStop.latitude];

    // Fly camera smoothly with pitch and bearing
    if (prefersReducedMotion) {
      map.jumpTo({
        center: targetCoords,
        zoom: 9.5
      });
    } else {
      map.flyTo({
        center: targetCoords,
        zoom: 9.5,
        pitch: 45,
        bearing: activeStop.bearing_deg ?? 0,
        speed: 1.1,
        curve: 1.42,
        essential: true
      });
    }

    // Update traveler marker position
    if (travelerMarkerRef.current) {
      travelerMarkerRef.current.setLngLat(targetCoords);
    }

    // Progressively draw route line up to current stop
    const drawnSource = map.getSource("drawn-route") as maplibregl.GeoJSONSource | undefined;
    if (drawnSource) {
      const allCoords = stops.map((s) => [s.longitude, s.latitude]);
      const currentCoords = allCoords.slice(0, currentStopIndex + 1);
      if (currentCoords.length >= 2) {
        drawnSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: currentCoords
          }
        });
      }
    }

    // Highlight active stop marker
    markersRef.current.forEach((marker, idx) => {
      const el = marker.getElement();
      const circle = el.querySelector(".w-8") as HTMLElement | null;
      if (circle) {
        if (idx === currentStopIndex) {
          circle.className = "w-8 h-8 rounded-full bg-[#C85A32] border-2 border-[#F3C649] text-white shadow-lg shadow-[#C85A32]/60 scale-110 font-bold text-xs flex items-center justify-center";
        } else {
          circle.className = "w-8 h-8 rounded-full bg-[#1A1510] border-2 border-[#D4AF37] text-[#D4AF37] shadow-md shadow-black font-bold text-xs flex items-center justify-center";
        }
      }
    });
  }, [currentStopIndex, activeStop, stops, prefersReducedMotion]);

  // Localized Stop Title
  const activeStopTitle = useMemo(() => {
    if (!activeStop) return "";
    if (locale === "hi" && activeStop.site_name_hi) return activeStop.site_name_hi;
    if (locale === "gu" && activeStop.site_name_gu) return activeStop.site_name_gu;
    return activeStop.site_name;
  }, [activeStop, locale]);

  // Localized Journey Title
  const journeyTitle = useMemo(() => {
    if (locale === "hi" && journey.title_hi) return journey.title_hi;
    if (locale === "gu" && journey.title_gu) return journey.title_gu;
    return journey.title;
  }, [journey, locale]);

  return (
    <div
      className={`relative w-full ${
        embedded ? "h-[700px] rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-2xl" : "h-[calc(100vh-4rem)]"
      } flex flex-col bg-[#090D16] text-[#F6F1E9]`}
      data-testid="journey-player"
    >
      {/* Throttled Screen Reader Live Region */}
      <div className="sr-only" role="status" aria-live="polite">
        {ariaMessage}
      </div>

      {/* Main Map */}
      <div
        ref={mapContainer}
        className={`w-full h-full ${activeView === "map" ? "block" : "hidden pointer-events-none"}`}
        tabIndex={-1}
        aria-label="Interactive Journey Map"
      />

      {/* Plain Accessible Text View */}
      {activeView === "text" && (
        <div className="absolute inset-0 z-30 w-full h-full overflow-y-auto p-6 md:p-12 bg-[#0E131E] space-y-8" data-testid="journey-text-version">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#D4AF37]">{journeyTitle}</h2>
                <p className="text-sm text-[#D8C3A5] mt-1">{journey.summary}</p>
                <div className="flex gap-4 text-xs text-[#D8C3A5]/80 mt-2">
                  <span>{journey.total_stops} Stops</span>
                  <span>• {journey.total_distance_km} Kilometers</span>
                  <span>• {journey.difficulty}</span>
                </div>
              </div>
              <Button
                data-testid="return-to-map-button"
                variant="outline"
                size="sm"
                onClick={() => setActiveView("map")}
                className="gap-2 text-[#D4AF37] border-[#D4AF37]/40 hover:bg-[#D4AF37]/20"
              >
                <MapIcon className="w-4 h-4" />
                <span>{t.journey.mapVersion}</span>
              </Button>
            </div>

            {/* Plain Ordered Stop List */}
            <ol className="space-y-6" aria-label="Heritage trail stops list">
              {stops.map((st, idx) => (
                <li
                  key={st.id}
                  className={`p-6 rounded-xl border transition-all ${
                    idx === currentStopIndex
                      ? "bg-[#1A1510] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 ring-1 ring-[#D4AF37]"
                      : "bg-[#141A26] border-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-indigoInk font-bold text-xs flex items-center justify-center">
                          {st.stop_order}
                        </span>
                        <h3 className="text-lg font-serif font-bold text-[#F6F1E9]">
                          {locale === "hi" && st.site_name_hi ? st.site_name_hi : locale === "gu" && st.site_name_gu ? st.site_name_gu : st.site_name}
                        </h3>
                        {st.era_label && (
                          <Badge variant="era">
                            {st.era_label}
                          </Badge>
                        )}
                        {st.is_illustrative && (
                          <span className="text-[10px] bg-amber-950/80 text-amber-350 border border-amber-600/50 px-2 py-0.5 rounded font-medium">
                            {t.journey.illustrative}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-[#EFE6D8] leading-relaxed">
                        {st.arrival_note}
                      </p>
                      <p className="text-xs text-[#D8C3A5]/70 italic">
                        Source: {st.arrival_note_source}
                      </p>

                      {st.linked_folklore && st.linked_folklore.length > 0 && (
                        <div className="text-xs bg-[#0F141C] p-3 rounded border border-[#D4AF37]/20 mt-2 space-y-1">
                          <span className="font-bold text-[#D4AF37] block">Oral Narrative: {st.linked_folklore[0].title}</span>
                          <p className="text-[#D8C3A5] line-clamp-2">{st.linked_folklore[0].body_md}</p>
                        </div>
                      )}

                      {st.linked_documents && st.linked_documents.length > 0 && (
                        <div className="text-xs bg-[#0F141C] p-2.5 rounded border border-[#D4AF37]/20 mt-2 flex items-center gap-1.5">
                          <span className="font-semibold text-[#D8C3A5]/70">Document:</span>
                          <span className="font-semibold text-[#D8C3A5]">{st.linked_documents[0].title}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[#D4AF37] pt-2">
                        <span>Leg: {st.leg_distance_km} km</span>
                        <span>• Cumulative: {st.cumulative_distance_km} km</span>
                        <Link
                          href={`/sites/${st.site_slug}`}
                          className="hover:underline font-semibold flex items-center gap-1 text-[#F3C649]"
                        >
                          {t.journey.openSite} <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleJumpToStop(idx);
                        setActiveView("map");
                      }}
                      className="text-xs px-3 py-1.5 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 flex-shrink-0"
                    >
                      Fly on Map
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Top Header Dossier Bar */}
      <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex items-start justify-between gap-4">
        <div className="glass-panel-gold rounded-xl p-3 md:p-4 pointer-events-auto border border-[#D4AF37]/50 shadow-2xl max-w-xl">
          <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
            <Compass className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
            <span>{t.journey.modeTitle}</span>
            <span className="text-[#D8C3A5]/60">•</span>
            <span className="text-[#D8C3A5] font-normal">{journey.difficulty}</span>
          </div>
          <h1 className="text-base md:text-xl font-serif font-bold text-[#F6F1E9] leading-tight">
            {journeyTitle}
          </h1>
          <div className="flex items-center gap-3 text-xs text-[#D8C3A5] mt-1 font-serif">
            <span>{journey.total_distance_km} km Total</span>
            <span>• {stops.length} Historic Stops</span>
            <span>• ~{journey.estimated_duration_days} Days Overland</span>
          </div>
        </div>

        {/* Top Right Utility Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Toggle Text / Map View */}
          <button
            onClick={() => setActiveView((v) => (v === "map" ? "text" : "map"))}
            className="glass-panel-gold p-2.5 rounded-xl border border-[#D4AF37]/50 text-[#D8C3A5] hover:text-[#F3C649] transition shadow-lg"
            title={activeView === "map" ? t.journey.textVersion : t.journey.mapVersion}
            aria-label={activeView === "map" ? t.journey.textVersion : t.journey.mapVersion}
          >
            {activeView === "map" ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
          </button>

          {/* Toggle Stop Drawer */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="glass-panel-gold p-2.5 rounded-xl border border-[#D4AF37]/50 text-[#D8C3A5] hover:text-[#F3C649] transition shadow-lg flex items-center gap-1.5 text-xs font-medium"
            title="Open itinerary stop list"
            aria-label="Open itinerary stop list"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Stops ({stops.length})</span>
          </button>

          {/* Share Link */}
          <button
            onClick={handleShare}
            className="glass-panel-gold p-2.5 rounded-xl border border-[#D4AF37]/50 text-[#D8C3A5] hover:text-[#F3C649] transition shadow-lg"
            title={t.journey.share}
            aria-label={t.journey.share}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Exit Journey */}
          <button
            onClick={handleExit}
            className="glass-panel-gold p-2.5 rounded-xl border border-[#D4AF37]/50 text-[#D8C3A5] hover:text-red-400 transition shadow-lg"
            title={t.journey.exit}
            aria-label={t.journey.exit}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stop List Drawer (Collapsible) */}
      {isDrawerOpen && (
        <aside
          className="absolute top-20 right-4 z-30 w-80 max-h-[calc(100vh-14rem)] glass-panel-gold rounded-2xl p-4 border border-[#D4AF37]/60 shadow-2xl overflow-y-auto space-y-3"
          aria-label="Stop selection sidebar"
        >
          <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-2">
            <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37]">
              Itinerary Stops
            </span>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-[#D8C3A5] hover:text-white"
              aria-label="Close stop list"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {stops.map((st, i) => (
              <button
                key={st.id}
                onClick={() => {
                  handleJumpToStop(i);
                  setIsDrawerOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition flex items-center gap-3 ${
                  i === currentStopIndex
                    ? "bg-[#C85A32]/25 border-[#D4AF37] text-[#F3C649]"
                    : "bg-[#141A26]/80 border-transparent hover:border-[#D4AF37]/30 text-[#EFE6D8]"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-[#1A1510] border border-[#D4AF37] text-xs font-bold text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                  {st.stop_order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif font-bold truncate">
                    {locale === "hi" && st.site_name_hi ? st.site_name_hi : locale === "gu" && st.site_name_gu ? st.site_name_gu : st.site_name}
                  </p>
                  <p className="text-[10px] text-[#D8C3A5]/70 truncate">
                    {st.state} • {st.cumulative_distance_km} km
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Final Summary Card Modal */}
      {isSummaryOpen && (
        <div
          className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.journey.complete}
        >
          <div className="glass-panel-gold max-w-lg w-full rounded-2xl p-6 border border-[#D4AF37] shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-3">
              <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#D4AF37]">
                <Sparkles className="w-4 h-4 text-[#F3C649]" />
                <span>{t.journey.complete}</span>
              </div>
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="text-[#D8C3A5] hover:text-white"
                aria-label="Close summary modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-center">
              <h3 className="text-2xl font-serif font-bold text-[#F6F1E9]">
                {journeyTitle}
              </h3>
              <p className="text-sm text-[#EFE6D8] leading-relaxed">
                You have traversed all {stops.length} consecrated stations across {journey.total_distance_km} kilometers of medieval hydraulic and architectural marvels.
              </p>

              <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#D4AF37]/20 text-center">
                <div className="p-2 rounded-lg bg-[#141A26]">
                  <span className="text-xs text-[#D8C3A5] block">Stops</span>
                  <span className="text-xl font-bold font-serif text-[#F3C649]">{stops.length}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#141A26]">
                  <span className="text-xs text-[#D8C3A5] block">Distance</span>
                  <span className="text-xl font-bold font-serif text-[#F3C649]">{journey.total_distance_km} km</span>
                </div>
                <div className="p-2 rounded-lg bg-[#141A26]">
                  <span className="text-xs text-[#D8C3A5] block">Overland</span>
                  <span className="text-xl font-bold font-serif text-[#F3C649]">{journey.estimated_duration_days} Days</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-[#D4AF37] border-[#D4AF37]/50"
                onClick={() => handleJumpToStop(0)}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Journey</span>
              </Button>

              <Button
                variant="primary"
                className="flex-1 gap-2 bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649]"
                onClick={handleShare}
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? "Link Copied!" : "Share Journey"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Stop Narrative Card & Scrub Controls */}
      {activeStop && activeView === "map" && (
        <section
          className="absolute bottom-4 left-3 right-3 md:left-8 md:right-8 z-20 pointer-events-none"
          aria-label="Active stop story card and playback controls"
        >
          <div className="glass-panel-gold rounded-2xl p-4 md:p-6 pointer-events-auto border border-[#D4AF37]/60 shadow-2xl max-w-4xl mx-auto space-y-4">
            {/* Top Row: Stop Metadata & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#C85A32] text-white">
                  Stop {activeStop.stop_order} of {stops.length}
                </span>
                {activeStop.era_label && (
                  <Badge variant="era">
                    {activeStop.era_label}
                  </Badge>
                )}
                {activeStop.is_illustrative && (
                  <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded font-medium">
                    {t.journey.illustrative}
                  </span>
                )}
                <span className="text-xs text-[#D8C3A5]/80 font-serif">
                  {activeStop.state} • {activeStop.cumulative_distance_km} km traversed
                </span>
              </div>

              {/* Action Buttons to Site, 3D Twin, and Docs */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/sites/${activeStop.site_slug}`}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.journey.openSite}</span>
                </Link>

                {activeStop.has_3d_model && (
                  <Link
                    href={`/sites/${activeStop.site_slug}#digital-twin`}
                    className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#F3C649] border border-[#F3C649]/60 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{t.journey.open3D}</span>
                  </Link>
                )}

                {activeStop.linked_documents && activeStop.linked_documents.length > 0 && (
                  <Link
                    href={`/archive`}
                    className="px-3 py-1.5 rounded-lg bg-[#141A26] hover:bg-[#D4AF37]/20 text-[#D8C3A5] border border-[#D4AF37]/30 text-xs flex items-center gap-1.5 transition hidden sm:flex"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{activeStop.linked_documents.length} Folios</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Middle Row: Content & Image */}
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Hero Image with Attribution */}
              <div className="relative w-full md:w-48 h-32 md:h-28 rounded-xl overflow-hidden flex-shrink-0 border border-[#D4AF37]/40 bg-[#1A1510]">
                {activeStop.hero_media?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeStop.hero_media.url}
                    alt={activeStop.site_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#D8C3A5]/40 text-xs">
                    Archival Photograph
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/80 px-2 py-0.5 text-[9px] text-[#D8C3A5]/90 truncate">
                  {activeStop.hero_media?.attribution || "ASI Survey Archives"} ({activeStop.hero_media?.licence || "CC-BY-4.0"})
                </div>
              </div>

              {/* Stop Narrative & Linked Records */}
              <div className="space-y-2 flex-1 min-w-0">
                <h2 className="font-serif text-lg md:text-xl font-bold text-[#F6F1E9] truncate">
                  {activeStopTitle}
                </h2>

                <p className="text-xs md:text-sm text-[#EFE6D8] leading-relaxed line-clamp-3">
                  "{activeStop.arrival_note}"
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#D8C3A5]/70 pt-1">
                  <span>Source: {activeStop.arrival_note_source}</span>
                  {activeStop.linked_folklore && activeStop.linked_folklore.length > 0 && (
                    <span className="text-[#D4AF37]">
                      • Folklore: {activeStop.linked_folklore[0].title}
                    </span>
                  )}
                  {activeStop.linked_observations && activeStop.linked_observations.length > 0 && (
                    <span className="text-[#D8C3A5]">
                      • Field Note: {activeStop.linked_observations[0].title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Scrubbable Timeline Progress & Controls */}
            <div className="pt-2 border-t border-[#D4AF37]/25 space-y-3">
              {/* Scrubbable Progress Bar with Stop Ticks */}
              <div className="relative flex items-center py-1">
                {/* Background track */}
                <div className="w-full h-2 rounded-full bg-[#1A1510] border border-[#D4AF37]/30 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C85A32] to-[#F3C649] transition-all duration-300"
                    style={{
                      width: `${(currentStopIndex / Math.max(1, stops.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {/* Stop Ticks along the track */}
                <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                  {stops.map((st, i) => (
                    <button
                      key={st.id}
                      onClick={() => handleJumpToStop(i)}
                      className={`w-3.5 h-3.5 rounded-full pointer-events-auto transition-transform ${
                        i <= currentStopIndex
                          ? "bg-[#F3C649] ring-2 ring-[#C85A32] scale-110"
                          : "bg-[#1A1510] border border-[#D4AF37]/60 hover:scale-125"
                      }`}
                      title={`Stop ${st.stop_order}: ${st.site_name}`}
                      aria-label={`Jump to stop ${st.stop_order}`}
                    />
                  ))}
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center justify-between gap-4">
                {/* Play / Pause & Prev / Next */}
                <div className="flex items-center gap-1.5 bg-[#141A26] p-1 rounded-xl border border-[#D4AF37]/40">
                  <button
                    onClick={() => handleJumpToStop(currentStopIndex - 1)}
                    disabled={currentStopIndex === 0}
                    className="p-1.5 rounded-lg hover:bg-[#D4AF37]/20 text-[#D8C3A5] disabled:opacity-30 transition"
                    title="Previous Stop (Left Arrow)"
                    aria-label="Previous Stop"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-indigoInk font-bold text-xs flex items-center gap-1.5 hover:bg-[#F3C649] transition shadow-md"
                    title={isPlaying ? "Pause Route (Space)" : "Play Route (Space)"}
                    aria-label={isPlaying ? "Pause Route" : "Play Route"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-indigoInk" />}
                    <span>{isPlaying ? t.journey.pause : t.journey.play}</span>
                  </button>

                  <button
                    onClick={() => handleJumpToStop(currentStopIndex + 1)}
                    disabled={currentStopIndex === stops.length - 1}
                    className="p-1.5 rounded-lg hover:bg-[#D4AF37]/20 text-[#D8C3A5] disabled:opacity-30 transition"
                    title="Next Stop (Right Arrow)"
                    aria-label="Next Stop"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Selector (0.5x, 1x, 2x) */}
                <div className="flex items-center gap-1 bg-[#141A26] p-1 rounded-xl border border-[#D4AF37]/30 text-xs">
                  <span className="text-[10px] text-[#D8C3A5]/60 px-1 font-serif hidden sm:inline">Speed:</span>
                  {[0.5, 1.0, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                        speed === s
                          ? "bg-[#D4AF37] text-indigoInk"
                          : "text-[#D8C3A5] hover:text-[#F3C649]"
                      }`}
                      aria-label={`Playback speed ${s}x`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Journey Progress Indicators */}
                <div className="text-xs text-[#D8C3A5] font-serif hidden sm:block text-right">
                  <span className="text-[#F3C649] font-bold">
                    {activeStop.stop_order} of {stops.length}
                  </span>{" "}
                  stations ({activeStop.cumulative_distance_km} / {journey.total_distance_km} km)
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
