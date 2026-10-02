"use client";

import React from "react";
import { FlightAnalytics } from "@/types/analytics";

interface FlightDistributionChartsProps {
  flightAnalytics: FlightAnalytics | null;
  isLoading: boolean;
}

export function FlightDistributionCharts({
  flightAnalytics,
  isLoading,
}: FlightDistributionChartsProps) {
  if (isLoading || !flightAnalytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800"
          />
        ))}
      </div>
    );
  }

  const total = flightAnalytics.total_flights;

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-500",
    BOARDING: "bg-indigo-500",
    DEPARTED: "bg-cyan-500",
    IN_AIR: "bg-emerald-500",
    APPROACHING: "bg-teal-500",
    LANDED: "bg-amber-500",
    AT_GATE: "bg-purple-500",
    DELAYED: "bg-rose-500",
    CANCELLED: "bg-zinc-500",
    COMPLETED: "bg-green-600",
  };

  const priorityColors: Record<string, string> = {
    NORMAL: "bg-zinc-400",
    VIP: "bg-purple-500",
    MEDICAL: "bg-amber-500",
    EMERGENCY: "bg-rose-500",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Status Distribution */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Flights by Lifecycle Status
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            {total} flights
          </span>
        </div>

        {total === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 italic font-mono">
            No flight data for selected filters.
          </div>
        ) : (
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(flightAnalytics.by_status)
              .filter(([_, count]) => count > 0)
              .map(([status, count]) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                const color = statusColors[status] || "bg-blue-500";
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {status.replace(/_/g, " ")}
                      </span>
                      <span className="text-zinc-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 2. Priority Distribution */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Operational Priority
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            CSP Scheduling Weight
          </span>
        </div>

        {total === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 italic font-mono">
            No flight data available.
          </div>
        ) : (
          <div className="space-y-2.5 text-xs font-mono">
            {Object.entries(flightAnalytics.by_priority).map(([priority, count]) => {
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
              const color = priorityColors[priority] || "bg-zinc-400";
              return (
                <div key={priority} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {priority}
                    </span>
                    <span className="text-zinc-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Delay Breakdown by Reason */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Delay Analysis & Root Causes
          </h3>
          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
            {flightAnalytics.delay_summary.delayed_count} delayed
          </span>
        </div>

        {flightAnalytics.delay_summary.delayed_count === 0 ? (
          <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 italic font-mono">
            ✓ Zero flight delays in current operations.
          </div>
        ) : (
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 flex justify-between">
              <span>Total Delay: {flightAnalytics.delay_summary.total_delay_minutes} min</span>
              <span>Avg: {flightAnalytics.delay_summary.avg_delay_minutes} min</span>
            </div>

            <div className="space-y-1.5 pt-1">
              {Object.entries(flightAnalytics.delay_summary.by_reason).map(
                ([reason, count]) => {
                  const delTotal = flightAnalytics.delay_summary.delayed_count;
                  const pct = delTotal > 0 ? ((count / delTotal) * 100).toFixed(0) : "0";
                  return (
                    <div key={reason} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {reason.replace(/_/g, " ")}
                        </span>
                        <span className="text-zinc-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
