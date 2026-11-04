import React, { Suspense } from "react";
import { api, SiteBrief } from "@/lib/api-client";
import { MapExplorer } from "@/components/MapExplorer";

export const revalidate = 0;

export default async function ExplorePage() {
  let initialSites: SiteBrief[] = [];
  try {
    initialSites = await api.getSites({ limit: 100 });
  } catch (err) {
    console.error("Error loading initial sites for explorer:", err);
  }

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100dvh-73px)] max-h-[calc(100dvh-73px)] overflow-hidden">
      <Suspense fallback={<div className="p-8 text-indigoHeritage text-center">Loading Geospatial Explorer...</div>}>
        <MapExplorer initialSites={initialSites} />
      </Suspense>
    </div>
  );
}
