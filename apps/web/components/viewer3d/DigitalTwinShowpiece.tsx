"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { ShowpiecePoster } from "./ShowpiecePoster";
import { ViewerControlsBar, type LightingPreset, type BackgroundMode } from "./ViewerControlsBar";
import { HotspotTourDrawer } from "./HotspotTourDrawer";
import { HotspotAriaList } from "./HotspotAriaList";
import { ModelProvenanceCard } from "./ModelProvenanceCard";
import { PanoramaFallbackViewer } from "./PanoramaFallbackViewer";
import type { Model3DDetail, HotspotDetail, ModelSummary } from "@/lib/api-client";

// Dynamic import of the heavy 3D WebGL Canvas to ensure Three.js is code-split and doesn't impact landing/explore Lighthouse score
const DigitalTwinCanvas = dynamic(
  () => import("./DigitalTwinCanvas").then((mod) => mod.DigitalTwinCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl glass-panel bg-[#120E0A] flex flex-col items-center justify-center border border-[#D4AF37]/30 text-[#D8C3A5] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
        <span className="font-serif text-sm">Initializing 3D Subterranean Canvas...</span>
      </div>
    ),
  }
);

interface DigitalTwinShowpieceProps {
  model?: Model3DDetail | null;
  modelSummary?: ModelSummary | null;
  siteName: string;
  fallbackImages?: Array<{
    url: string;
    caption?: string | null;
    attribution?: string | null;
    license?: string;
  }>;
  heroImage?: string;
}

export function DigitalTwinShowpiece({
  model,
  modelSummary,
  siteName,
  fallbackImages = [],
  heroImage,
}: DigitalTwinShowpieceProps) {
  const [isLoaded3D, setIsLoaded3D] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  // 3D Visual & Environment State
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [sunAngle, setSunAngle] = useState<number>(135);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [background, setBackground] = useState<BackgroundMode>("parchment");
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [measurementActive, setMeasurementActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Hotspots Tour State
  const [activeHotspot, setActiveHotspot] = useState<HotspotDetail | null>(null);
  const [isHotspotDrawerOpen, setIsHotspotDrawerOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // If no 3D model exists, render the 360 panorama & photo carousel fallback
  if (!model && !modelSummary) {
    return (
      <PanoramaFallbackViewer
        siteName={siteName}
        images={fallbackImages.length > 0 ? fallbackImages : [{ url: heroImage || "" }]}
      />
    );
  }

  // Pre-fetch model data if only modelSummary was provided initially
  const activeModel: Model3DDetail = (model as Model3DDetail) || {
    id: modelSummary?.id || "model-id",
    site_id: "site-id",
    title: modelSummary?.title || `${siteName} 3D Digital Twin`,
    format: modelSummary?.format || "glb",
    file_size_bytes: modelSummary?.file_size_bytes || 3216,
    poly_count: modelSummary?.poly_count || 888,
    draco_compressed: modelSummary?.draco_compressed || false,
    lod_levels: {},
    source: modelSummary?.source || "artist_made",
    licence: modelSummary?.licence || "CC-BY-4.0",
    attribution: modelSummary?.attribution || null,
    source_url: modelSummary?.source_url || null,
    scale_calibrated: modelSummary?.scale_calibrated || false,
    scale_factor: 1.0,
    status: modelSummary?.status || "ready",
    model_url: modelSummary?.model_url || "/models/stepwell_pavilion.opt.glb",
    hotspots: [],
  };

  const handleStartLoad = () => {
    setIsLoading(true);
    let current = 15;
    setLoadProgress(current);

    const interval = setInterval(() => {
      current += Math.random() * 25;
      if (current >= 100) {
        clearInterval(interval);
        setLoadProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setIsLoaded3D(true);
        }, 300);
      } else {
        setLoadProgress(current);
      }
    }, 150);
  };

  const handleSelectHotspot = useCallback((hs: HotspotDetail) => {
    setActiveHotspot(hs);
    setIsHotspotDrawerOpen(true);
  }, []);

  const handleResetView = () => {
    setActiveHotspot(null);
    setIsHotspotDrawerOpen(false);
    setResetViewTrigger((prev) => prev + 1);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Screenshot with watermark export
  const handleExportScreenshot = () => {
    if (!canvasRef.current) return;
    try {
      const srcCanvas = canvasRef.current;
      const offscreen = document.createElement("canvas");
      offscreen.width = srcCanvas.width;
      offscreen.height = srcCanvas.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      // Draw 3D scene
      ctx.drawImage(srcCanvas, 0, 0);

      // Watermark ribbon at bottom
      const barHeight = Math.max(48, Math.floor(offscreen.height * 0.06));
      ctx.fillStyle = "rgba(18, 14, 10, 0.85)";
      ctx.fillRect(0, offscreen.height - barHeight, offscreen.width, barHeight);

      // Watermark text
      ctx.font = `bold ${Math.max(14, Math.floor(barHeight * 0.38))}px serif`;
      ctx.fillStyle = "#D4AF37";
      ctx.fillText(
        `Dharohar Atlas • ${siteName} Digital Twin`,
        24,
        offscreen.height - barHeight * 0.45
      );

      ctx.font = `${Math.max(11, Math.floor(barHeight * 0.28))}px sans-serif`;
      ctx.fillStyle = "#EFE6D8";
      const attributionText = activeModel.attribution || "Dharohar Cultural Heritage Archives";
      ctx.fillText(
        `${attributionText} • ${activeModel.licence || "CC-BY-4.0"}`,
        offscreen.width - 24 - ctx.measureText(attributionText).width - 150,
        offscreen.height - barHeight * 0.45
      );

      const link = document.createElement("a");
      link.download = `${siteName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-digital-twin.png`;
      link.href = offscreen.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Screenshot capture failed:", e);
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {!isLoaded3D ? (
        <ShowpiecePoster
          siteName={siteName}
          posterImage={heroImage || fallbackImages[0]?.url || "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=80"}
          polyCount={activeModel.poly_count}
          fileSizeBytes={activeModel.file_size_bytes}
          format={activeModel.format}
          hotspotsCount={activeModel.hotspots.length || modelSummary?.hotspots_count || 5}
          isLoading={isLoading}
          loadProgress={loadProgress}
          onLoad3D={handleStartLoad}
        />
      ) : (
        <div className="relative space-y-3">
          {/* Controls Bar */}
          <ViewerControlsBar
            lighting={lighting}
            onLightingChange={setLighting}
            sunAngle={sunAngle}
            onSunAngleChange={setSunAngle}
            wireframe={wireframe}
            onToggleWireframe={() => setWireframe(!wireframe)}
            background={background}
            onBackgroundChange={setBackground}
            showAnnotations={showAnnotations}
            onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
            measurementActive={measurementActive}
            onToggleMeasurement={() => setMeasurementActive(!measurementActive)}
            onResetView={handleResetView}
            onExportScreenshot={handleExportScreenshot}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {/* Interactive 3D Canvas with side drawer */}
          <div className="relative">
            <DigitalTwinCanvas
              model={activeModel}
              lighting={lighting}
              sunAngle={sunAngle}
              wireframe={wireframe}
              background={background}
              showAnnotations={showAnnotations}
              measurementActive={measurementActive}
              activeHotspot={activeHotspot}
              onSelectHotspot={handleSelectHotspot}
              onMeasureComplete={() => {}}
              resetViewTrigger={resetViewTrigger}
              canvasRef={canvasRef}
            />

            {/* Hotspot Info & Guided Tour Drawer */}
            <HotspotTourDrawer
              hotspots={activeModel.hotspots}
              activeHotspot={activeHotspot}
              isOpen={isHotspotDrawerOpen}
              onClose={() => setIsHotspotDrawerOpen(false)}
              onSelectHotspot={handleSelectHotspot}
            />
          </div>

          {/* Accessible Screen-reader and Keyboard Hotspots List */}
          <HotspotAriaList
            hotspots={activeModel.hotspots}
            activeHotspot={activeHotspot}
            onSelectHotspot={handleSelectHotspot}
          />
        </div>
      )}

      {/* Model Provenance Card */}
      <ModelProvenanceCard model={activeModel} siteName={siteName} />
    </div>
  );
}
