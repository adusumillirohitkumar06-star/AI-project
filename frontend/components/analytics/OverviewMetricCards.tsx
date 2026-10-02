"use client";

import React from "react";
import { AnalyticsOverview } from "@/types/analytics";

interface OverviewMetricCardsProps {
  overview: AnalyticsOverview | null;
  isLoading: boolean;
}

export function OverviewMetricCards({
  overview,
  isLoading,
}: OverviewMetricCardsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800"
          />
        ))}
      </div>
    );
  }

  const assignedRate =
    overview.total_flights > 0
      ? ((overview.assigned_flights / overview.total_flights) * 100).toFixed(1)
      : "0.0";

  const solverSuccessRate =
    overview.total_solver_runs > 0
      ? (
          (overview.successful_solver_runs / overview.total_solver_runs) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Total Flights */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          Total Flights
        </span>
        <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {overview.total_flights}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {overview.assigned_flights} assigned
          </span>{" "}
          ({assignedRate}%)
        </div>
      </div>

      {/* 2. Gate Utilization */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          Gates Inventory
        </span>
        <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
          {overview.gates_used} / {overview.total_gates}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          {overview.total_gates > 0
            ? `${((overview.gates_used / overview.total_gates) * 100).toFixed(0)}% gates active`
            : "No gates"}
        </div>
      </div>

      {/* 3. Active Conflicts */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          Active Conflicts
        </span>
        <div
          className={`text-2xl font-mono font-bold ${
            overview.active_conflicts > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {overview.active_conflicts}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          {overview.active_conflicts === 0 ? "Zero open violations" : "Requires resolution"}
        </div>
      </div>

      {/* 4. Delays */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          Delayed Flights
        </span>
        <div
          className={`text-2xl font-mono font-bold ${
            overview.delayed_flights > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {overview.delayed_flights}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          {overview.delayed_flights > 0
            ? `Avg ${overview.avg_delay_minutes}m (Max ${overview.max_delay_minutes}m)`
            : "No active delays"}
        </div>
      </div>

      {/* 5. Solver Runs */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          CSP Solver Runs
        </span>
        <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
          {overview.total_solver_runs}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {overview.successful_solver_runs} success
          </span>{" "}
          ({solverSuccessRate}%)
        </div>
      </div>
    </div>
  );
}
