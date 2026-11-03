"use client";

import React, { useState } from "react";
import type { components } from "../../lib/api-schema";

type FolkloreDetail = components["schemas"]["FolkloreDetail"];
type ObservationDetail = components["schemas"]["ObservationDetail"];

interface FolkloreObservationsProps {
  folklore: FolkloreDetail[];
  observations: ObservationDetail[];
}

export function FolkloreObservationsSection({ folklore, observations }: FolkloreObservationsProps) {
  // Collect all distinct languages
  const allLanguages = Array.from(
    new Set([
      ...folklore.map((f) => f.language || "en"),
      ...observations.map((o) => o.language || "en"),
    ])
  );

  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "folklore" | "observations">("all");

  const filteredFolklore = folklore.filter((f) => {
    if (selectedLang !== "all" && (f.language || "en") !== selectedLang) return false;
    return true;
  });

  const filteredObservations = observations.filter((o) => {
    if (selectedLang !== "all" && (o.language || "en") !== selectedLang) return false;
    return true;
  });

  const totalCount = filteredFolklore.length + filteredObservations.length;

  if (folklore.length === 0 && observations.length === 0) {
    return (
      <section id="folklore" className="py-12 border-t border-border/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">
            Folklore & Archaeological Notes
          </h2>
          <div className="p-8 rounded-xl bg-card/40 border border-border/60 text-center text-muted-foreground">
            No oral histories or architectural field observations recorded yet.
          </div>
        </div>
      </section>
    );
  }

  const langNames: Record<string, string> = {
    all: "All Languages",
    en: "English",
    hi: "हिन्दी (Hindi)",
    gu: "ગુજરાતી (Gujarati)",
  };

  return (
    <section id="folklore" className="py-12 border-t border-border/40 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Folklore & Field Observations
            </h2>
          </div>

          {/* Filter Controls: Section Selector + Language Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type tabs */}
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({folklore.length + observations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("folklore")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "folklore" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Folklore ({folklore.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("observations")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "observations" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Observations ({observations.length})
              </button>
            </div>

            {/* Language dropdown / tabs if multiple */}
            {allLanguages.length > 1 && (
              <div className="inline-flex items-center gap-1.5 pl-2 border-l border-border/60">
                <span className="text-xs text-muted-foreground font-mono">Lang:</span>
                <select
                  aria-label="Filter by language"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="text-xs bg-muted border border-border/60 rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Languages</option>
                  {allLanguages.map((l) => (
                    <option key={l} value={l}>
                      {langNames[l] || l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="p-8 rounded-xl bg-card/40 border border-border/60 text-center text-muted-foreground text-sm">
            No entries found matching the selected language filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Folklore items */}
            {(activeTab === "all" || activeTab === "folklore") &&
              filteredFolklore.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl p-5 bg-card border border-border/70 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {item.kind ? item.kind.replace("_", " ") : "Folklore"}
                        </span>
                        <span className="text-[11px] uppercase font-mono text-muted-foreground font-medium">
                          {item.language?.toUpperCase() || "EN"}
                        </span>
                      </div>

                      {item.is_illustrative ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"
                          title="This narrative represents a reconstructed or illustrative folk memory"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Illustrative sample
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Verified Tradition
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-lg text-foreground leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-sm text-foreground/80 leading-relaxed max-w-[55ch] whitespace-pre-line text-pretty">
                      {item.body_md}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground font-mono flex items-center justify-between gap-2">
                    <span className="truncate">
                      Source: {item.source || "Oral history repository"}
                    </span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs font-medium shrink-0 flex items-center gap-0.5"
                      >
                        Citation link
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </article>
              ))}

            {/* Observation items */}
            {(activeTab === "all" || activeTab === "observations") &&
              filteredObservations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl p-5 bg-card border border-border/70 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          {item.kind ? item.kind.replace("_", " ") : "Observation"}
                        </span>
                        <span className="text-[11px] uppercase font-mono text-muted-foreground font-medium">
                          {item.language?.toUpperCase() || "EN"}
                        </span>
                      </div>

                      {item.is_illustrative ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"
                          title="This note represents an illustrative architectural observation"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Illustrative sample
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Field Record
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-lg text-foreground leading-snug">
                      {item.title || "Architectural Field Note"}
                    </h3>

                    <p className="text-sm text-foreground/80 leading-relaxed max-w-[55ch] whitespace-pre-line text-pretty">
                      {item.body_md}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground font-mono flex items-center justify-between gap-2">
                    <span className="truncate">
                      Survey: {item.source || "ASI / Scholarly monograph"}
                    </span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs font-medium shrink-0 flex items-center gap-0.5"
                      >
                        Archive link
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
