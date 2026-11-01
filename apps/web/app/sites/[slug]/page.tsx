import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, type SiteFullDetail, type Model3DDetail } from "@/lib/api-client";
import { SitePageClient } from "@/components/site/SitePageClient";

interface PageProps {
  params: { slug: string };
}

// Generate dynamic OpenGraph, Twitter, and SEO Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const site = await api.getSiteFull(params.slug);
    const title = `${site.name} — 3D Digital Twin & Heritage Monograph | Dharohar Atlas`;
    const description =
      site.summary ||
      `Explore ${site.name} in ${site.district || ""}, ${site.state}. Interactive 3D photogrammetric twin, architectural hotspots, historical folklore and archival survey.`;
    const ogImage = site.hero_image || "/og-image.jpg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://dharohar-atlas.org/sites/${site.slug}`,
        siteName: "Dharohar Atlas",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: site.name,
          },
        ],
        type: "article",
        locale: "en_IN",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: `/sites/${site.slug}`,
      },
    };
  } catch {
    return {
      title: "Monument Dossier | Dharohar Atlas",
      description: "Explore India's tangible cultural heritage through interactive 3D digital twins and archival surveys.",
    };
  }
}

export const revalidate = 60; // ISR cache revalidation every minute

export default async function SiteDetailPage({ params }: PageProps) {
  let site: SiteFullDetail;
  let model: Model3DDetail | null = null;

  try {
    site = await api.getSiteFull(params.slug);
  } catch (err) {
    notFound();
  }

  if (!site) {
    notFound();
  }

  // If the site has a 3D model, fetch the model detail and hotspots
  if (site.has_3d_model) {
    try {
      model = await api.getSiteModel(params.slug);
    } catch (e) {
      console.warn(`Could not fetch 3D model for ${params.slug}:`, e);
      model = null;
    }
  }

  // Build JSON-LD Schema.org TouristAttraction / Place
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Place", "TouristAttraction", "HistoricalLandmark"],
    "name": site.name,
    "alternateName": [site.name_hi, site.name_gu, ...(site.alternative_names || [])].filter(Boolean),
    "description": site.description || site.summary,
    "image": site.hero_image,
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": site.latitude,
      "longitude": site.longitude,
    },
    "address": {
      "@type": "PostalAddress",
      "addressRegion": site.state,
      "addressLocality": site.district,
      "addressCountry": "IN",
    },
    "hasMap": `https://dharohar-atlas.org/explore?site=${site.slug}&lat=${site.latitude}&lng=${site.longitude}`,
    "isAccessibleForFree": true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SitePageClient site={site} model={model} />
    </>
  );
}
