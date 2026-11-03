import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchJourneyBySlug, fetchRoutes } from "@/lib/api";
import { JourneyPlayer } from "@/components/journey/JourneyPlayer";

interface JourneyPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: JourneyPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const journey = await fetchJourneyBySlug(slug);
    return {
      title: `${journey.title} | Dharohar Atlas Journeys`,
      description: journey.summary,
      openGraph: {
        title: journey.title,
        description: journey.summary,
        images: journey.cover_media_url ? [journey.cover_media_url] : undefined
      }
    };
  } catch {
    return {
      title: "Heritage Journey | Dharohar Atlas",
      description: "Interactive animated heritage trail route across historic monuments."
    };
  }
}

export default async function JourneySlugPage({ params }: JourneyPageProps) {
  const { slug } = await params;
  let journey = null;

  try {
    journey = await fetchJourneyBySlug(slug);
  } catch (err) {
    console.error(`Failed to load journey for slug '${slug}':`, err);
  }

  if (!journey) {
    notFound();
  }

  return (
    <main className="w-full flex-1 flex flex-col bg-[#090D16]" id="main-content">
      <JourneyPlayer journey={journey} />
    </main>
  );
}
