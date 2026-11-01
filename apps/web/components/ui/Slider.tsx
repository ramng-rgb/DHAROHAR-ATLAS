"use client";

import React, { useMemo } from "react";
import type { HistogramBucket } from "@/lib/api-client";

export interface TimelineSliderProps {
  yearFrom: number; // e.g. -3000
  yearTo: number;   // e.g. 1900
  onChange: (from: number, to: number) => void;
  histogram?: HistogramBucket[];
  eraPresets?: { label: string; from: number; to: number }[];
  className?: string;
}

export function formatYearLabel(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}

// Piecewise mapping for intuitive non-linear scrubber
// -3000 to -1000 (0% to 25%)
// -1000 to 0 (25% to 45%)
// 0 to 1200 (45% to 70%)
// 1200 to 1900 (70% to 100%)
export function yearToPercent(year: number): number {
  if (year <= -3000) return 0;
  if (year >= 1900) return 100;

  if (year < -1000) {
    return ((year - (-3000)) / 2000) * 25;
  } else if (year < 0) {
    return 25 + ((year - (-1000)) / 1000) * 20;
  } else if (year < 1200) {
    return 45 + (year / 1200) * 25;
  } else {
    return 70 + ((year - 1200) / 700) * 30;
  }
}

export function percentToYear(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 25) {
    return Math.round(-3000 + (p / 25) * 2000);
  } else if (p <= 45) {
    return Math.round(-1000 + ((p - 25) / 20) * 1000);
  } else if (p <= 70) {
    return Math.round(0 + ((p - 45) / 25) * 1200);
  } else {
    return Math.round(1200 + ((p - 70) / 30) * 700);
  }
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  yearFrom,
  yearTo,
  onChange,
  histogram = [],
  eraPresets = [
    { label: "Indus", from: -3000, to: -1500 },
    { label: "Maurya", from: -350, to: -180 },
    { label: "Solanki", from: 950, to: 1250 },
    { label: "Sultanate", from: 1200, to: 1526 },
    { label: "Mughal", from: 1526, to: 1750 },
    { label: "Colonial", from: 1750, to: 1900 },
  ],
  className = "",
}) => {
  const leftPct = yearToPercent(yearFrom);
  const rightPct = yearToPercent(yearTo);

  const maxHistogramCount = useMemo(() => {
    if (!histogram.length) return 1;
    return Math.max(...histogram.map((h) => h.count), 1);
  }, [histogram]);

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Era Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-[11px] text-sandstone uppercase tracking-wider font-semibold mr-1">
          Eras:
        </span>
        {eraPresets.map((preset) => {
          const isActive = yearFrom <= preset.from && yearTo >= preset.to;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.from, preset.to)}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-all ${
                isActive
                  ? "bg-goldLeaf text-parchment-950 font-bold shadow-sm"
                  : "bg-parchment-900/80 text-parchment-300 border border-sandstone/20 hover:border-goldLeaf/40 hover:text-goldLeaf"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(-3000, 1900)}
          className="px-2 py-0.5 rounded text-[11px] text-sandstone-deep hover:text-goldLeaf underline ml-auto"
        >
          All Eras
        </button>
      </div>

      {/* Density Histogram */}
      {histogram.length > 0 && (
        <div className="h-9 flex items-end gap-1 px-1 pt-1 bg-black/25 rounded border border-sandstone/10">
          {histogram.map((bucket, i) => {
            const heightPct = Math.round((bucket.count / maxHistogramCount) * 100);
            const bucketFromPct = yearToPercent(bucket.year_start);
            const bucketToPct = yearToPercent(bucket.year_end);
            const isInRange = bucketToPct >= leftPct && bucketFromPct <= rightPct;

            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end items-center group relative h-full"
              >
                <div
                  style={{ height: `${Math.max(12, heightPct)}%` }}
                  className={`w-full rounded-t transition-colors ${
                    isInRange ? "bg-goldLeaf" : "bg-sandstone/25"
                  }`}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                  <div className="bg-parchment-950 border border-goldLeaf text-[10px] text-parchment-100 px-2 py-1 rounded shadow-lg whitespace-nowrap font-sans">
                    {bucket.era_label}: <span className="font-bold text-goldLeaf">{bucket.count} sites</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Range Track with Handles */}
      <div className="relative h-6 flex items-center select-none">
        {/* Background track */}
        <div className="w-full h-1.5 bg-parchment-900 rounded-full border border-sandstone/20" />

        {/* Selected highlighted segment */}
        <div
          className="absolute h-1.5 bg-gradient-to-r from-goldLeaf to-terracotta rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(2, rightPct - leftPct)}%`,
          }}
        />

        {/* Left Slider Input */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={leftPct}
          aria-label="Chronological start year"
          onChange={(e) => {
            const newLeftPct = parseFloat(e.target.value);
            const newYear = percentToYear(newLeftPct);
            if (newYear <= yearTo) {
              onChange(newYear, yearTo);
            }
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none z-10 accent-goldLeaf cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-goldLeaf [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-parchment-950 [&::-webkit-slider-thumb]:shadow-md"
        />

        {/* Right Slider Input */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={rightPct}
          aria-label="Chronological end year"
          onChange={(e) => {
            const newRightPct = parseFloat(e.target.value);
            const newYear = percentToYear(newRightPct);
            if (newYear >= yearFrom) {
              onChange(yearFrom, newYear);
            }
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none z-20 accent-goldLeaf cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-parchment-950 [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>

      {/* Year Range Indicator */}
      <div className="flex justify-between items-center text-xs text-sandstone font-mono">
        <span className="font-semibold text-goldLeaf">{formatYearLabel(yearFrom)}</span>
        <span className="text-[10px] text-sandstone-deep uppercase tracking-wider">
          Historical Span
        </span>
        <span className="font-semibold text-terracotta-light">{formatYearLabel(yearTo)}</span>
      </div>
    </div>
  );
};
