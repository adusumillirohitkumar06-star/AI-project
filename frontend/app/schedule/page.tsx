import { Metadata } from "next";
import { ScheduleManager } from "@/components/schedule/ScheduleManager";

export const metadata: Metadata = {
  title: "Gantt Schedule & Gate Occupancy | AI Airport Operations",
  description:
    "Interactive airport operations timeline visualizing real flight-to-gate schedule allocations, terminal topologies, and operational conflicts.",
};

export default function SchedulePage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ScheduleManager />
    </div>
  );
}
