"use client";

import React from "react";
import { ConflictAnalytics } from "@/types/analytics";

interface ConflictAnalyticsSectionProps {
  conflictAnalytics: ConflictAnalytics | null;
  isLoading: boolean;
}

export function ConflictAnalyticsSection({
  conflictAnalytics,
  isLoading,
}: ConflictAnalyticsSectionProps) {
  if (isLoading || !conflictAnalytics) {
    return (
      <div className="h-56 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800" />
    );
  }

  const total = conflictAnalytics.total_conflicts;

  const severityColors: Record<string, string> = {
    LOW: "bg-blue-500",
    MEDIUM: "bg-amber-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-rose-600",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-2">
            <span>Operational Conflicts & Violation Diagnostics</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                conflictAnalytics.open_conflicts > 0
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {conflictAnalytics.open_conflicts} Open / {conflictAnalytics.resolved_conflicts} Resolved
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Breakdown of gate collisions, aircraft size mismatches, and timing constraints.
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 italic font-mono bg-emerald-50/40 dark:bg-emerald-950/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
          ✓ No operational conflicts or constraint violations recorded in the selected period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* By Type */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 space-y-2">
            <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Violations by Category
            </h4>
            <div className="space-y-1.5">
              {Object.entries(conflictAnalytics.by_type).map(([type, count]) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
                return (
                  <div key={type} className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Severity */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 space-y-2">
            <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Violations by Severity
            </h4>
            <div className="space-y-2">
              {Object.entries(conflictAnalytics.by_severity).map(([sev, count]) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
                const color = severityColors[sev] || "bg-amber-500";
                return (
                  <div key={sev} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {sev}
                      </span>
                      <span className="text-zinc-500 font-semibold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Occurrence Timeline / Dates */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 space-y-2">
            <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Conflict Detection Timeline
            </h4>
            {conflictAnalytics.timeline.length === 0 ? (
              <div className="py-4 text-center text-zinc-400 italic text-[11px]">
                No historical timestamps.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {conflictAnalytics.timeline.map((item) => (
                  <div
                    key={item.date_str}
                    className="flex items-center justify-between text-[11px] border-b border-zinc-200/50 dark:border-zinc-800 pb-1"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {item.date_str}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                      {item.count} conflicts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
