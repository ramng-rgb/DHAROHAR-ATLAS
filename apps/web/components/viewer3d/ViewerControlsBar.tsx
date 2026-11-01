"use client";

import React from "react";
import { 
  Sun, Moon, Sunset, Ruler, RotateCcw, Maximize2, 
  Minimize2, Camera, Eye, EyeOff, Layers, Sliders, Palette
} from "lucide-react";

export type LightingPreset = "day" | "dusk" | "night";
export type BackgroundMode = "parchment" | "slate" | "transparent";

interface ViewerControlsBarProps {
  lighting: LightingPreset;
  onLightingChange: (preset: LightingPreset) => void;
  sunAngle: number;
  onSunAngleChange: (angle: number) => void;
  wireframe: boolean;
  onToggleWireframe: () => void;
  background: BackgroundMode;
  onBackgroundChange: (mode: BackgroundMode) => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  measurementActive: boolean;
  onToggleMeasurement: () => void;
  onResetView: () => void;
  onExportScreenshot: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ViewerControlsBar({
  lighting,
  onLightingChange,
  sunAngle,
  onSunAngleChange,
  wireframe,
  onToggleWireframe,
  background,
  onBackgroundChange,
  showAnnotations,
  onToggleAnnotations,
  measurementActive,
  onToggleMeasurement,
  onResetView,
  onExportScreenshot,
  isFullscreen,
  onToggleFullscreen,
}: ViewerControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl glass-panel-gold border border-[#D4AF37]/40 bg-[#14100C]/90 text-xs">
      {/* Left controls: Lighting & Sun Angle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Lighting Presets */}
        <div className="flex items-center gap-1 bg-[#1A1510] p-1 rounded-xl border border-[#D4AF37]/30">
          <button
            onClick={() => onLightingChange("day")}
            title="Day Preset (Full Sun)"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              lighting === "day"
                ? "bg-[#D4AF37] text-[#1A1510] font-bold"
                : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Day</span>
          </button>
          <button
            onClick={() => onLightingChange("dusk")}
            title="Dusk Preset (Golden Hour)"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              lighting === "dusk"
                ? "bg-[#D4AF37] text-[#1A1510] font-bold"
                : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            <Sunset className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dusk</span>
          </button>
          <button
            onClick={() => onLightingChange("night")}
            title="Night Preset (Subterranean Torchlight)"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              lighting === "night"
                ? "bg-[#D4AF37] text-[#1A1510] font-bold"
                : "text-[#D8C3A5] hover:text-white"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Night</span>
          </button>
        </div>

        {/* Sun Angle Slider */}
        <div className="flex items-center gap-2 bg-[#1A1510] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30">
          <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[11px] text-[#D8C3A5] whitespace-nowrap">
            Sun Angle: <strong className="text-white font-mono">{sunAngle}°</strong>
          </span>
          <input
            type="range"
            min="0"
            max="360"
            value={sunAngle}
            onChange={(e) => onSunAngleChange(Number(e.target.value))}
            aria-label="Adjust sunlight angle"
            className="w-16 sm:w-24 accent-[#D4AF37] cursor-pointer h-1.5 bg-white/10 rounded-lg"
          />
        </div>
      </div>

      {/* Right controls: Measurement, Wireframe, Background, Screenshot, Fullscreen */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Measurement Tool */}
        <button
          onClick={onToggleMeasurement}
          title={measurementActive ? "Deactivate Caliper" : "Activate 3D Measurement Caliper"}
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors font-semibold ${
            measurementActive
              ? "bg-[#C85A32] text-white border-[#C85A32] shadow-lg animate-pulse"
              : "bg-[#1A1510] text-[#D8C3A5] border-[#D4AF37]/30 hover:text-white hover:border-[#D4AF37]"
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>{measurementActive ? "Caliper Active" : "Measure"}</span>
        </button>

        {/* Wireframe */}
        <button
          onClick={onToggleWireframe}
          title="Toggle Mesh Wireframe"
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
            wireframe
              ? "bg-[#D4AF37] text-[#1A1510] font-bold border-[#D4AF37]"
              : "bg-[#1A1510] text-[#D8C3A5] border-[#D4AF37]/30 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Wireframe</span>
        </button>

        {/* Annotations Toggle */}
        <button
          onClick={onToggleAnnotations}
          title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
          className={`p-1.5 rounded-xl border transition-colors ${
            showAnnotations
              ? "bg-[#1A1510] text-[#D4AF37] border-[#D4AF37]/50"
              : "bg-[#1A1510] text-[#D8C3A5]/50 border-white/10"
          }`}
        >
          {showAnnotations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Background Mode */}
        <div className="flex items-center gap-1 bg-[#1A1510] p-1 rounded-xl border border-[#D4AF37]/30">
          <button
            onClick={() => onBackgroundChange("parchment")}
            title="Parchment Dark Background"
            className={`w-5 h-5 rounded-md border ${
              background === "parchment" ? "border-[#D4AF37] ring-1 ring-[#D4AF37]" : "border-white/20"
            } bg-[#14100C]`}
          />
          <button
            onClick={() => onBackgroundChange("slate")}
            title="Slate Black Background"
            className={`w-5 h-5 rounded-md border ${
              background === "slate" ? "border-[#D4AF37] ring-1 ring-[#D4AF37]" : "border-white/20"
            } bg-[#0A0D14]`}
          />
          <button
            onClick={() => onBackgroundChange("transparent")}
            title="Transparent Background"
            className={`w-5 h-5 rounded-md border flex items-center justify-center text-[9px] ${
              background === "transparent" ? "border-[#D4AF37] ring-1 ring-[#D4AF37] text-white" : "border-white/20 text-white/50"
            } bg-black/40`}
          >
            T
          </button>
        </div>

        {/* Screenshot */}
        <button
          onClick={onExportScreenshot}
          title="Export Watermarked PNG Screenshot"
          className="p-1.5 rounded-xl bg-[#1A1510] text-[#D8C3A5] hover:text-white border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Reset Camera */}
        <button
          onClick={onResetView}
          title="Reset Camera View"
          className="p-1.5 rounded-xl bg-[#1A1510] text-[#D8C3A5] hover:text-white border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="p-1.5 rounded-xl bg-[#1A1510] text-[#D8C3A5] hover:text-white border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
