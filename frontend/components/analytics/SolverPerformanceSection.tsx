"use client";

import React from "react";
import { SolverPerformance } from "@/types/analytics";

interface SolverPerformanceSectionProps {
  solverPerformance: SolverPerformance | null;
  isLoading: boolean;
}

export function SolverPerformanceSection({
  solverPerformance,
  isLoading,
}: SolverPerformanceSectionProps) {
  if (isLoading || !solverPerformance) {
    return (
      <div className="h-64 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800" />
    );
  }

  const comparisons = solverPerformance.strategy_comparison || [];
  const runsHistory = solverPerformance.runs_history || [];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-2">
            <span>CSP AI Engine Performance & Strategy Telemetry</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-normal">
              {solverPerformance.total_runs} Total Executions
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Empirical runtime performance, node explorations, and backtrack frequencies recorded by the CSP solver.
          </p>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] uppercase text-zinc-400">Average Runtime</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {solverPerformance.avg_execution_time_ms.toFixed(1)} ms
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] uppercase text-zinc-400">Total Nodes Explored</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {solverPerformance.total_nodes_explored}
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] uppercase text-zinc-400">Total Backtracks</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {solverPerformance.total_backtracks}
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] uppercase text-zinc-400">Success Rate</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {solverPerformance.total_runs > 0
              ? `${((solverPerformance.successful_runs / solverPerformance.total_runs) * 100).toFixed(1)}%`
              : "0%"}
          </div>
        </div>
      </div>

      {/* Factual Strategy Comparison Table (No Ranking Labels) */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
          Empirical Strategy Comparison (Observed Measurements)
        </h4>

        {comparisons.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-400 italic font-mono border border-dashed border-zinc-200 dark:border-zinc-800 rounded">
            Not enough solver runs recorded for strategy comparison.
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3 py-2">Algorithm Strategy</th>
                  <th className="px-3 py-2 text-right">Runs</th>
                  <th className="px-3 py-2 text-right">Success Rate</th>
                  <th className="px-3 py-2 text-right">Avg Time (ms)</th>
                  <th className="px-3 py-2 text-right">Avg Nodes</th>
                  <th className="px-3 py-2 text-right">Avg Backtracks</th>
                  <th className="px-3 py-2 text-right">Avg Checks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {comparisons.map((c) => {
                  const succPct =
                    c.run_count > 0
                      ? `${((c.success_count / c.run_count) * 100).toFixed(0)}%`
                      : "0%";
                  const label =
                    c.strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION" ||
                    c.strategy === "BACKTRACKING_CONSTRAINT_PROPAGATION"
                      ? "Backtracking + AC-3 Constraint Propagation"
                      : "Standard Backtracking (DFS + MRV)";

                  return (
                    <tr
                      key={c.strategy}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {label}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                        {c.run_count}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {succPct}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        {c.avg_execution_time_ms.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                        {c.avg_nodes_explored.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                        {c.avg_backtracks.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                        {c.avg_constraint_checks.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Telemetry Data Points */}
      {runsHistory.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
            Recent Solver Executions ({runsHistory.length} recorded)
          </h4>
          <div className="max-h-44 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px] font-mono">
            {runsHistory.map((r) => (
              <div
                key={r.run_id}
                className="p-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    Run #{r.run_id}
                  </span>
                  <span className="text-zinc-500">
                    {r.strategy.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                  <span>{r.execution_time_ms.toFixed(1)} ms</span>
                  <span>{r.nodes_explored} nodes</span>
                  <span
                    className={
                      r.backtracks_count > 0 ? "text-amber-600 font-bold" : "text-zinc-400"
                    }
                  >
                    {r.backtracks_count} backtracks
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                      r.is_success
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {r.is_success ? "SUCCESS" : "CONFLICT"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
