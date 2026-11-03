"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Sparkles, MapPin, BookOpen, Tag, ArrowRight, 
  CornerDownLeft, X, Compass, Loader2
} from "lucide-react";
import { apiClient, SearchSuggestion } from "@/lib/api-client";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setSuggestions([]);
    }
  }, [isOpen]);

  // Handle global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await apiClient.searchSuggestions(query.trim(), 8);
        setSuggestions(results);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  const getItemUrl = (item: SearchSuggestion): string => {
    if (item.kind === "site") {
      return item.slug ? `/sites/${item.slug}` : `/explore?site=${item.id}`;
    }
    if (item.kind === "document") {
      return `/archive/${item.id}`;
    }
    return `/search?q=${encodeURIComponent(item.title)}`;
  };

  // Keyboard navigation within suggestions
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalOptions = suggestions.length + 1; // +1 for "Search all archive"

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalOptions);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex === 0 || suggestions.length === 0) {
        // Full search
        if (query.trim()) {
          onClose();
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
      } else {
        const item = suggestions[selectedIndex - 1];
        if (item) {
          onClose();
          router.push(getItemUrl(item));
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 pb-6 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search Dharohar Archive"
    >
      <div 
        className="w-full max-w-2xl bg-[#0E1322] border border-[#D4AF37]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[#D4AF37]/20 px-4 py-3.5 bg-black/40">
          <Search className="w-5 h-5 text-[#D4AF37] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search monuments, folios, inscriptions, folklore (EN / हिन्दी / ગુજરાતી)..."
            className="w-full bg-transparent text-[#F6F1E9] placeholder-[#D8C3A5]/50 text-base focus:outline-none"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="cmd-suggestions"
          />
          {loading && (
            <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin shrink-0 mr-2" />
          )}
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="p-1 text-[#D8C3A5]/60 hover:text-[#D4AF37] rounded"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#D8C3A5]/80 border border-white/10 ml-2">
            ESC
          </kbd>
        </div>

        {/* Suggestion List */}
        <div className="max-h-96 overflow-y-auto p-2" id="cmd-suggestions">
          {/* Default Option: Full Search */}
          <div
            onClick={() => {
              if (query.trim()) {
                onClose();
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              }
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
              selectedIndex === 0
                ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                : "text-[#EFE6D8]/80 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {query.trim() ? (
                    <>
                      Search full archive for <span className="text-[#D4AF37] font-semibold">&ldquo;{query}&rdquo;</span>
                    </>
                  ) : (
                    "Type to search across 25 sites, 52 folios, and folklore"
                  )}
                </p>
                <p className="text-[11px] text-[#D8C3A5]/60">
                  Hybrid pgvector HNSW + FTS unaccent + Trigram ranking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#D8C3A5]/60 font-mono">
              <span>Enter</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-[#D4AF37]/70">
                Direct Matches
              </div>
              <ul ref={listRef} role="listbox">
                {suggestions.map((item, idx) => {
                  const isSelected = selectedIndex === idx + 1;
                  const itemUrl = getItemUrl(item);
                  const subText = item.name_hi || item.name_gu;

                  return (
                    <li
                      key={`${item.kind}-${item.title}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onClose();
                        router.push(itemUrl);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                          : "text-[#EFE6D8]/80 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-black/40 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                          {item.kind === "site" && <Compass className="w-4 h-4 text-[#D4AF37]" />}
                          {item.kind === "document" && <BookOpen className="w-4 h-4 text-[#C85A32]" />}
                          {item.kind === "entity" && <Tag className="w-4 h-4 text-emerald-400" />}
                          {item.kind === "phrase" && <Search className="w-4 h-4 text-sky-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-[#F6F1E9]">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#D8C3A5]/60">
                            <span className="capitalize">{item.kind}</span>
                            {subText && (
                              <span className="truncate opacity-75 font-serif">
                                • {subText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 ml-2" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Quick Examples when empty */}
          {!query && (
            <div className="mt-3 pt-3 border-t border-white/10 px-2 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#D8C3A5]/60">
                Suggested Curated Queries
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Rani ki Vav Patan",
                  "Solanki stepwell architecture",
                  "વાવ નિર્માણ શિલ્પશાસ્ત્ર",
                  "राणी की वाव सोलंकी",
                  "Dholavira water reservoir",
                  "Sun Temple Modhera",
                  "Kumbhalgarh perimeter wall",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuery(q);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30 text-[#D8C3A5] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D8C3A5]/60 font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10">Enter</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10">Esc</kbd> Close</span>
          </div>
          <Link
            href="/search"
            onClick={onClose}
            className="text-[#D4AF37] hover:underline flex items-center gap-1"
          >
            Advanced Search <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
