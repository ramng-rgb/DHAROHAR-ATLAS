import React from "react";
import { fetchSites, SiteBrief } from "@/lib/api";
import { MapExplorer } from "@/components/MapExplorer";

export const revalidate = 0;

export default async function ExplorerPage() {
  let sites: SiteBrief[] = [];
  try {
    sites = await fetchSites({ limit: 100 });
  } catch (err) {
    console.error("Error loading sites for explorer:", err);
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <MapExplorer initialSites={sites} />
    </div>
  );
}
