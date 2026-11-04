import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteGallery } from "@/components/site/SiteGallery";
import { SiteHero } from "@/components/site/SiteHero";
import type { components } from "@/lib/api-schema";
import type { SiteFullDetail } from "@/lib/api-client";

type SiteMediaResponse = components["schemas"]["SiteMediaResponse"];

describe("Photo Attribution & Licensing UI Enforcement", () => {
  it("renders image with visible attribution caption and license link", () => {
    const validMedia = [
      {
        id: "m-1",
        url: "/seed-images/rani-ki-vav/hero_1600.webp",
        thumbnail_url: "/seed-images/rani-ki-vav/hero_800.webp",
        media_type: "image",
        caption: "Rani ki Vav stepped corridor",
        attribution: "Photo: Snehrashmi, CC BY-SA 4.0 via Wikimedia Commons",
        license: "CC-BY-SA 4.0",
        license_url: "https://creativecommons.org/licenses/by-sa/4.0",
        source_url: "https://commons.wikimedia.org/wiki/File:Rani_ki_vav.jpg",
        is_placeholder: false,
        verified: true,
      },
    ] as any;

    render(<SiteGallery media={validMedia} siteName="Rani ki Vav" />);

    // Caption and attribution must be present in the document
    expect(screen.getByText("Photo: Snehrashmi, CC BY-SA 4.0 via Wikimedia Commons")).toBeDefined();
    expect(screen.getByText("CC-BY-SA 4.0")).toBeDefined();

    // License link must have valid href
    const licenseLink = screen.getByRole("link", { name: "CC-BY-SA 4.0" });
    expect(licenseLink.getAttribute("href")).toBe("https://creativecommons.org/licenses/by-sa/4.0");
  });

  it("does NOT render images that lack attribution (legal requirement)", () => {
    const missingAttributionMedia = [
      {
        id: "m-2",
        url: "/seed-images/uncredited_photo.jpg",
        media_type: "image",
        caption: "Uncredited photo",
        attribution: "", // Missing attribution
        license: "CC-BY-4.0",
        is_placeholder: false,
        verified: false,
      },
    ] as any;

    render(<SiteGallery media={missingAttributionMedia} siteName="Rani ki Vav" />);

    // Image must not be rendered into the gallery
    expect(screen.queryByAltText("Uncredited photo")).toBeNull();
    expect(
      screen.getByText("No verified licensed archive photographs catalogued for this monument.")
    ).toBeDefined();
  });

  it("shows Placeholder badge when site has placeholder image", () => {
    const dummySite = {
      id: "site-placeholder-1",
      slug: "sample-unphotographed-stepwell",
      name: "Sample Stepwell",
      site_type: "stepwell",
      state: "Gujarat",
      district: "Patan",
      latitude: 23.85,
      longitude: 72.1,
      period_start_year: 1050,
      period_end_year: 1100,
      era_label: "Solanki Era",
      data_confidence: "likely",
      hero_image: "http://placehold.co/600x400?text=Placeholder",
      hero_image_attribution: "Heritage Archives Placeholder",
      hero_image_license: "CC-BY-4.0",
      summary: "A stepwell awaiting photographic documentation.",
      description: "A stepwell awaiting photographic documentation.",
      has_3d_model: false,
      media: [],
      models_3d: [],
      folklore: [],
      observations: [],
      tags: [],
      dynasties: [],
    } as any;

    render(<SiteHero site={dummySite} onOpenCite={() => {}} />);

    // Placeholder badge must be visible
    expect(screen.getByText("Placeholder")).toBeDefined();
  });
});
