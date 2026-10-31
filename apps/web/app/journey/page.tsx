import React from "react";
import { fetchRouteBySlug, TravelRoute } from "@/lib/api";
import { JourneyMode } from "@/components/JourneyMode";

export const revalidate = 0;

export default async function JourneyPage() {
  let route: TravelRoute | null = null;
  try {
    route = await fetchRouteBySlug("royal-stepwells-desert-fortresses");
  } catch (err) {
    console.error("Failed to load journey route:", err);
  }

  if (!route) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-8 text-center text-[#D8C3A5]">
        <p>Route data is currently loading from the backend...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <JourneyMode route={route} />
    </div>
  );
}
