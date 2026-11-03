import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { JourneyPlayer } from "../components/journey/JourneyPlayer";
import { DemoTourOverlay, triggerDemoTour } from "../components/demo/DemoTourOverlay";
import { JourneyDetail } from "../lib/api";

// Mock MapLibre GL
vi.mock("maplibre-gl", () => {
  function MockMap(this: any) {
    this.on = vi.fn();
    this.remove = vi.fn();
    this.flyTo = vi.fn();
    this.jumpTo = vi.fn();
    this.addSource = vi.fn();
    this.getSource = vi.fn().mockReturnValue({ setData: vi.fn() });
    this.addLayer = vi.fn();
  }
  function MockMarker(this: any) {
    this.setLngLat = vi.fn().mockReturnThis();
    this.addTo = vi.fn().mockReturnThis();
    this.remove = vi.fn();
    this.getElement = vi.fn().mockReturnValue(document.createElement("div"));
  }
  return {
    default: {
      Map: MockMap,
      Marker: MockMarker,
    },
  };
});

// Mock Next.js navigation
const mockPush = vi.fn();
let currentPathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => new URLSearchParams("stop=1"),
  usePathname: () => currentPathname
}));

// Mock demo script API
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual("@/lib/api");
  return {
    ...actual,
    fetchDemoScript: vi.fn().mockResolvedValue({
      title: "Dharohar Atlas Evaluation Tour",
      description: "Curated 9-step path",
      total_steps: 9,
      steps: [
        {
          id: 1,
          title: "1. Welcome & Cinematic Hero",
          caption: "Observe live counters",
          route: "/",
          target_selector: "#hero-explore-atlas-btn",
          action_type: "navigate"
        },
        {
          id: 2,
          title: "2. Geospatial Explorer",
          caption: "Filter monuments",
          route: "/explore",
          target_selector: "#explore-play-journey-button",
          action_type: "filter"
        }
      ]
    })
  };
});

const sampleJourney: JourneyDetail = {
  id: "j-001",
  slug: "gujarat-stepwell-trail",
  title: "Gujarat Stepwell & Water Architecture Trail",
  title_hi: "गुजरात वाव एवं जल स्थापत्य यात्रा",
  title_gu: "ગુજરાત વાવ અને જળ સ્થાપત્ય યાત્રા",
  summary: "485 km overland expedition exploring subterranean water sanctuaries.",
  difficulty: "Moderate",
  total_distance_km: 485.2,
  estimated_duration_days: 4,
  full_geometry: {
    type: "LineString",
    coordinates: [
      [72.58, 23.16],
      [72.60, 23.03],
      [72.10, 23.83]
    ]
  },
  total_stops: 3,
  stops: [
    {
      id: "stop-1",
      site_id: "site-adalaj",
      site_slug: "adalaj-vav",
      site_name: "Adalaj Stepwell (Rudabai Vav)",
      site_name_hi: "अडालज की वाव",
      site_name_gu: "અડાલજ ની વાવ",
      site_type: "stepwell",
      state: "Gujarat",
      district: "Gandhinagar",
      latitude: 23.1667,
      longitude: 72.58,
      era_label: "Solanki Era (1498 CE)",
      stop_order: 1,
      arrival_note: "Begin at Adalaj Stepwell at dawn. Five-tier subterranean sandstone sanctuary.",
      arrival_note_source: "Archaeological Survey of India Gazette",
      is_illustrative: false,
      dwell_seconds: 10,
      hero_media: {
        url: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1",
        attribution: "ASI Survey Archives",
        licence: "CC-BY-4.0"
      },
      has_3d_model: false,
      linked_folklore: [
        {
          id: "folk-1",
          title: "Queen Rudabai's Vow",
          body_md: "Oral tradition narrates the tragic devotion of Rani Rudabai.",
          kind: "legend",
          source: "Patan Oral Folk Archives"
        }
      ],
      linked_observations: [],
      linked_documents: [
        {
          id: "doc-1",
          title: "Adalaj Inscription Tablet",
          doc_type: "epigraph",
          page_count: 1
        }
      ],
      leg_distance_km: 0.0,
      cumulative_distance_km: 0.0,
      bearing_deg: 160.5
    },
    {
      id: "stop-2",
      site_id: "site-dada",
      site_slug: "dada-harir-stepwell",
      site_name: "Dada Harir Stepwell",
      site_name_hi: "दादा हरीर वाव",
      site_name_gu: "દાદા હરીર વાવ",
      site_type: "stepwell",
      state: "Gujarat",
      latitude: 23.0333,
      longitude: 72.60,
      era_label: "Gujarat Sultanate (1499 CE)",
      stop_order: 2,
      arrival_note: "Travel 15 km south to Asarwa. Octagonal well shaft with Sanskrit and Arabic inscriptions.",
      arrival_note_source: "Epigraphia Indo-Moslemica",
      is_illustrative: false,
      dwell_seconds: 12,
      hero_media: {
        url: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1",
        attribution: "Ahmedabad Municipal Archives",
        licence: "CC-BY-4.0"
      },
      has_3d_model: false,
      linked_folklore: [],
      linked_observations: [],
      linked_documents: [],
      leg_distance_km: 15.2,
      cumulative_distance_km: 15.2,
      bearing_deg: 325.2
    },
    {
      id: "stop-3",
      site_id: "site-rani",
      site_slug: "rani-ki-vav",
      site_name: "Rani ki Vav (The Queen's Stepwell)",
      site_name_hi: "रानी की वाव",
      site_name_gu: "રાણી ની વાવ",
      site_type: "stepwell",
      state: "Gujarat",
      district: "Patan",
      latitude: 23.8589,
      longitude: 72.1017,
      era_label: "Solanki Golden Age (1063 CE)",
      stop_order: 3,
      arrival_note: "The pinnacle of inverted temple architecture. 7 subterranean tiers adorned with over 500 principal sculptures.",
      arrival_note_source: "UNESCO World Heritage Inscription Dossier",
      is_illustrative: true,
      dwell_seconds: 15,
      hero_media: {
        url: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1",
        attribution: "UNESCO Archives",
        licence: "CC-BY-4.0"
      },
      has_3d_model: true,
      model_3d_id: "model-rani-3d",
      linked_folklore: [],
      linked_observations: [
        {
          id: "obs-1",
          title: "Level 4 Cantilevered Pillars",
          body_md: "Corbelled sandstone architraves displaying Maru-Gurjara style.",
          kind: "architectural"
        }
      ],
      linked_documents: [],
      leg_distance_km: 110.5,
      cumulative_distance_km: 125.7,
      bearing_deg: 0.0
    }
  ]
};

describe("M5: JourneyPlayer State Machine & Pacing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stop 1 details, hero image attribution, and arrival note", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    expect(screen.getByText("Adalaj Stepwell (Rudabai Vav)")).toBeInTheDocument();
    expect(screen.getAllByText(/Begin at Adalaj Stepwell at dawn/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ASI Survey Archives/i)).toBeInTheDocument();
    expect(screen.getByText("Stop 1 of 3")).toBeInTheDocument();
  });

  it("advances to next stop on Next button click and updates story card", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    const nextBtn = screen.getByLabelText("Next Stop");
    fireEvent.click(nextBtn);

    expect(screen.getByText("Dada Harir Stepwell")).toBeInTheDocument();
    expect(screen.getByText("Stop 2 of 3")).toBeInTheDocument();
    expect(screen.getAllByText(/Travel 15 km south to Asarwa/i).length).toBeGreaterThan(0);
  });

  it("toggles play/pause state and controls toolbar labels", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    const playBtn = screen.getByLabelText("Play Route");
    expect(screen.getByText("Animate Route")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(screen.getByText("Pause Route")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(screen.getByText("Animate Route")).toBeInTheDocument();
  });

  it("supports speed multiplier toggling (0.5x, 1x, 2x)", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    const speed2x = screen.getByLabelText("Playback speed 2x");
    fireEvent.click(speed2x);
    expect(speed2x).toHaveClass("bg-[#D4AF37]");
  });

  it("renders 3D model action button when stop has 3D asset", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    // Jump to stop 3 (Rani ki Vav)
    const nextBtn = screen.getByLabelText("Next Stop");
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    expect(screen.getByText("Rani ki Vav (The Queen's Stepwell)")).toBeInTheDocument();
    expect(screen.getByText("Inspect 3D Twin")).toBeInTheDocument();
    expect(screen.getByText("Illustrative sample")).toBeInTheDocument();
  });

  it("toggles accessible plain text version with ordered list", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="en" />);

    const textToggle = screen.getByLabelText("Text Version");
    fireEvent.click(textToggle);

    expect(screen.getByTestId("journey-text-version")).toBeInTheDocument();
    const orderedList = screen.getByLabelText("Heritage trail stops list");
    expect(orderedList).toBeInTheDocument();
    expect(screen.getByText("Adalaj Inscription Tablet")).toBeInTheDocument();
  });

  it("renders localized Devanagari names when locale is Hindi", () => {
    render(<JourneyPlayer journey={sampleJourney} locale="hi" />);

    expect(screen.getByText("अडालज की वाव")).toBeInTheDocument();
    expect(screen.getByText("गुजरात वाव एवं जल स्थापत्य यात्रा")).toBeInTheDocument();
  });
});

describe("M5: DemoTourOverlay Reducer & Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders first-run intro modal when unvisited", () => {
    render(<DemoTourOverlay />);
    expect(screen.getByText("Welcome to Dharohar Atlas")).toBeInTheDocument();
    expect(screen.getByText("Launch 9-Step Guided Demo")).toBeInTheDocument();
  });

  it("dismisses intro and launches tour when clicking launch button", async () => {
    render(<DemoTourOverlay />);

    const launchBtn = screen.getByText("Launch 9-Step Guided Demo");
    fireEvent.click(launchBtn);

    expect(localStorage.getItem("dharohar_demo_intro_dismissed")).toBe("1");
    expect(screen.queryByText("Welcome to Dharohar Atlas")).not.toBeInTheDocument();
  });

  it("starts demo mode and transitions steps", async () => {
    render(<DemoTourOverlay />);

    // Trigger demo tour via event
    triggerDemoTour(0);

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByText("Next");
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 2/i)).toBeInTheDocument();
    });
  });
});
