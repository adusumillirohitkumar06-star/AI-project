"use client";

import React from "react";
import { ReschedulingAnalytics } from "@/types/analytics";

interface ReschedulingSectionProps {
  reschedulingAnalytics: ReschedulingAnalytics | null;
  isLoading: boolean;
}

export function ReschedulingSection({
  reschedulingAnalytics,
  isLoading,
}: ReschedulingSectionProps) {
  if (isLoading || !reschedulingAnalytics) {
    return (
      <div className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800" />
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Dynamic Rescheduling & Live Operations
        </h3>
        <span className="text-[11px] text-zinc-400">
          Simulation & Operational Delay Triggers
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase">Reschedule Events</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {reschedulingAnalytics.total_reschedule_events}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase">Delays Applied</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {reschedulingAnalytics.delays_applied}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase">Gates Reassigned</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {reschedulingAnalytics.reassignments_succeeded}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase">Conflicts Resolved</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {reschedulingAnalytics.conflicts_resolved}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase">Flights Affected</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {reschedulingAnalytics.affected_flights_count}
          </div>
        </div>
      </div>
    </div>
  );
}
