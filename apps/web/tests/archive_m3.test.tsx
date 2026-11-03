import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentViewer } from "@/components/archive/DocumentViewer";
import type { DocumentResponse } from "@/lib/api-client";
import { apiClient } from "@/lib/api-client";

// Mock API Client
vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<any>("@/lib/api-client");
  return {
    ...actual,
    apiClient: {
      getSites: vi.fn().mockResolvedValue([
        { id: "site-1", name: "Rani ki Vav (The Queen's Stepwell)", slug: "rani-ki-vav" },
      ]),
      patchOCRLine: vi.fn(),
      getDocumentVersions: vi.fn().mockResolvedValue([]),
      revertVersion: vi.fn().mockResolvedValue({ status: "success" }),
      linkEntityToSite: vi.fn().mockResolvedValue({ status: "linked" }),
      getDocumentExportUrl: vi.fn().mockReturnValue("/mock-export"),
    },
  };
});

// Helper for grapheme-safe slicing with Intl.Segmenter
function sliceGraphemes(text: string, start: number, end: number): string {
  const segmenter = new Intl.Segmenter("hi", { granularity: "grapheme" });
  const segments = Array.from(segmenter.segment(text)).map((s) => s.segment);
  return segments.slice(start, end).join("");
}

// Bbox to pixel transform helper
function bboxToPixels(
  bbox: { x: number; y: number; w: number; h: number },
  imageWidth: number,
  imageHeight: number
) {
  const clamp = (val: number) => Math.max(0, Math.min(1, val));
  const cx = clamp(bbox.x);
  const cy = clamp(bbox.y);
  const cw = Math.min(clamp(bbox.w), 1 - cx);
  const ch = Math.min(clamp(bbox.h), 1 - cy);

  return {
    pixelX: Math.round(cx * imageWidth),
    pixelY: Math.round(cy * imageHeight),
    pixelW: Math.round(cw * imageWidth),
    pixelH: Math.round(ch * imageHeight),
  };
}

describe("M3: Archive OCR & Bounding Box Mathematical Transforms", () => {
  it("transforms normalized bbox [0, 1] accurately to target pixel coordinates", () => {
    const normBox = { x: 0.1, y: 0.2, w: 0.8, h: 0.05 };
    const { pixelX, pixelY, pixelW, pixelH } = bboxToPixels(normBox, 1200, 1600);

    expect(pixelX).toBe(120);
    expect(pixelY).toBe(320);
    expect(pixelW).toBe(960);
    expect(pixelH).toBe(80);
  });

  it("clamps out-of-bound bboxes to protect viewport from canvas overflows", () => {
    const overflowingBox = { x: 0.85, y: 0.9, w: 0.5, h: 0.3 };
    const { pixelX, pixelY, pixelW, pixelH } = bboxToPixels(overflowingBox, 1000, 1000);

    expect(pixelX).toBe(850);
    expect(pixelY).toBe(900);
    // Clamped so width + x <= 1000
    expect(pixelX + pixelW).toBeLessThanOrEqual(1000);
    expect(pixelY + pixelH).toBeLessThanOrEqual(1000);
  });
});

describe("M3: Devanagari & Gujarati Grapheme-Safe Slicing (Intl.Segmenter)", () => {
  it("slices Devanagari conjuncts without severing vowel matras or viramas", () => {
    const devanagariText = "श्री चालुक्य राज्ञी उदयमती पाटन वापी";
    // Using standard character slicing:
    // Notice that standard substring on Indic text can sever combining virama \u094D
    const graphemeFirstWord = sliceGraphemes(devanagariText, 0, 2);
    expect(graphemeFirstWord).toBe("श्री ");

    // Verify 'श्री' is treated as a single grapheme cluster
    const segmenter = new Intl.Segmenter("hi", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment("श्री")).map((s) => s.segment);
    expect(segments.length).toBe(1);
    expect(segments[0]).toBe("श्री");
  });

  it("slices Gujarati text correctly respecting composite ligatures", () => {
    const gujaratiText = "અડાલજ વાવ સ્થાપત્ય";
    const segmenter = new Intl.Segmenter("gu", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(gujaratiText)).map((s) => s.segment);

    expect(segments.join("")).toBe(gujaratiText);
    expect(segments[0]).toBe("અ");
    expect(segments[1]).toBe("ડા");
  });
});

describe("M3: DocumentViewer Interactive Component & Bidirectional Linking", () => {
  const mockDocument: DocumentResponse = {
    id: "doc-test-1",
    title: "Rani ki Vav Sanskrit Foundation Folio",
    language_hint: "hi",
    language: "hi",
    doc_type: "inscription",
    document_type: "inscription",
    status: "ready",
    site_id: "site-1",
    uploaded_by: "epigraphist",
    source: "ASI Epigraphia Indica Vol IX",
    source_archive: "ASI Epigraphia Indica Vol IX",
    licence: "CC-BY-4.0",
    license: "CC-BY-4.0",
    attribution: "ASI Western Circle",
    storage_key: "/data/documents/doc-test-1",
    original_filename: "rani_vav_inscription.png",
    mime: "image/png",
    page_count: 1,
    created_at: new Date().toISOString(),
    entities: [],
    pages: [
      {
        id: "p1",
        document_id: "doc-test-1",
        page_no: 1,
        page_number: 1,
        image_key: "/data/documents/doc-test-1/page_1.png",
        image_url: "/data/documents/doc-test-1/page_1.png",
        width: 1200,
        height: 1600,
        rotation_deg: 0,
        status: "ready",
        entities: [],
        ocr_lines: [
          {
            id: "line-1",
            page_id: "p1",
            line_no: 1,
            line_index: 1,
            text: "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय",
            bbox_x: 0.1,
            bbox_y: 0.1,
            bbox_w: 0.8,
            bbox_h: 0.05,
            confidence: 0.98,
            lang: "hi",
            language: "Devanagari",
            engine: "fake_ocr",
            version: 1,
            is_corrected: false,
            translations: [],
          },
          {
            id: "line-2",
            page_id: "p1",
            line_no: 2,
            line_index: 2,
            text: "संवत् १०६३ वर्षे सरस्वती नद्याः तीरे सप्तभूमियुता वापी प्रतिष्ठिता",
            bbox_x: 0.1,
            bbox_y: 0.18,
            bbox_w: 0.8,
            bbox_h: 0.05,
            confidence: 0.96,
            lang: "hi",
            language: "Devanagari",
            engine: "fake_ocr",
            version: 1,
            is_corrected: false,
            translations: [],
          },
          {
            id: "line-3",
            page_id: "p1",
            line_no: 3,
            line_index: 3,
            text: "दशावतार विष्णुपूजनार्थं स्थापत्यकला निपुणैः शिल्पिभिः निर्मिता [क्षीण पाठ]",
            bbox_x: 0.1,
            bbox_y: 0.26,
            bbox_w: 0.8,
            bbox_h: 0.05,
            confidence: 0.78, // Low confidence to test quality warning
            lang: "hi",
            language: "Devanagari",
            engine: "fake_ocr",
            version: 1,
            is_corrected: false,
            translations: [],
          },
        ],
        translations: [
          {
            id: "tr-1",
            line_id: "line-1",
            page_id: "p1",
            target_lang: "en",
            text: "Om, Hail! For the construction of the stepwell (vapi) by Queen Udayamati of the Solanki (Chaulukya) dynasty in Patan.",
            engine: "gemini",
            version: 1,
          },
          {
            id: "tr-2",
            line_id: "line-2",
            page_id: "p1",
            target_lang: "en",
            text: "In the Vikrama year 1063, on the banks of river Saraswati, this seven-tiered stepwell was consecrated.",
            engine: "gemini",
            version: 1,
          },
          {
            id: "tr-3",
            line_id: "line-3",
            page_id: "p1",
            target_lang: "en",
            text: "Erected for Dashavatara Vishnu worship by master subterranean architects [weathered section].",
            engine: "gemini",
            version: 1,
          },
        ],
      },
    ],
    site: {
      id: "site-1",
      slug: "rani-ki-vav",
      name: "Rani ki Vav (The Queen's Stepwell)",
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders the three panes and displays the quality review banner for low confidence lines", () => {
    render(<DocumentViewer initialDocument={mockDocument} />);

    // Header title
    expect(screen.getByText("Rani ki Vav Sanskrit Foundation Folio")).toBeInTheDocument();

    // Quality banner
    expect(screen.getByText(/Quality Flag:/i)).toBeInTheDocument();
    expect(screen.getByText(/1 OCR lines exhibit low confidence/i)).toBeInTheDocument();

    // Transcript text
    expect(
      screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय")
    ).toBeInTheDocument();

    // Translation text
    expect(
      screen.getByText(/For the construction of the stepwell \(vapi\) by Queen Udayamati/i)
    ).toBeInTheDocument();
  });

  it("highlights the corresponding transcript and translation line when clicked", () => {
    render(<DocumentViewer initialDocument={mockDocument} />);

    const line1 = screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय");
    fireEvent.click(line1);

    // Edit button appears when selected
    const editBtn = screen.getByTitle("Edit Line (Key: e)");
    expect(editBtn).toBeInTheDocument();
  });

  it("handles inline human-in-the-loop editing with optimistic UI update", async () => {
    (apiClient.patchOCRLine as any).mockResolvedValueOnce({
      id: "line-1",
      page_id: "p1",
      line_no: 1,
      text: "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय [सत्यापित पाठ]",
      confidence: 1.0,
      version: 2,
      is_corrected: true,
    });

    const { container } = render(<DocumentViewer initialDocument={mockDocument} />);

    // Click line to select
    const line1 = screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय");
    fireEvent.click(line1);

    // Click edit button
    const editBtn = screen.getByTitle("Edit Line (Key: e)");
    fireEvent.click(editBtn);

    // Textarea is rendered
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Change text and click save
    fireEvent.change(textarea, {
      target: { value: "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय [सत्यापित पाठ]" },
    });

    const saveBtn = screen.getByText(/Save \[Ctrl\+Enter\]/i);
    fireEvent.click(saveBtn);

    // Verify optimistic UI update
    await waitFor(() => {
      expect(
        screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय [सत्यापित पाठ]")
      ).toBeInTheDocument();
    });

    // API was called with parameters
    expect(apiClient.patchOCRLine).toHaveBeenCalledWith(
      "line-1",
      "ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय [सत्यापित पाठ]",
      "Human transcription review",
      "human_epigraphist"
    );
  });

  it("rolls back optimistic edit if the server patch fails", async () => {
    (apiClient.patchOCRLine as any).mockRejectedValueOnce(new Error("Database connection timeout"));

    const { container } = render(<DocumentViewer initialDocument={mockDocument} />);

    // Click line to select
    const line1 = screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय");
    fireEvent.click(line1);

    // Click edit button
    const editBtn = screen.getByTitle("Edit Line (Key: e)");
    fireEvent.click(editBtn);

    // Change text and save
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Tentative edit that will fail" },
    });

    const saveBtn = screen.getByText(/Save \[Ctrl\+Enter\]/i);
    fireEvent.click(saveBtn);

    // Rollback: original text should be restored after failure
    await waitFor(() => {
      expect(
        screen.getByText("ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय")
      ).toBeInTheDocument();
    });
  });
});
