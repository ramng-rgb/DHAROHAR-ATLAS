import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CiteModal } from "@/components/site/CiteModal";
import { HotspotTourDrawer } from "@/components/viewer3d/HotspotTourDrawer";
import { HotspotAriaList } from "@/components/viewer3d/HotspotAriaList";
import { FolkloreObservationsSection } from "@/components/site/FolkloreObservationsSection";
import type { HotspotDetail } from "@/lib/api-client";

describe("CiteModal Component", () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("format=bibtex")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`@misc{ranikivav_heritage,\n  title = {Rani ki Vav},\n  year = {1063}\n}`),
        });
      }
      if (url.includes("format=apa")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`Archaeological Survey of India. (1063). Rani ki Vav [Data set]. Dharohar Atlas.`),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`TY  - DATA\nTI  - Rani ki Vav\nER  -`),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders when open and loads BibTeX citation by default", async () => {
    render(
      <CiteModal
        slug="rani-ki-vav"
        siteName="Rani ki Vav"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Cite This Heritage Record")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/@misc{ranikivav_heritage/)).toBeDefined();
    });
  });

  it("switches format tabs and loads APA citation", async () => {
    render(
      <CiteModal
        slug="rani-ki-vav"
        siteName="Rani ki Vav"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const apaTab = screen.getByText(/apa/i);
    fireEvent.click(apaTab);

    await waitFor(() => {
      expect(screen.getByText(/Archaeological Survey of India/)).toBeDefined();
    });
  });
});

describe("3D Hotspot Tour & Multilingual Logic", () => {
  const mockHotspots: HotspotDetail[] = [
    {
      id: "h1",
      model_id: "m1",
      label: "Sheshashayi Vishnu Relief",
      label_hi: "शेषशायी विष्णु नक्काशी",
      label_gu: "શેષશાયી વિષ્ણુ શિલ્પ",
      body_md: "High-relief carving of Vishnu reclining on Sheshanaga.",
      position: [0.2, 1.5, -2.1],
      camera_position: [0.2, 1.8, -0.5],
      camera_target: [0.2, 1.5, -2.1],
      sort_order: 1,
    },
    {
      id: "h2",
      model_id: "m1",
      label: "Fourth Tier Pillared Corridor",
      label_hi: "चौथा स्तर स्तम्भ गलियारा",
      label_gu: "ચોથો માળ સ્તંભયુક્ત પરસાળ",
      body_md: "Intricate brackets depicting Apsaras.",
      position: [-1.5, 0.4, 0.0],
      camera_position: [-1.5, 0.8, 1.5],
      camera_target: [-1.5, 0.4, 0.0],
      sort_order: 2,
    },
  ];

  it("displays multilingual labels based on selected language", () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    const { rerender } = render(
      <HotspotTourDrawer
        hotspots={mockHotspots}
        activeHotspot={mockHotspots[0]}
        isOpen={true}
        onClose={handleClose}
        onSelectHotspot={handleSelect}
      />
    );

    // Default English
    expect(screen.getByText("Sheshashayi Vishnu Relief")).toBeDefined();

    // Switch to Hindi
    const hiBtn = screen.getByText("हिंदी");
    fireEvent.click(hiBtn);
    expect(screen.getByText("शेषशायी विष्णु नक्काशी")).toBeDefined();

    // Switch to Gujarati
    const guBtn = screen.getByText("ગુજરાતી");
    fireEvent.click(guBtn);
    expect(screen.getByText("શેષશાયી વિષ્ણુ શિલ્પ")).toBeDefined();
  });

  it("supports next/previous navigation stepper", () => {
    const handleSelect = vi.fn();
    render(
      <HotspotTourDrawer
        hotspots={mockHotspots}
        activeHotspot={mockHotspots[0]}
        isOpen={true}
        onClose={vi.fn()}
        onSelectHotspot={handleSelect}
      />
    );

    const nextBtn = screen.getByLabelText(/Next architectural hotspot/i);
    fireEvent.click(nextBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockHotspots[1]);
  });

  it("renders accessible keyboard list with aria-live updates", () => {
    const handleSelect = vi.fn();
    render(
      <HotspotAriaList
        hotspots={mockHotspots}
        activeHotspot={mockHotspots[0]}
        onSelectHotspot={handleSelect}
      />
    );

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBe(2);

    // Live region announcements
    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeDefined();
    expect(statusRegion.textContent).toContain("Sheshashayi Vishnu Relief");
  });
});

describe("Measurement Math & Scale Factor Unit Logic", () => {
  function calculateDistance(
    p1: [number, number, number],
    p2: [number, number, number],
    scaleFactor: number = 1.0
  ): { rawDistance: number; scaledMeters: number; formatted: string } {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const rawDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const scaledMeters = rawDistance * scaleFactor;
    return {
      rawDistance,
      scaledMeters,
      formatted: `${scaledMeters.toFixed(2)} m`,
    };
  }

  it("computes accurate 3D Euclidean distances and scales", () => {
    // 3-4-5 right triangle along X and Y axes
    const p1: [number, number, number] = [0, 0, 0];
    const p2: [number, number, number] = [3, 4, 0];

    const result = calculateDistance(p1, p2, 1.0);
    expect(result.rawDistance).toBeCloseTo(5.0);
    expect(result.scaledMeters).toBeCloseTo(5.0);
    expect(result.formatted).toBe("5.00 m");

    // With architectural scale calibration factor (e.g. 1 unit = 2.5 meters in real stepwell)
    const calibrated = calculateDistance(p1, p2, 2.5);
    expect(calibrated.scaledMeters).toBeCloseTo(12.5);
    expect(calibrated.formatted).toBe("12.50 m");
  });
});

describe("Folklore & Observation Badges", () => {
  const sampleFolklore = [
    {
      id: "f1",
      site_id: "s1",
      title: "Tunnel to Siddhpur Mystery",
      body_md: "Local tradition speaks of a 30 km secret escape passage.",
      language: "en",
      kind: "oral_history",
      source: "Patan Oral Heritage Circle",
      source_url: "https://example.org/oral-history",
      data_confidence: "likely",
      is_illustrative: false,
    },
    {
      id: "f2",
      site_id: "s1",
      title: "Mythic Origin of Well Waters",
      body_md: "Folktale describing sacred subterranean springs.",
      language: "gu",
      kind: "mythology",
      source: "Illustrative reconstruction",
      data_confidence: "conjectural",
      is_illustrative: true,
    },
  ];

  it("distinguishes verified traditions from illustrative samples", () => {
    render(
      <FolkloreObservationsSection
        folklore={sampleFolklore}
        observations={[]}
      />
    );

    expect(screen.getByText("Tunnel to Siddhpur Mystery")).toBeDefined();
    expect(screen.getByText("Verified Tradition")).toBeDefined();

    expect(screen.getByText("Mythic Origin of Well Waters")).toBeDefined();
    expect(screen.getByText("Illustrative sample")).toBeDefined();
  });
});
