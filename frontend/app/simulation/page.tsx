import { Metadata } from "next";
import { SimulationManager } from "@/components/simulation/SimulationManager";

export const metadata: Metadata = {
  title: "Flight Operations Simulation | AI Airport Operations",
  description:
    "Interactive time-driven simulation of global flight operations, real-time aircraft trajectory movements, and arrival/departure lifecycle transitions.",
};

export default function SimulationPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <SimulationManager />
    </div>
  );
}
