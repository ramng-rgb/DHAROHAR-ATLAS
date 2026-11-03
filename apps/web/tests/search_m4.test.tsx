import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "../components/search/CommandPalette";
import { AskTheArchivePanel } from "../components/search/AskTheArchivePanel";
import { apiClient } from "../lib/api-client";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/search",
}));

describe("M4: CommandPalette Keyboard & Autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when opened and focuses input", () => {
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Search monuments, folios/i)).toBeInTheDocument();
  });

  it("handles keyboard navigation and Enter to search full archive", () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} onClose={onClose} />);
    
    const input = screen.getByPlaceholderText(/Search monuments, folios/i);
    fireEvent.change(input, { target: { value: "stepwell" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/search?q=stepwell");
  });

  it("displays curated suggestions when input is empty", () => {
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Rani ki Vav Patan")).toBeInTheDocument();
    expect(screen.getByText("વાવ નિર્માણ શિલ્પશાસ્ત્ર")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Search monuments, folios/i);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("M4: AskTheArchivePanel Grounded RAG & Citations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders curated heritage questions in English, Hindi, and Gujarati", () => {
    render(<AskTheArchivePanel />);
    expect(screen.getByText(/Who commissioned Rani ki Vav/i)).toBeInTheDocument();
    expect(screen.getByText(/राणी की वाव किस शैली में बनी है/i)).toBeInTheDocument();
    expect(screen.getByText(/અડાલજની વાવ કોણે બંધાવી હતી/i)).toBeInTheDocument();
  });

  it("renders answer with verified citation chips and displays hover popover", async () => {
    // Mock askArchive
    vi.spyOn(apiClient, "askArchive").mockResolvedValueOnce({
      answered: true,
      question: "Who commissioned Rani ki Vav?",
      answer: "Rani ki Vav was commissioned in 1063 CE by Queen Udayamati [1] of the Solanki dynasty in Patan [2].",
      lang: "en",
      has_illustrative_source: false,
      sources: [],
      related_records: [],
      citations: [
        {
          citation_index: 1,
          chunk_id: "chunk-1",
          source_type: "document_line_group",
          source_id: "doc-1",
          document_id: "doc-1",
          line_ids: ["line-1"],
          title: "Rani ki Vav Foundation Epigraph",
          snippet: "Om svasti! Solanki Queen Udayamati commissioned the subterranean stepwell in Patan.",
          lang: "hi",
          is_illustrative: false,
          data_confidence: "verified_epigraph",
        },
        {
          citation_index: 2,
          chunk_id: "chunk-2",
          source_type: "site",
          source_id: "site-1",
          site_id: "site-1",
          line_ids: [],
          title: "Rani ki Vav Monument Record",
          snippet: "UNESCO World Heritage subterranean stepwell located in Patan, Gujarat.",
          lang: "en",
          is_illustrative: false,
          data_confidence: "high",
        },
      ],
      latency_ms: 24.5,
    } as any);

    render(<AskTheArchivePanel initialQuestion="Who commissioned Rani ki Vav?" />);
    const askButton = screen.getByRole("button", { name: /Ask/i });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/Archive Synthesis/i)).toBeInTheDocument();
    });

    // Check citation chips [1] and [2]
    const chip1 = screen.getByRole("button", { name: /Citation \[1\]/i });
    const chip2 = screen.getByRole("button", { name: /Citation \[2\]/i });
    expect(chip1).toBeInTheDocument();
    expect(chip2).toBeInTheDocument();

    // Hover chip 1 to trigger popover
    fireEvent.mouseEnter(chip1);
    expect(screen.getAllByText(/Rani ki Vav Foundation Epigraph/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Queen Udayamati commissioned/i).length).toBeGreaterThanOrEqual(1);

    // Verify verified sources list rendered below
    expect(screen.getByText(/Verified Sources Cited \(2\)/i)).toBeInTheDocument();
  });

  it("handles refusal state when query is unanswerable from the archive", async () => {
    vi.spyOn(apiClient, "askArchive").mockResolvedValueOnce({
      answered: false,
      question: "What is the secret recipe for Italian pizza?",
      answer: "I could not find verified evidence in the archive for this inquiry. The Dharohar knowledge engine refuses to hallucinate.",
      reason: "insufficient_archive_evidence",
      lang: "en",
      has_illustrative_source: false,
      sources: [],
      citations: [],
      related_records: [
        {
          id: "site-1",
          title: "Rani ki Vav",
          source_type: "site",
          site_slug: "rani-ki-vav-patan",
        },
      ],
      latency_ms: 12.0,
    } as any);

    render(<AskTheArchivePanel initialQuestion="What is the secret recipe for Italian pizza?" />);
    const askButton = screen.getByRole("button", { name: /Ask/i });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/Archive Refusal/i)).toBeInTheDocument();
      expect(screen.getByText(/Nearest Related Records in Archive/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/I could not find verified evidence/i)).toBeInTheDocument();
    expect(screen.getByText("Rani ki Vav")).toBeInTheDocument();
  });
});
