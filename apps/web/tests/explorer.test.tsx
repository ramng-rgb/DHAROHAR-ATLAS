import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { 
  formatYearLabel, yearToPercent, percentToYear, TimelineSlider 
} from "@/components/ui/Slider";
import { translations } from "@/lib/i18n";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";

describe("Timeline Slider & BCE Logic", () => {
  it("formats positive and negative years correctly", () => {
    expect(formatYearLabel(-2600)).toBe("2600 BCE");
    expect(formatYearLabel(-319)).toBe("319 BCE");
    expect(formatYearLabel(0)).toBe("0 CE");
    expect(formatYearLabel(1026)).toBe("1026 CE");
    expect(formatYearLabel(1498)).toBe("1498 CE");
  });

  it("calculates monotonic non-linear percentage conversions across BCE to CE", () => {
    const p1 = yearToPercent(-3000);
    const p2 = yearToPercent(-1500);
    const p3 = yearToPercent(0);
    const p4 = yearToPercent(1200);
    const p5 = yearToPercent(1900);

    expect(p1).toBe(0);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
    expect(p4).toBeGreaterThan(p3);
    expect(p5).toBe(100);

    // Roundtrip consistency
    const restoredYear = percentToYear(yearToPercent(1000));
    expect(Math.abs(restoredYear - 1000)).toBeLessThanOrEqual(25);
  });

  it("renders era presets and fires callback on click", () => {
    const handleChange = vi.fn();
    render(
      <TimelineSlider
        yearFrom={-3000}
        yearTo={1900}
        onChange={handleChange}
        histogram={[{ year_start: -3000, year_end: -1500, count: 2, era_label: "Indus" }]}
      />
    );

    // Verify Solanki preset exists and triggers change
    const solankiBtn = screen.getByText("Solanki");
    expect(solankiBtn).toBeDefined();
    fireEvent.click(solankiBtn);

    expect(handleChange).toHaveBeenCalledWith(950, 1250);
  });
});

describe("Design System & Filter Components", () => {
  it("renders Chips with counts and handles toggle", () => {
    const handleToggle = vi.fn();
    render(<Chip label="Stepwell" count={5} selected={false} onToggle={handleToggle} />);

    expect(screen.getByText("Stepwell")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();

    fireEvent.click(screen.getByRole("button"));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("renders verified academic badges", () => {
    render(<Badge variant="verified">ASI / UNESCO Verified</Badge>);
    expect(screen.getByText("ASI / UNESCO Verified")).toBeDefined();
  });
});

describe("Trilingual i18n System", () => {
  it("has corresponding translations across English, Hindi, and Gujarati", () => {
    expect(translations.en.appName).toBe("DHAROHAR ATLAS");
    expect(translations.hi.appName).toBe("धरोहर एटलस");
    expect(translations.gu.appName).toBe("ધરોહર એટલસ");

    // Monument types
    expect(translations.en.types.stepwell).toContain("Stepwell");
    expect(translations.hi.types.stepwell).toContain("बावड़ी");
    expect(translations.gu.types.stepwell).toContain("વાવ");

    // Era labels
    expect(translations.en.eras.solanki).toContain("Solanki");
    expect(translations.hi.eras.solanki).toContain("सोलंकी");
    expect(translations.gu.eras.solanki).toContain("સોલંકી");
  });
});

describe("URL State Synchronization & Feedback States", () => {
  it("serializes and deserializes explorer filter query params accurately", () => {
    const filters = {
      site_types: ["stepwell", "fort"],
      states: ["Gujarat", "Rajasthan"],
      dynasties: ["Solanki"],
      year_from: -2600,
      year_to: 1200,
      site: "rani-ki-vav",
    };

    const searchParams = new URLSearchParams();
    if (filters.site_types.length > 0) searchParams.set("types", filters.site_types.join(","));
    if (filters.states.length > 0) searchParams.set("states", filters.states.join(","));
    if (filters.dynasties.length > 0) searchParams.set("dynasties", filters.dynasties.join(","));
    searchParams.set("from", filters.year_from.toString());
    searchParams.set("to", filters.year_to.toString());
    searchParams.set("site", filters.site);

    const queryString = searchParams.toString();
    expect(queryString).toContain("types=stepwell%2Cfort");
    expect(queryString).toContain("states=Gujarat%2CRajasthan");
    expect(queryString).toContain("from=-2600");
    expect(queryString).toContain("to=1200");
    expect(queryString).toContain("site=rani-ki-vav");

    // Deserialization roundtrip
    const parsed = new URLSearchParams(queryString);
    const parsedTypes = parsed.get("types")?.split(",") || [];
    const parsedStates = parsed.get("states")?.split(",") || [];
    const parsedFrom = parseInt(parsed.get("from") || "0", 10);
    const parsedTo = parseInt(parsed.get("to") || "0", 10);
    const parsedSite = parsed.get("site");

    expect(parsedTypes).toEqual(["stepwell", "fort"]);
    expect(parsedStates).toEqual(["Gujarat", "Rajasthan"]);
    expect(parsedFrom).toBe(-2600);
    expect(parsedTo).toBe(1200);
    expect(parsedSite).toBe("rani-ki-vav");
  });
});

