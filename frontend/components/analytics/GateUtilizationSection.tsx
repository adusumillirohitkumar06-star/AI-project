"use client";

import React from "react";
import { GateUtilization } from "@/types/analytics";

interface GateUtilizationSectionProps {
  gateUtilization: GateUtilization | null;
  isLoading: boolean;
}

export function GateUtilizationSection({
  gateUtilization,
  isLoading,
}: GateUtilizationSectionProps) {
  if (isLoading || !gateUtilization) {
    return (
      <div className="h-64 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800" />
    );
  }

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const gates = gateUtilization.gates || [];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-4">
      {/* Header and Capacity Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-2">
            <span>Gate Capacity & Utilization Analytics</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-normal">
              {gateUtilization.overall_utilization_percentage}% Fleet Utilization
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Physical gate occupancy derived strictly from arrival &rarr; departure windows ({formatMinutes(gateUtilization.total_occupied_minutes)} total occupied).
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded border border-zinc-200/60 dark:border-zinc-800">
          Formula: <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Occupied Time / Available Window</span>
        </div>
      </div>

      {gates.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400 italic font-mono">
          No gates found matching the selected airport or terminal filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2.5">Gate</th>
                <th className="px-3 py-2.5">Terminal</th>
                <th className="px-3 py-2.5">Airport</th>
                <th className="px-3 py-2.5">Max Aircraft Size</th>
                <th className="px-3 py-2.5 text-right">Flights</th>
                <th className="px-3 py-2.5 text-right">Occupied Time</th>
                <th className="px-3 py-2.5 w-48">Utilization %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {gates.map((g) => {
                const util = g.utilization_percentage;
                const barColor =
                  util >= 75
                    ? "bg-rose-500"
                    : util >= 50
                    ? "bg-amber-500"
                    : "bg-blue-500";

                return (
                  <tr
                    key={g.gate_id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                  >
                    <td className="px-3 py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {g.gate_code}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {g.terminal_code}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {g.airport_code}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-zinc-500">
                      {g.max_aircraft_size.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                      {g.flight_count}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                      {formatMinutes(g.occupied_minutes)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(100, util)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          {util}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
