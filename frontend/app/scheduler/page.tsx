import { Metadata } from "next";
import { SchedulerManager } from "@/components/scheduler/SchedulerManager";

export const metadata: Metadata = {
  title: "AI CSP Scheduler | Gate Allocation Simulator",
  description:
    "Interactive AI Constraint Satisfaction Problem (CSP) solver interface for automated airport gate assignment.",
};

export default function SchedulerPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <SchedulerManager />
    </div>
  );
}
