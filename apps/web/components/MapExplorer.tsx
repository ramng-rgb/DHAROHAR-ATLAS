"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Filter, Calendar, MapPin, Eye, Box, SlidersHorizontal, 
  Layers, List, Map as MapIcon, ChevronRight, X, Sparkles
} from "lucide-react";
import { SiteBrief } from "@/lib/api";

interface MapExplorerProps {
  initialSites: SiteBrief[];
}

export function MapExplorer({ initialSites }: MapExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});

  // Filter state
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "ALL");
  const [selectedState, setSelectedState] = useState<string>(searchParams.get("state") || "ALL");
  const [selectedDynasty, setSelectedDynasty] = useState<string>(searchParams.get("dynasty") || "ALL");
  const [timelineYear, setTimelineYear] = useState<number>(1800);
  const [activeSite, setActiveSite] = useState<SiteBrief | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Extract unique options
  const siteTypes = useMemo(() => {
    const types = new Set<string>();
    initialSites.forEach((s) => types.add(s.site_type));
    return ["ALL", ...Array.from(types).sort()];
  }, [initialSites]);

  const states = useMemo(() => {
    const sList = new Set<string>();
    initialSites.forEach((s) => sList.add(s.state));
    return ["ALL", ...Array.from(sList).sort()];
  }, [initialSites]);

  const dynasties = useMemo(() => {
    const dList = new Set<string>();
    initialSites.forEach((s) => {
      if (s.dynasty) dList.add(s.dynasty.split(" ")[0]);
    });
    return ["ALL", ...Array.from(dList).sort()];
  }, [initialSites]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return initialSites.filter((site) => {
      if (selectedType !== "ALL" && site.site_type !== selectedType) return false;
      if (selectedState !== "ALL" && site.state !== selectedState) return false;
      if (selectedDynasty !== "ALL" && (!site.dynasty || !site.dynasty.includes(selectedDynasty))) return false;
      if (site.era_start_year && site.era_start_year > timelineYear) return false;
      return true;
    });
  }, [initialSites, selectedType, selectedState, selectedDynasty, timelineYear]);

  // Update deep-linkable URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedType !== "ALL") params.set("type", selectedType);
    if (selectedState !== "ALL") params.set("state", selectedState);
    if (selectedDynasty !== "ALL") params.set("dynasty", selectedDynasty);
    if (timelineYear < 1800) params.set("year", String(timelineYear));
    const qs = params.toString();
    router.replace(`/explorer${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [selectedType, selectedState, selectedDynasty, timelineYear, router]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

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
            attribution: "© OpenStreetMap contributors, © CARTO"
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
      center: [72.5, 24.2], // Western India (Gujarat / Rajasthan center)
      zoom: 6.2,
      pitch: 35,
      bearing: -5
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Sync Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    filteredSites.forEach((site) => {
      const el = document.createElement("div");
      el.className = "heritage-marker cursor-pointer group";

      const has3D = site.slug.includes("vav") || site.slug.includes("stepwell") || site.slug.includes("modhera");
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full ${
            has3D 
              ? "bg-gradient-to-br from-[#D4AF37] to-[#C85A32] shadow-lg shadow-[#D4AF37]/50 ring-2 ring-[#D4AF37]" 
              : "bg-[#1E293B] border border-[#D4AF37]/80 text-[#D8C3A5]"
          } flex items-center justify-center transition-transform hover:scale-125">
            <svg class="w-4 h-4 text-[#090D16]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
            </svg>
          </div>
          <span class="absolute -bottom-5 whitespace-nowrap text-[11px] font-serif font-bold text-[#F6F1E9] bg-black/80 px-2 py-0.5 rounded border border-[#D4AF37]/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            ${site.name}
          </span>
        </div>
      `;

      el.addEventListener("click", () => {
        setActiveSite(site);
        map.flyTo({
          center: [site.longitude, site.latitude],
          zoom: 10,
          speed: 1.2,
          curve: 1.4
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([site.longitude, site.latitude])
        .addTo(map);

      markersRef.current[site.id] = marker;
    });
  }, [filteredSites]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#090D16]">
      {/* Top Filter & Control Ribbon */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Filter Bar */}
        <div className="glass-panel-gold rounded-lg p-2.5 flex flex-wrap items-center gap-2 pointer-events-auto border border-[#D4AF37]/40 shadow-xl max-w-4xl">
          <div className="flex items-center gap-1.5 px-2 text-xs font-serif font-bold text-[#D4AF37] border-r border-[#D4AF37]/30">
            <Filter className="w-3.5 h-3.5" />
            <span>ARCHIVE FILTERS:</span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#1A1510] border border-[#D4AF37]/40 text-xs text-[#F6F1E9] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
          >
            {siteTypes.map((t) => (
              <option key={t} value={t}>Type: {t}</option>
            ))}
          </select>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-[#1A1510] border border-[#D4AF37]/40 text-xs text-[#F6F1E9] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
          >
            {states.map((s) => (
              <option key={s} value={s}>State: {s}</option>
            ))}
          </select>

          {/* Dynasty Filter */}
          <select
            value={selectedDynasty}
            onChange={(e) => setSelectedDynasty(e.target.value)}
            className="bg-[#1A1510] border border-[#D4AF37]/40 text-xs text-[#F6F1E9] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
          >
            {dynasties.map((d) => (
              <option key={d} value={d}>Dynasty: {d}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(selectedType !== "ALL" || selectedState !== "ALL" || selectedDynasty !== "ALL" || timelineYear < 1800) && (
            <button
              onClick={() => {
                setSelectedType("ALL");
                setSelectedState("ALL");
                setSelectedDynasty("ALL");
                setTimelineYear(1800);
              }}
              className="px-2 py-1 text-xs text-[#C85A32] hover:text-[#E07A5F] flex items-center gap-1 font-semibold"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}

          {/* Count Badge */}
          <span className="text-xs text-[#D8C3A5] font-serif ml-auto pl-3 border-l border-[#D4AF37]/30">
            Showing <strong className="text-[#D4AF37]">{filteredSites.length}</strong> Sites
          </span>
        </div>

        {/* View Switcher (Map / List A11y) */}
        <div className="glass-panel rounded-lg p-1 flex items-center pointer-events-auto border border-[#D4AF37]/40">
          <button
            onClick={() => setViewMode("map")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              viewMode === "map"
                ? "bg-[#D4AF37] text-indigoInk"
                : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-[#D4AF37] text-indigoInk"
                : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Screen-Reader List
          </button>
        </div>
      </div>

      {/* Map Canvas / Accessible List Alternative */}
      {viewMode === "map" ? (
        <div ref={mapContainer} className="w-full h-full" />
      ) : (
        <div className="w-full h-full overflow-y-auto p-8 pt-24 max-w-5xl mx-auto space-y-4">
          <h2 className="text-xl font-serif font-bold text-[#F6F1E9] mb-4">
            Accessible Heritage Registry ({filteredSites.length} Records)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSites.map((site) => (
              <div key={site.id} className="glass-panel p-4 rounded-lg border border-[#D4AF37]/30 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-serif font-bold text-[#D4AF37] text-base">{site.name}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">{site.site_type}</span>
                </div>
                <p className="text-xs text-[#D8C3A5]">{site.era} • {site.dynasty || "Classical Period"}</p>
                <p className="text-xs text-white/70">{site.state}, {site.district}</p>
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href={`/sites/${site.slug}`}
                    className="text-xs px-3 py-1.5 rounded bg-[#D4AF37] text-indigoInk font-bold hover:bg-[#F3C649]"
                  >
                    Open Site Page
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Historical Timeline Slider */}
      <div className="absolute bottom-6 left-6 right-6 md:left-24 md:right-24 z-20 pointer-events-none">
        <div className="glass-panel-gold rounded-xl p-4 pointer-events-auto border border-[#D4AF37]/50 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#D4AF37]">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span>CHRONOLOGICAL ERA SLIDER:</span>
              <span className="text-white text-sm">
                {timelineYear < 0 ? `${Math.abs(timelineYear)} BCE` : `${timelineYear} CE`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#D8C3A5]/80 font-serif">
              <span>Bronze Age (-2600)</span>
              <span>• Solanki (1050)</span>
              <span>• Sultanate (1450)</span>
              <span>• Rajput (1600)</span>
            </div>
          </div>
          <input
            type="range"
            min={-2600}
            max={1800}
            step={50}
            value={timelineYear}
            onChange={(e) => setTimelineYear(Number(e.target.value))}
            className="w-full h-2 bg-[#090D16] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
        </div>
      </div>

      {/* Selected Site Preview Card Overlay */}
      {activeSite && (
        <div className="absolute top-20 right-6 z-30 w-80 md:w-96 glass-panel-gold rounded-xl p-5 border border-[#D4AF37]/70 shadow-2xl animate-in fade-in slide-in-from-right duration-300">
          <button
            onClick={() => setActiveSite(null)}
            className="absolute top-3 right-3 text-[#D8C3A5] hover:text-[#D4AF37]"
          >
            <X className="w-4 h-4" />
          </button>

          {activeSite.hero_image && (
            <div className="w-full h-40 rounded-lg overflow-hidden mb-3 border border-[#D4AF37]/30">
              <img
                src={activeSite.hero_image}
                alt={activeSite.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C85A32]/30 text-[#E07A5F] border border-[#C85A32]/40">
              {activeSite.site_type}
            </span>
            <span className="text-[10px] text-[#D8C3A5]/70 font-serif">
              {activeSite.state}
            </span>
          </div>

          <h3 className="font-serif text-lg font-bold text-[#F6F1E9] leading-snug mb-1">
            {activeSite.name}
          </h3>

          <p className="text-xs text-[#D4AF37] font-serif mb-2">
            {activeSite.era} • {activeSite.dynasty || "Classical Era"}
          </p>

          <p className="text-xs text-[#EFE6D8]/80 line-clamp-3 mb-4 leading-relaxed">
            {activeSite.architectural_style ? `Architectural Style: ${activeSite.architectural_style}. ` : ""}
            Verified record under Archaeological Survey of India documentation.
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={`/sites/${activeSite.slug}`}
              className="flex-1 px-3 py-2 text-xs font-bold rounded bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] text-center flex items-center justify-center gap-1.5 shadow-md shadow-[#D4AF37]/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full Dossier & 3D</span>
            </Link>

            <Link
              href={`/sites/${activeSite.slug}#viewer3d`}
              className="px-3 py-2 text-xs font-semibold rounded bg-[#1E293B] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Twin</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
