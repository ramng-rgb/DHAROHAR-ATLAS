"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, MessageSquare, Send, BookOpen, Compass, 
  MapPin, Check, Copy, ThumbsUp, ThumbsDown, AlertCircle, 
  ExternalLink, Info, ShieldCheck, RefreshCw, X, ChevronDown, ChevronUp
} from "lucide-react";
import { apiClient, AskArchiveResponse, SourceCitation } from "@/lib/api-client";

interface AskTheArchivePanelProps {
  initialQuestion?: string;
  compact?: boolean;
  onShowOnMap?: (siteId: string) => void;
}

export function AskTheArchivePanel({
  initialQuestion = "",
  compact = false,
  onShowOnMap,
}: AskTheArchivePanelProps) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [response, setResponse] = useState<AskArchiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<SourceCitation | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [showSources, setShowSources] = useState(true);

  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const curatedQuestions = [
    {
      label: "Who commissioned Rani ki Vav and what is its style?",
      lang: "en",
      q: "Who commissioned Rani ki Vav and what is its architectural style?",
    },
    {
      label: "राणी की वाव किस शैली में बनी है?",
      lang: "hi",
      q: "राणी की वाव किस शैली में बनी है और इसका ऐतिहासिक महत्व क्या है?",
    },
    {
      label: "અડાલજની વાવ કોણે બંધાવી હતી?",
      lang: "gu",
      q: "અડાલજની વાવ કોણે બંધાવી હતી અને તેનો શિલાલેખ શું જણાવે છે?",
    },
    {
      label: "What water harvesting engineering was used at Dholavira?",
      lang: "en",
      q: "What water harvesting engineering was used at Dholavira Harappan citadel?",
    },
    {
      label: "Tell me about Kumbhalgarh perimeter wall",
      lang: "en",
      q: "Tell me about the perimeter wall and fortification of Kumbhalgarh Fort",
    },
  ];

  const getCitationUrl = (c: SourceCitation): string => {
    if (c.source_type === "site" || c.site_id) {
      return `/explore?site=${c.site_id || c.source_id}`;
    }
    if (c.document_id) {
      const lineParam = c.line_ids && c.line_ids.length > 0 ? `?line=${c.line_ids[0]}` : "";
      return `/archive/${c.document_id}${lineParam}`;
    }
    return `/search?q=${encodeURIComponent(c.title)}`;
  };

  const handleAsk = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : question).trim();
    if (!q) return;

    if (queryText !== undefined) {
      setQuestion(queryText);
    }

    // Reset states
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsStreaming(true);
    setStreamedText("");
    setResponse(null);
    setError(null);
    setFeedback(null);
    setHoveredCitation(null);

    if (typeof EventSource !== "undefined") {
      try {
        const streamUrl = apiClient.getAskStreamUrl(q);
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "token") {
              setStreamedText((prev) => prev + data.token);
            } else if (data.type === "complete") {
              const resp = data.response as AskArchiveResponse;
              setResponse(resp);
              setStreamedText(resp.answer || resp.message || "");
              setIsStreaming(false);
              es.close();
            } else if (data.type === "error") {
              setError(data.error || "An error occurred while consulting the archive.");
              setIsStreaming(false);
              es.close();
            }
          } catch (e) {
            console.error("SSE parse error", e);
          }
        };

        es.onerror = (err) => {
          console.error("SSE connection error", err);
          es.close();
          // Fallback to standard HTTP post if SSE fails
          apiClient.askArchive({ question: q, stream: false })
            .then((resp) => {
              setResponse(resp);
              setStreamedText(resp.answer || "");
            })
            .catch(() => {
              setError("Could not connect to archive knowledge engine. Please check backend connection.");
            })
            .finally(() => {
              setIsStreaming(false);
            });
        };
      } catch (err: any) {
        setError(err?.message || "Failed to submit inquiry.");
        setIsStreaming(false);
      }
    } else {
      // Direct HTTP fallback for environments without EventSource
      apiClient.askArchive({ question: q, stream: false })
        .then((resp) => {
          setResponse(resp);
          setStreamedText(resp.answer || "");
        })
        .catch(() => {
          setError("Could not connect to archive knowledge engine. Please check backend connection.");
        })
        .finally(() => {
          setIsStreaming(false);
        });
    }
  };

  const copyAnswer = () => {
    if (!response || !response.answer) return;
    const citationsText = (response.citations || [])
      .map((c) => `[${c.citation_index}] ${c.title}: ${c.snippet}`)
      .join("\n");
    const textToCopy = `${response.answer}\n\nSources:\n${citationsText}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render text with interactive [1], [2] citation chips
  const renderTextWithCitations = (text: string, citations: SourceCitation[]) => {
    if (!citations || citations.length === 0) {
      return <span>{text}</span>;
    }

    // Split text by citation pattern like [1], [2], [1, 2]
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+(?:,\s*\d+)*)\]/);
      if (match) {
        const nums = match[1].split(",").map((n) => parseInt(n.trim(), 10));
        return (
          <span key={index} className="inline-flex items-center gap-0.5 mx-0.5 align-baseline">
            {nums.map((num) => {
              const cit = citations.find((c) => c.citation_index === num);
              if (!cit) return <span key={num} className="text-[#D8C3A5]/50 text-xs">[{num}]</span>;

              const citUrl = getCitationUrl(cit);

              return (
                <button
                  key={num}
                  type="button"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopoverPos({ x: rect.left, y: rect.bottom + 6 });
                    setHoveredCitation(cit);
                  }}
                  onMouseLeave={() => setHoveredCitation(null)}
                  onClick={() => {
                    router.push(citUrl);
                  }}
                  className="inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[11px] font-mono font-bold bg-[#D4AF37]/25 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#090D16] border border-[#D4AF37]/40 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  aria-label={`Citation [${num}]: ${cit.title}`}
                >
                  [{num}]
                </button>
              );
            })}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const answerText = response?.answer || streamedText;

  return (
    <div className={`w-full glass-panel-gold rounded-2xl border border-[#D4AF37]/40 shadow-2xl overflow-hidden transition-all ${compact ? "p-4" : "p-6 sm:p-8"}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C85A32] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
            <Sparkles className="w-5 h-5 text-indigoInk fill-indigoInk" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-wide text-[#F6F1E9] flex items-center gap-2">
              Ask the Archive
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                Grounded RAG
              </span>
            </h2>
            <p className="text-xs text-[#D8C3A5]/70 font-serif">
              Answers generated strictly from verified records with inline citations. Zero external hallucination.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#D8C3A5]/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Calibrated Refusal Active</span>
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="mt-4"
      >
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isStreaming}
            placeholder="Ask anything about monuments, inscriptions, or folklore (e.g. 'Who built Rani ki Vav?')..."
            className="w-full bg-black/40 border border-[#D4AF37]/40 rounded-xl pl-4 pr-24 py-3 text-sm text-[#F6F1E9] placeholder-[#D8C3A5]/50 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !question.trim()}
            className="absolute right-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C85A32] text-indigoInk font-bold text-xs flex items-center gap-1.5 hover:opacity-95 disabled:opacity-40 transition-all shadow-md shadow-[#D4AF37]/20"
          >
            {isStreaming ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Curated Example Questions */}
      {!response && !isStreaming && (
        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#D8C3A5]/60 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-[#D4AF37]" />
            Try Curated Archive Inquiries:
          </p>
          <div className="flex flex-wrap gap-2">
            {curatedQuestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(item.q)}
                className="text-xs text-left px-3 py-1.5 rounded-lg bg-black/40 hover:bg-[#D4AF37]/15 border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 text-[#D8C3A5] hover:text-[#F6F1E9] transition-all flex items-center gap-1.5 group"
              >
                <span className="text-[10px] font-mono uppercase px-1 py-0.2 rounded bg-white/10 text-[#D4AF37]/80">
                  {item.lang}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Streaming / Output Area */}
      {(isStreaming || response) && (
        <div className="mt-6 pt-4 border-t border-[#D4AF37]/20 space-y-4 animate-fadeIn">
          {/* Answer Card */}
          <div className="bg-black/50 border border-[#D4AF37]/30 rounded-xl p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? "bg-amber-400 animate-ping" : response?.answered ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37]">
                  {isStreaming ? "Synthesising Grounded Answer..." : response?.answered ? "Archive Synthesis" : "Archive Refusal"}
                </span>
                {response && response.latency_ms !== undefined && (
                  <span className="text-[11px] text-[#D8C3A5]/50 font-mono">
                    • {response.latency_ms} ms
                  </span>
                )}
              </div>

              {response && response.answered && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAnswer}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#D8C3A5] hover:text-[#D4AF37] text-xs flex items-center gap-1 transition-colors"
                    title="Copy answer with citations"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                    <button
                      onClick={() => setFeedback("up")}
                      className={`p-1.5 rounded hover:bg-white/10 transition-colors ${feedback === "up" ? "text-emerald-400" : "text-[#D8C3A5]/60"}`}
                      title="Accurate citation"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setFeedback("down")}
                      className={`p-1.5 rounded hover:bg-white/10 transition-colors ${feedback === "down" ? "text-rose-400" : "text-[#D8C3A5]/60"}`}
                      title="Inaccurate or incomplete"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Text */}
            <div className="text-sm text-[#F6F1E9] leading-relaxed font-sans space-y-2 whitespace-pre-line">
              {response ? (
                renderTextWithCitations(response.answer || response.message || "", response.citations || [])
              ) : (
                <span>
                  {streamedText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-[#D4AF37] animate-pulse align-middle" />
                </span>
              )}
            </div>

            {/* Academic Integrity Disclaimer */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D8C3A5]/60 font-serif">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                Answers are generated from archive records only. Verify against cited sources.
              </span>

              {/* Show on Map Action if sites cited */}
              {response?.citations && response.citations.some((c) => c.source_type === "site" || c.site_id) && (
                <button
                  onClick={() => {
                    const firstSiteCit = response.citations.find((c) => c.source_type === "site" || c.site_id);
                    if (firstSiteCit) {
                      if (onShowOnMap) {
                        onShowOnMap(firstSiteCit.site_id || firstSiteCit.source_id);
                      } else {
                        router.push(`/explore?site=${firstSiteCit.site_id || firstSiteCit.source_id}`);
                      }
                    }
                  }}
                  className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-sans font-medium"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Show cited monument on Map
                </button>
              )}
            </div>
          </div>

          {/* Refusal Nearest Records (if answered: false) */}
          {response && !response.answered && response.related_records && response.related_records.length > 0 && (
            <div className="bg-black/30 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Nearest Related Records in Archive:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {response.related_records.map((rec: any, idx: number) => (
                  <Link
                    key={rec.id || idx}
                    href={rec.site_slug ? `/sites/${rec.site_slug}` : rec.document_id ? `/archive/${rec.document_id}` : `/search?q=${encodeURIComponent(rec.title || "")}`}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/30 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F6F1E9] truncate group-hover:text-[#D4AF37]">
                        {rec.title}
                      </p>
                      <p className="text-[10px] text-[#D8C3A5]/60 capitalize">
                        {String(rec.source_type || "").replace(/_/g, " ")}
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#D8C3A5]/40 group-hover:text-[#D4AF37] shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Citations List Accordion */}
          {response && response.citations && response.citations.length > 0 && (
            <div className="border border-[#D4AF37]/20 rounded-xl bg-black/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#D4AF37] hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Verified Sources Cited ({response.citations.length})</span>
                </div>
                {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSources && (
                <div className="p-4 pt-1 divide-y divide-white/5 space-y-3">
                  {response.citations.map((c) => {
                    const citUrl = getCitationUrl(c);
                    return (
                      <div key={c.citation_index} className="pt-3 first:pt-0 flex items-start gap-3">
                        <div className="w-6 h-6 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                          {c.citation_index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link
                              href={citUrl}
                              className="text-xs font-semibold text-[#F6F1E9] hover:text-[#D4AF37] hover:underline flex items-center gap-1"
                            >
                              <span>{c.title}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>

                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#D8C3A5]/80">
                              {c.source_type.replace(/_/g, " ")}
                            </span>

                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#D4AF37]/15 text-[#D4AF37]">
                              {c.lang}
                            </span>

                            {c.is_illustrative && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Illustrative Sample
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#D8C3A5]/80 font-serif italic bg-black/40 p-2 rounded border border-white/5">
                            &ldquo;{c.snippet}&rdquo;
                          </p>

                          {c.line_ids && c.line_ids.length > 0 && c.document_id && (
                            <div className="mt-1 flex items-center gap-2">
                              <Link
                                href={`/archive/${c.document_id}?line=${c.line_ids[0]}`}
                                className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono"
                              >
                                <span>Inspect exact OCR line in folio viewer</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Citation Popover */}
      {hoveredCitation && popoverPos && (
        <div
          className="fixed z-50 max-w-sm w-80 p-3 bg-[#0E1322] border border-[#D4AF37] rounded-xl shadow-2xl pointer-events-none animate-fadeIn"
          style={{
            left: `${Math.min(popoverPos.x, window.innerWidth - 340)}px`,
            top: `${popoverPos.y}px`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono text-[#D4AF37]">
            <BookOpen className="w-3 h-3" />
            <span className="font-bold">Source [{hoveredCitation.citation_index}]:</span>
            <span className="truncate">{hoveredCitation.title}</span>
          </div>
          <p className="text-xs text-[#D8C3A5] font-serif italic line-clamp-4">
            &ldquo;{hoveredCitation.snippet}&rdquo;
          </p>
          <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-[#D8C3A5]/60 font-mono">
            <span className="uppercase">{hoveredCitation.source_type}</span>
            <span>Click to inspect record</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
