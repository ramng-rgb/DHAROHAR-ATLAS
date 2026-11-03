"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Filter, Calendar, MapPin, Eye, Box, SlidersHorizontal, 
  Layers, List, Map as MapIcon, ChevronRight, X, Sparkles,
  Search, ShieldCheck, Check, Copy, ExternalLink, RefreshCw,
  Globe, Compass, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  api, SiteBrief, SiteDetail, GeoJSONFeatureCollection, 
  FacetResponse, HistogramBucket 
} from "@/lib/api-client";
import { TimelineSlider, formatYearLabel } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { translations, SupportedLocale } from "@/lib/i18n";
import { AskTheArchivePanel } from "@/components/search/AskTheArchivePanel";
import { JourneyPlayer } from "@/components/journey/JourneyPlayer";
import { fetchJourneyBySlug, JourneyDetail } from "@/lib/api";

interface MapExplorerProps {
  initialSites: SiteBrief[];
}

// Marker icon generator per site_type
function getMarkerSvg(siteType: string, isSelected: boolean = false): string {
  const color = isSelected ? "#F3C649" : "#D4AF37";
  const bgColor = isSelected ? "#C85A32" : "#1A1510";

  let iconPath = "";
  if (siteType === "stepwell") {
    // Stepped subterranean tiers
    iconPath = `<path d="M7 6h10M8 9h8M9 12h6M10 15h4M11 18h2" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`;
  } else if (siteType === "fort") {
    // Castle battlement
    iconPath = `<path d="M5 20V9l3 2 4-4 4 4 3-2v11M5 9h14M8 6V4h2v2h4V4h2v2" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (siteType === "temple") {
    // Shikhara spire
    iconPath = `<path d="M12 3l5 17H7L12 3zM12 3v17M9 12h6" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (siteType === "mosque") {
    // Dome & Crescent arch
    iconPath = `<path d="M12 4c-4 2-5 6-5 9h10c0-3-1-7-5-9zM5 20h14M8 13v7M16 13v7" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (siteType === "archaeological_site") {
    // Grid / excavation trench
    iconPath = `<path d="M4 6h16M4 12h16M4 18h16M7 4v16M12 4v16M17 4v16" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>`;
  } else {
    // Landmark diamond
    iconPath = `<polygon points="12,4 19,12 12,20 5,12" stroke="${color}" stroke-width="1.5" fill="none"/>`;
  }

  return `
    <div style="cursor: pointer; transform: scale(${isSelected ? 1.25 : 1}); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
      <svg width="34" height="42" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z" fill="${bgColor}" stroke="${color}" stroke-width="1.5"/>
        ${iconPath}
      </svg>
    </div>
  `;
}

export function MapExplorer({ initialSites }: MapExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Localized strings
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const t = translations[locale];

  // Map DOM refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // URL Query Parameters as Single Source of Truth
  const urlType = searchParams.get("type");
  const urlState = searchParams.get("state");
  const urlDynasty = searchParams.get("dynasty");
  const urlConfidence = searchParams.get("confidence");
  const urlHas3d = searchParams.get("has_3d") === "true";
  const urlQ = searchParams.get("q") || "";
  const urlYearFrom = searchParams.get("from") ? parseInt(searchParams.get("from")!, 10) : -3000;
  const urlYearTo = searchParams.get("to") ? parseInt(searchParams.get("to")!, 10) : 1900;
  const urlSelectedSlug = searchParams.get("site");

  // Filter States initialized from URL
  const [searchQuery, setSearchQuery] = useState<string>(urlQ);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(urlType ? urlType.split(",") : []);
  const [selectedStates, setSelectedStates] = useState<string[]>(urlState ? urlState.split(",") : []);
  const [selectedDynasties, setSelectedDynasties] = useState<string[]>(urlDynasty ? urlDynasty.split(",") : []);
  const [selectedConfidences, setSelectedConfidences] = useState<string[]>(urlConfidence ? urlConfidence.split(",") : []);
  const [has3dOnly, setHas3dOnly] = useState<boolean>(urlHas3d);
  const [yearFrom, setYearFrom] = useState<number>(urlYearFrom);
  const [yearTo, setYearTo] = useState<number>(urlYearTo);

  // View & UI States
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(true);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | SiteBrief | null>(null);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Live GeoJSON & Facet Data from API
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONFeatureCollection | null>(null);
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedSiteIds, setMatchedSiteIds] = useState<string[] | null>(null);
  const [askArchiveOpen, setAskArchiveOpen] = useState<boolean>(false);
  const [activeJourney, setActiveJourney] = useState<JourneyDetail | null>(null);
  const [journeyLoading, setJourneyLoading] = useState<boolean>(false);

  const handlePlayJourney = useCallback(async (slug: string = "gujarat-stepwell-trail") => {
    setJourneyLoading(true);
    try {
      const data = await fetchJourneyBySlug(slug);
      setActiveJourney(data);
    } catch (err) {
      console.error("Failed to load journey:", err);
    } finally {
      setJourneyLoading(false);
    }
  }, []);

  useEffect(() => {
    const journeySlug = searchParams.get("journey");
    if (journeySlug) {
      handlePlayJourney(journeySlug);
    }
  }, [searchParams, handlePlayJourney]);

  // Wire explorer search bar to M4 hybrid search API
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setMatchedSiteIds(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await api.searchArchive({
          q: searchQuery.trim(),
          types: ["site"],
          limit: 30,
        });
        const hitIds = (resp.grouped?.sites || []).map((s) => s.site_id || s.source_id);
        setMatchedSiteIds(hitIds);
      } catch (err) {
        console.error("Hybrid search error in explorer:", err);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL params cleanly using window.location.search
  const syncParamsToUrl = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          sp.delete(key);
        } else {
          sp.set(key, String(val));
        }
      });
      const newUrl = `/explore?${sp.toString()}`;
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  // Fetch Facets from Backend
  const refreshFacets = useCallback(async () => {
    try {
      const data = await api.getFacets({
        q: searchQuery || undefined,
        site_type: selectedTypes.length ? selectedTypes : undefined,
        state: selectedStates.length ? selectedStates : undefined,
        dynasty: selectedDynasties.length ? selectedDynasties : undefined,
        data_confidence: selectedConfidences.length ? selectedConfidences : undefined,
        has_3d_model: has3dOnly ? true : undefined,
        year_from: yearFrom,
        year_to: yearTo,
      });
      setFacets(data);
    } catch (err: any) {
      console.warn("Facet refresh error:", err);
    }
  }, [searchQuery, selectedTypes, selectedStates, selectedDynasties, selectedConfidences, has3dOnly, yearFrom, yearTo]);

  // Fetch GeoJSON for current viewport and filters
  const fetchViewportGeoJson = useCallback(async () => {
    if (!mapInstance.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const bounds = mapInstance.current.getBounds();
      const zoom = mapInstance.current.getZoom();
      const bbox = `${bounds.getWest().toFixed(4)},${bounds.getSouth().toFixed(4)},${bounds.getEast().toFixed(4)},${bounds.getNorth().toFixed(4)}`;

      const data = await api.getSitesGeoJSON(
        {
          bbox,
          zoom: Math.round(zoom * 10) / 10,
          q: searchQuery || undefined,
          site_type: selectedTypes.length ? selectedTypes : undefined,
          state: selectedStates.length ? selectedStates : undefined,
          dynasty: selectedDynasties.length ? selectedDynasties : undefined,
          data_confidence: selectedConfidences.length ? selectedConfidences : undefined,
          has_3d_model: has3dOnly ? true : undefined,
          year_from: yearFrom,
          year_to: yearTo,
        },
        controller.signal
      );

      setGeoJsonData(data);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load spatial features");
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTypes, selectedStates, selectedDynasties, selectedConfidences, has3dOnly, yearFrom, yearTo]);

  // Initial load & URL state restoration
  useEffect(() => {
    refreshFacets();
    fetchViewportGeoJson();
  }, [refreshFacets, fetchViewportGeoJson]);

  // Handle URL site selection on load
  useEffect(() => {
    if (urlSelectedSlug) {
      api.getSite(urlSelectedSlug).then((site) => {
        if (site) {
          setSelectedSite(site);
          setPreviewDrawerOpen(true);
        }
      }).catch(() => {});
    }
  }, [urlSelectedSlug]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const initialLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : 23.5;
    const initialLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : 72.8;
    const initialZoom = searchParams.get("zoom") ? parseFloat(searchParams.get("zoom")!) : 6.8;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto_dark: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors, © CARTO",
          },
        },
        layers: [
          {
            id: "carto-dark-tiles",
            type: "raster",
            source: "carto_dark",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [initialLng, initialLat],
      zoom: initialZoom,
      maxBounds: [
        [60.0, 6.0],  // SW India/Indian Ocean
        [98.0, 38.0], // NE Himalayas
      ],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    // Debounced move listener
    let debounceTimer: NodeJS.Timeout;
    map.on("moveend", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchViewportGeoJson();
        const center = map.getCenter();
        syncParamsToUrl({
          lat: center.lat.toFixed(4),
          lng: center.lng.toFixed(4),
          zoom: map.getZoom().toFixed(1),
        });
      }, 250);
    });

    mapInstance.current = map;

    return () => {
      clearTimeout(debounceTimer);
      map.remove();
      mapInstance.current = null;
    };
  }, [fetchViewportGeoJson, searchParams, syncParamsToUrl]);

  // Update Map Markers on GeoJSON data changes
  useEffect(() => {
    if (!mapInstance.current || !geoJsonData) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    const map = mapInstance.current;

    geoJsonData.features.forEach((feature) => {
      const coords = feature.geometry.coordinates as [number, number];
      const props = feature.properties as Record<string, any>;
      const isCluster = props.cluster === true;

      const el = document.createElement("div");

      if (isCluster) {
        // Clustered circular marker with gold illumination
        const count = Number(props.point_count || 2);
        const size = Math.min(54, 34 + count * 2);
        el.className = "flex items-center justify-center rounded-full select-none cursor-pointer";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = "radial-gradient(circle, rgba(212,175,55,0.95) 0%, rgba(200,90,50,0.85) 100%)";
        el.style.border = "2px solid #F6F1E9";
        el.style.boxShadow = "0 0 16px rgba(212,175,55,0.6)";
        el.style.color = "#090D16";
        el.style.fontWeight = "bold";
        el.style.fontSize = "13px";
        el.innerText = String(count);

        el.addEventListener("click", () => {
          map.flyTo({
            center: coords,
            zoom: Math.min(map.getZoom() + 2, 14),
            duration: 800,
          });
        });
      } else {
        // Individual Site Marker
        const isSelected = selectedSite?.id === props.id;
        el.innerHTML = getMarkerSvg(String(props.site_type || "other"), isSelected);

        // Tooltip popup on hover
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: bold; color: #D4AF37; margin-bottom: 2px;">${props.name}</div>
            <div style="color: #D8C3A5; font-size: 11px;">${props.site_type} • ${props.era_label || ""}</div>
            <div style="color: #8E8D8A; font-size: 10px;">${props.state}</div>
          </div>
        `);

        el.addEventListener("mouseenter", () => popup.setLngLat(coords).addTo(map));
        el.addEventListener("mouseleave", () => popup.remove());

        el.addEventListener("click", () => {
          const siteSlug = String(props.slug);
          syncParamsToUrl({ site: siteSlug });
          api.getSite(siteSlug).then((detail) => {
            setSelectedSite(detail || (props as any));
            setPreviewDrawerOpen(true);
          });
        });
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      const markerId = String(isCluster ? `cluster-${coords.join(",")}` : props.id);
      markersRef.current[markerId] = marker;
    });
  }, [geoJsonData, selectedSite, syncParamsToUrl]);

  // Timeline Scrubbing handler
  const handleTimelineChange = (from: number, to: number) => {
    setYearFrom(from);
    setYearTo(to);
    syncParamsToUrl({ from, to });
  };

  // Toggle Type Filter
  const toggleType = (typeKey: string) => {
    const next = selectedTypes.includes(typeKey)
      ? selectedTypes.filter((t) => t !== typeKey)
      : [...selectedTypes, typeKey];
    setSelectedTypes(next);
    syncParamsToUrl({ type: next.join(",") });
  };

  // Toggle State Filter
  const toggleState = (st: string) => {
    const next = selectedStates.includes(st)
      ? selectedStates.filter((s) => s !== st)
      : [...selectedStates, st];
    setSelectedStates(next);
    syncParamsToUrl({ state: next.join(",") });
  };

  // Clear All Filters
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedStates([]);
    setSelectedDynasties([]);
    setSelectedConfidences([]);
    setHas3dOnly(false);
    setSearchQuery("");
    setYearFrom(-3000);
    setYearTo(1900);
    syncParamsToUrl({
      type: undefined,
      state: undefined,
      dynasty: undefined,
      confidence: undefined,
      has_3d: undefined,
      q: undefined,
      from: undefined,
      to: undefined,
    });
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedStates.length > 0 ||
    selectedDynasties.length > 0 ||
    selectedConfidences.length > 0 ||
    has3dOnly ||
    searchQuery.length > 0 ||
    yearFrom > -3000 ||
    yearTo < 1900;

  // Filtered sites for accessible list view
  const siteListItems = useMemo(() => {
    return initialSites.filter((site) => {
      if (has3dOnly && !site.has_3d_model) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(site.site_type)) return false;
      if (selectedStates.length > 0 && !selectedStates.includes(site.state)) return false;
      if (selectedConfidences.length > 0 && !selectedConfidences.includes(site.data_confidence)) return false;
      if (yearFrom !== undefined && site.period_end_year != null && site.period_end_year < yearFrom) return false;
      if (yearTo !== undefined && site.period_start_year != null && site.period_start_year > yearTo) return false;
      if (matchedSiteIds !== null) {
        if (!matchedSiteIds.includes(site.id) && !matchedSiteIds.includes(site.slug)) return false;
      } else if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(q) || (site.name_hi && site.name_hi.includes(q)) || (site.name_gu && site.name_gu.includes(q));
        const matchesLoc = site.state.toLowerCase().includes(q) || (site.district && site.district.toLowerCase().includes(q));
        if (!matchesName && !matchesLoc) return false;
      }
      return true;
    });
  }, [initialSites, selectedTypes, selectedStates, selectedConfidences, yearFrom, yearTo, searchQuery, matchedSiteIds]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#090D16]">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between gap-3">
        {/* Left: Filter Toggle Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`px-3.5 py-2 rounded-xl glass-panel-gold flex items-center gap-2 text-xs font-serif font-bold transition-all shadow-xl ${
              filterPanelOpen ? "border-goldLeaf text-goldLeaf" : "border-sandstone/30 text-sandstone hover:text-goldLeaf"
            }`}
            aria-expanded={filterPanelOpen}
            aria-label="Toggle archive filters panel"
          >
            <Filter className="w-3.5 h-3.5 text-goldLeaf" />
            <span>{t.filterTitle}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-terracotta" />
            )}
            {filterPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Map vs List View Switcher */}
          <div className="glass-panel-gold rounded-xl p-1 flex items-center gap-1 shadow-xl">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-label={t.mapView}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "map"
                  ? "bg-goldLeaf text-parchment-950 font-bold shadow-sm"
                  : "text-sandstone hover:text-goldLeaf"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.mapView}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label={t.listView}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "list"
                  ? "bg-goldLeaf text-parchment-950 font-bold shadow-sm"
                  : "text-sandstone hover:text-goldLeaf"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.listView}</span>
            </button>
          </div>
        </div>

        {/* Right: Language Selector & Status */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Language Switcher */}
          <div className="glass-panel-gold rounded-xl p-1 flex items-center text-xs">
            {(["en", "hi", "gu"] as SupportedLocale[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  locale === loc
                    ? "bg-goldLeaf text-parchment-950"
                    : "text-sandstone hover:text-goldLeaf"
                }`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Play a Journey Button */}
          <button
            type="button"
            id="explore-play-journey-button"
            data-testid="play-journey-btn"
            onClick={() => handlePlayJourney("gujarat-stepwell-trail")}
            className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-serif font-bold transition-all shadow-xl bg-[#C85A32] hover:bg-[#D4AF37] text-white hover:text-indigoInk border border-[#D4AF37]/50"
            aria-label="Play Gujarat Stepwell Trail Journey"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{journeyLoading ? "Loading..." : "Play Journey"}</span>
          </button>

          {/* Ask Archive Floating Trigger */}
          <button
            type="button"
            onClick={() => setAskArchiveOpen(!askArchiveOpen)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-serif font-bold transition-all shadow-xl ${
              askArchiveOpen
                ? "bg-goldLeaf text-parchment-950 border border-goldLeaf"
                : "glass-panel-gold text-goldLeaf border border-goldLeaf/40 hover:border-goldLeaf"
            }`}
            aria-label="Ask the Archive Grounded RAG"
          >
            <Sparkles className="w-3.5 h-3.5 fill-goldLeaf text-goldLeaf" />
            <span className="hidden sm:inline">Ask Archive</span>
          </button>

          {loading && (
            <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-goldLeaf">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 flex overflow-hidden">
        {/* Embedded Fullscreen Journey Mode Overlay */}
        {activeJourney && (
          <div className="absolute inset-0 z-40 bg-[#090D16]">
            <JourneyPlayer
              journey={activeJourney}
              embedded={true}
              locale={locale}
              onExit={() => setActiveJourney(null)}
            />
          </div>
        )}

        {/* Left Filter Panel (Collapsible desktop sidebar / mobile bottom sheet) */}
        {filterPanelOpen && (
          <aside
            aria-label="Filter Options"
            className="absolute md:relative z-20 w-full md:w-[320px] lg:w-[350px] max-h-[60vh] md:max-h-full h-auto md:h-full bottom-0 md:bottom-auto bg-[#120E0A]/95 md:bg-[#120E0A]/90 backdrop-blur-md border-t md:border-t-0 md:border-r border-goldLeaf/30 shadow-2xl flex flex-col p-4 overflow-y-auto scrollbar-thin transition-all"
          >
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sandstone/15 mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-goldLeaf" />
                <h3 className="font-serif text-sm font-bold text-parchment-100">{t.filterTitle}</h3>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-terracotta-light hover:underline font-semibold"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>

            {/* Live Search */}
            <div className="relative mb-4">
              <Search className="w-3.5 h-3.5 text-sandstone absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  syncParamsToUrl({ q: e.target.value });
                }}
                className="w-full pl-9 pr-3 py-2 bg-parchment-950/80 border border-sandstone/25 rounded-lg text-xs text-parchment-100 placeholder-sandstone/50 focus:outline-none focus:border-goldLeaf"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    syncParamsToUrl({ q: undefined });
                  }}
                  className="absolute right-2.5 top-2.5 text-sandstone hover:text-goldLeaf"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Monument Type Facets */}
            <div className="mb-4">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sandstone mb-2">
                {t.siteType}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {facets &&
                  Object.entries(facets.site_type || {}).map(([typeKey, count]) => (
                    <Chip
                      key={typeKey}
                      label={t.types[typeKey as keyof typeof t.types] || typeKey}
                      count={count}
                      selected={selectedTypes.includes(typeKey)}
                      onToggle={() => toggleType(typeKey)}
                    />
                  ))}
              </div>
            </div>

            {/* State / Region Facets */}
            <div className="mb-4">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sandstone mb-2">
                {t.state}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {facets &&
                  Object.entries(facets.state || {}).map(([stateName, count]) => (
                    <Chip
                      key={stateName}
                      label={stateName}
                      count={count}
                      selected={selectedStates.includes(stateName)}
                      onToggle={() => toggleState(stateName)}
                    />
                  ))}
              </div>
            </div>

            {/* Academic Confidence Facets */}
            <div className="mb-4">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sandstone mb-2">
                {t.dataConfidence}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {facets &&
                  Object.entries(facets.data_confidence || {}).map(([confKey, count]) => {
                    const isSelected = selectedConfidences.includes(confKey);
                    return (
                      <Chip
                        key={confKey}
                        label={confKey === "verified" ? "ASI / UNESCO" : confKey.toUpperCase()}
                        count={count}
                        selected={isSelected}
                        onToggle={() => {
                          const next = isSelected
                            ? selectedConfidences.filter((c) => c !== confKey)
                            : [...selectedConfidences, confKey];
                          setSelectedConfidences(next);
                          syncParamsToUrl({ confidence: next.join(",") });
                        }}
                      />
                    );
                  })}
              </div>
            </div>

            {/* 3D Digital Twin Facet */}
            <div className="mb-4">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sandstone mb-2 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-goldLeaf" />
                <span>Spatial Preservation</span>
              </h4>
              <Chip
                label="Has 3D Model"
                count={facets?.has_3d_model?.["true"] ?? 1}
                selected={has3dOnly}
                onToggle={() => {
                  const next = !has3dOnly;
                  setHas3dOnly(next);
                  syncParamsToUrl({ has_3d: next ? "true" : undefined });
                }}
              />
            </div>

            {/* Monument count summary */}
            <div className="mt-auto pt-3 border-t border-sandstone/15 text-xs text-sandstone text-center">
              <span className="font-bold text-goldLeaf">{geoJsonData?.total || 0}</span> {t.sitesFound}
            </div>
          </aside>
        )}

        {/* View Container: Map View or Screen-reader Accessible List View */}
        {viewMode === "map" ? (
          <div className="relative flex-1 w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Floating Bottom Timeline Scrubber */}
            <div className="absolute bottom-4 left-4 right-4 md:left-[360px] md:right-8 z-20 pointer-events-none">
              <div className="glass-panel-gold rounded-2xl p-4 shadow-2xl pointer-events-auto border border-goldLeaf/30 max-w-3xl mx-auto backdrop-blur-md">
                <TimelineSlider
                  yearFrom={yearFrom}
                  yearTo={yearTo}
                  onChange={handleTimelineChange}
                  histogram={facets?.timeline_histogram || []}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full h-full overflow-y-auto p-6 md:p-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-parchment-100">{t.listView}</h2>
                  <p className="text-xs text-sandstone mt-1">
                    {siteListItems.length} {t.sitesFound}
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                    {t.clearFilters}
                  </Button>
                )}
              </div>

              {siteListItems.length === 0 ? (
                <EmptyState
                  title={t.noSitesFound}
                  description={t.clearFiltersSuggestion}
                  onClearFilters={clearAllFilters}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteListItems.map((site: any) => (
                    <article
                      key={site.id}
                      onClick={() => {
                        syncParamsToUrl({ site: site.slug });
                        api.getSite(site.slug).then((detail) => {
                          setSelectedSite(detail || site);
                          setPreviewDrawerOpen(true);
                        });
                      }}
                      className="p-4 rounded-xl bg-parchment-950/80 border border-sandstone/20 hover:border-goldLeaf/50 transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="type">
                              {t.types[site.site_type as keyof typeof t.types] || site.site_type}
                            </Badge>
                            {site.has_3d_model && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-goldLeaf text-parchment-950 font-serif font-bold uppercase flex items-center gap-1 shadow-sm">
                                <Box className="w-3 h-3" />
                                3D Model
                              </span>
                            )}
                          </div>
                          <Badge variant={site.data_confidence === "verified" ? "verified" : "likely"}>
                            {site.data_confidence}
                          </Badge>
                        </div>

                        <h3 className="font-serif text-base font-bold text-parchment-100 mb-1">
                          {site.name}
                        </h3>

                        {/* Multilingual sub-titles */}
                        {(site.name_hi || site.name_gu) && (
                          <div className="text-xs text-goldLeaf/80 mb-2 font-serif">
                            {site.name_hi} {site.name_gu && `• ${site.name_gu}`}
                          </div>
                        )}

                        <p className="text-xs text-sandstone line-clamp-3 mb-3">
                          {site.summary || "Subterranean architectural monument in western India."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-sandstone/15 flex items-center justify-between text-xs">
                        <span className="text-sandstone-warm font-mono">
                          {formatYearLabel(site.period_start_year || 1000)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            syncParamsToUrl({ site: site.slug });
                            api.getSite(site.slug).then((detail) => {
                              setSelectedSite(detail || site);
                              setPreviewDrawerOpen(true);
                            });
                          }}
                          className="text-goldLeaf hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Preview</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right-Hand Site Preview Drawer */}
      <Drawer
        isOpen={previewDrawerOpen}
        onClose={() => {
          setPreviewDrawerOpen(false);
          syncParamsToUrl({ site: undefined });
        }}
        title={selectedSite?.name}
        subtitle={`${selectedSite?.site_type || ""} • ${selectedSite?.state || ""}`}
      >
        {selectedSite && (
          <div className="flex flex-col gap-4">
            {/* Trilingual Names display */}
            {(selectedSite.name_hi || selectedSite.name_gu) && (
              <div className="p-3 rounded-lg bg-parchment-950/70 border border-goldLeaf/25 flex flex-col gap-1">
                {selectedSite.name_hi && (
                  <div className="text-sm font-serif text-parchment-100 font-bold">
                    हिन्दी: <span className="text-goldLeaf">{selectedSite.name_hi}</span>
                  </div>
                )}
                {selectedSite.name_gu && (
                  <div className="text-sm font-serif text-parchment-100 font-bold">
                    ગુજરાતી: <span className="text-goldLeaf">{selectedSite.name_gu}</span>
                  </div>
                )}
              </div>
            )}

            {/* Hero Image with Attribution */}
            {selectedSite.hero_image && (
              <div className="relative rounded-xl overflow-hidden border border-goldLeaf/30 bg-black/40">
                <img
                  src={selectedSite.hero_image}
                  alt={selectedSite.name}
                  className="w-full h-52 object-cover object-center"
                />
                <div className="p-2.5 bg-parchment-950/90 border-t border-sandstone/20 text-[11px] text-sandstone flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-parchment-200">
                      {t.previewDrawer.imageAttribution}:
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-goldLeaf border border-goldLeaf/30">
                      {selectedSite.hero_image_license || "CC-BY-4.0"}
                    </span>
                  </div>
                  <span className="text-[10px] text-sandstone-deep italic">
                    {selectedSite.hero_image_attribution || "Archaeological Survey of India Digital Archives"}
                  </span>
                </div>
              </div>
            )}

            {/* Confidence, Period & 3D Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selectedSite.data_confidence === "verified" ? "verified" : "likely"}>
                <ShieldCheck className="w-3 h-3 mr-1 inline" />
                {selectedSite.data_confidence === "verified"
                  ? t.previewDrawer.confidenceVerified
                  : t.previewDrawer.confidenceLikely}
              </Badge>
              <Badge variant="era">
                {selectedSite.era_label || selectedSite.era || "Solanki Era"}
              </Badge>
              {selectedSite.has_3d_model && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-goldLeaf text-parchment-950 font-serif font-bold uppercase flex items-center gap-1 shadow-md">
                  <Box className="w-3.5 h-3.5" />
                  3D Digital Twin
                </span>
              )}
            </div>

            {/* Summary */}
            <div className="text-xs text-parchment-200 leading-relaxed bg-parchment-950/60 p-3.5 rounded-xl border border-sandstone/15">
              <h4 className="font-serif font-bold text-sandstone-warm uppercase text-[11px] tracking-wider mb-1.5">
                Archival Summary
              </h4>
              <p>{selectedSite.summary || (selectedSite as any).description}</p>
            </div>

            {/* Location & Dynasty metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-parchment-950/40 border border-sandstone/10">
                <span className="block text-[10px] uppercase text-sandstone font-semibold mb-0.5">
                  {t.previewDrawer.period}
                </span>
                <span className="font-mono text-goldLeaf">
                  {formatYearLabel(selectedSite.period_start_year || 1000)} – {formatYearLabel(selectedSite.period_end_year || 1100)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-parchment-950/40 border border-sandstone/10">
                <span className="block text-[10px] uppercase text-sandstone font-semibold mb-0.5">
                  {t.previewDrawer.dynasty}
                </span>
                <span className="font-serif text-parchment-100">
                  {selectedSite.dynasty || "Chaulukya / Solanki"}
                </span>
              </div>
            </div>

            {/* Source Citations */}
            {selectedSite.source_text && (
              <div className="text-[11px] text-sandstone bg-black/30 p-2.5 rounded-lg border border-sandstone/10">
                <span className="font-semibold text-sandstone-warm block mb-1">
                  {t.previewDrawer.source}:
                </span>
                <p className="italic">{selectedSite.source_text}</p>
              </div>
            )}

            {/* Drawer Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-sandstone/15">
              <Button
                variant="primary"
                onClick={() => {
                  if (mapInstance.current && selectedSite.longitude && selectedSite.latitude) {
                    mapInstance.current.flyTo({
                      center: [selectedSite.longitude, selectedSite.latitude],
                      zoom: 12,
                      duration: 1200,
                    });
                  }
                }}
                icon={<Compass className="w-4 h-4" />}
              >
                {t.previewDrawer.flyTo}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  icon={copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copyFeedback ? t.previewDrawer.linkCopied : t.previewDrawer.copyLink}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    if (!prefersReduced && mapInstance.current && selectedSite.longitude && selectedSite.latitude) {
                      mapInstance.current.flyTo({
                        center: [selectedSite.longitude, selectedSite.latitude],
                        zoom: 14,
                        pitch: 45,
                        bearing: 25,
                        duration: 800,
                        essential: true,
                      });
                      setTimeout(() => {
                        router.push(`/sites/${selectedSite.slug}`);
                      }, 600);
                    } else {
                      router.push(`/sites/${selectedSite.slug}`);
                    }
                  }}
                >
                  {t.previewDrawer.openSitePage}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Floating Ask the Archive Panel on /explore */}
      {askArchiveOpen && (
        <div className="absolute top-16 right-4 z-40 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fadeIn shadow-2xl">
          <div className="relative">
            <button
              onClick={() => setAskArchiveOpen(false)}
              className="absolute top-4 right-4 z-50 p-1.5 rounded-lg bg-black/60 text-[#D8C3A5] hover:text-[#D4AF37] border border-white/10"
              aria-label="Close Ask Archive"
            >
              <X className="w-4 h-4" />
            </button>
            <AskTheArchivePanel
              compact
              onShowOnMap={(siteId) => {
                const match = initialSites.find((s) => s.id === siteId || s.slug === siteId);
                if (match) {
                  setSelectedSite(match);
                  setPreviewDrawerOpen(true);
                  if (mapInstance.current && match.longitude && match.latitude) {
                    mapInstance.current.flyTo({ center: [match.longitude, match.latitude], zoom: 12 });
                  }
                }
                setAskArchiveOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
