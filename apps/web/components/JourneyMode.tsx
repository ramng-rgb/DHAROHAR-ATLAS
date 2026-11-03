"use client";

import React, { useState, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import Link from "next/link";
import { 
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft, 
  MapPin, Compass, BookOpen, Eye, Box, Clock, Navigation
} from "lucide-react";
import { TravelRoute } from "@/lib/api";

interface JourneyModeProps {
  route: TravelRoute;
}

export function JourneyMode({ route }: JourneyModeProps) {
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const travelerMarker = useRef<maplibregl.Marker | null>(null);

  const stops = route?.stops || [];
  const activeStop = stops[currentStopIndex] || stops[0];

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
      center: [activeStop?.site.longitude || 72.5, activeStop?.site.latitude || 23.5],
      zoom: 7.2,
      pitch: 45,
      bearing: -10
    });

    map.on("load", () => {
      // Add GeoJSON route line connecting stops
      const coords = stops.map((s) => [s.site.longitude, s.site.latitude]);

      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coords
          }
        }
      });

      // Outer glow line
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route-line",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#D4AF37",
          "line-width": 8,
          "line-opacity": 0.4,
          "line-blur": 3
        }
      });

      // Core line
      map.addLayer({
        id: "route-core",
        type: "line",
        source: "route-line",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#F3C649",
          "line-width": 3,
          "line-dasharray": [2, 1]
        }
      });

      // Add Stop Markers
      stops.forEach((stop, i) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer";
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-[#1A1510] border-2 border-[#D4AF37] text-[#D4AF37] font-bold text-xs flex items-center justify-center shadow-lg shadow-black">
              ${stop.stop_order}
            </div>
            <span class="absolute -bottom-5 text-[10px] font-serif font-bold text-[#F6F1E9] bg-black/80 px-1.5 py-0.5 rounded border border-[#D4AF37]/30 whitespace-nowrap">
              ${stop.site.name.split(" ")[0]}
            </span>
          </div>
        `;
        el.addEventListener("click", () => {
          setCurrentStopIndex(i);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.site.longitude, stop.site.latitude])
          .addTo(map);
      });

      // Animated Traveler Marker
      const travelerEl = document.createElement("div");
      travelerEl.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-[#D4AF37] p-1 shadow-2xl shadow-black/80 flex items-center justify-center ring-4 ring-[#D4AF37]/40 transition-transform duration-300 ease-out">
          <svg class="w-5 h-5 text-[#090D16]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `;
      travelerMarker.current = new maplibregl.Marker({ element: travelerEl })
        .setLngLat([activeStop.site.longitude, activeStop.site.latitude])
        .addTo(map);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [route]);

  // Update map camera when stop changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !activeStop) return;

    map.flyTo({
      center: [activeStop.site.longitude, activeStop.site.latitude],
      zoom: 9.5,
      pitch: 50,
      speed: 1.1,
      curve: 1.4
    });

    if (travelerMarker.current) {
      travelerMarker.current.setLngLat([activeStop.site.longitude, activeStop.site.latitude]);
    }
  }, [currentStopIndex, activeStop]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStopIndex((prev) => {
          if (prev >= stops.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stops.length]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#090D16]">
      {/* Fullscreen Map Canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Route Dossier Ribbon */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
        <div className="glass-panel-gold rounded-xl p-4 pointer-events-auto border border-[#D4AF37]/50 shadow-2xl max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <span>Explorer Fellowship Journey Mode</span>
          </div>
          <h2 className="text-lg font-serif font-bold text-[#F6F1E9]">
            {route.title}
          </h2>
          <div className="flex items-center gap-4 text-xs text-[#D8C3A5] mt-1 font-serif">
            <span>{route.total_distance_km} Kilometers</span>
            <span>• {route.estimated_duration_days} Days Overland</span>
            <span>• {stops.length} Historic Confluences</span>
          </div>
        </div>
      </div>

      {/* Bottom Stop Narrative Card & Playback Controls */}
      <div className="absolute bottom-6 left-4 right-4 md:left-12 md:right-12 z-20 pointer-events-none">
        <div className="glass-panel-gold rounded-2xl p-6 pointer-events-auto border border-[#D4AF37]/60 shadow-2xl max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
          {/* Stop Details */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#9E3D1D] text-white">
                Stop {activeStop.stop_order} of {stops.length}
              </span>
              <span className="text-xs text-[#D4AF37] font-serif">
                Transit: {activeStop.transit_mode}
              </span>
            </div>

            <h3 className="font-serif text-xl font-bold text-[#F6F1E9]">
              {activeStop.site.name}
            </h3>

            <p className="text-sm text-[#EFE6D8] leading-relaxed">
              "{activeStop.narrative}"
            </p>

            {activeStop.travel_note && (
              <p className="text-xs text-[#D8C3A5]/90 italic border-l border-[#D4AF37]/50 pl-2.5 py-0.5 bg-[#141A26]/40 rounded-r">
                Field Observation: {activeStop.travel_note}
              </p>
            )}
          </div>

          {/* Action & Controls */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0 w-full md:w-auto">
            {/* Playback Buttons */}
            <div className="flex items-center gap-2 bg-[#1A1510] p-1.5 rounded-xl border border-[#D4AF37]/40">
              <button
                onClick={() => setCurrentStopIndex(Math.max(0, currentStopIndex - 1))}
                disabled={currentStopIndex === 0}
                className="p-2 rounded hover:bg-[#D4AF37]/20 text-[#D8C3A5] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-indigoInk font-bold text-xs flex items-center gap-1.5 hover:bg-[#F3C649]"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-indigoInk" />}
                <span>{isPlaying ? "Pause Route" : "Animate Journey"}</span>
              </button>

              <button
                onClick={() => setCurrentStopIndex(Math.min(stops.length - 1, currentStopIndex + 1))}
                disabled={currentStopIndex === stops.length - 1}
                className="p-2 rounded hover:bg-[#D4AF37]/20 text-[#D8C3A5] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Link to Site / 3D */}
            <Link
              href={`/sites/${activeStop.site.slug}`}
              className="w-full py-2 px-4 rounded-lg bg-[#1E293B] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold text-center flex items-center justify-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Explore Site & 3D Twin</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
