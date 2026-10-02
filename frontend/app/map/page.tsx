import { Metadata } from "next";
import { MapManager } from "@/components/map/MapManager";

export const metadata: Metadata = {
  title: "Airspace & Route Network Map | AI Airport Operations",
  description:
    "Interactive real-time geospatial visualization of global airport hubs, great-circle flight trajectories, and operational aircraft positions.",
};

export default function MapPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <MapManager />
    </div>
  );
}
