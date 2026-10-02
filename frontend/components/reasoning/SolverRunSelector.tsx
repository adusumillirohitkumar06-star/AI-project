"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { SolverRunSummary } from "@/types/scheduling";

interface SolverRunSelectorProps {
  runs: SolverRunSummary[];
  selectedRunId: number | null;
  onSelectRun: (runId: number) => void;
  compareRunId: number | null;
  onSelectCompareRun: (runId: number | null) => void;
  isLoading: boolean;
}

export function SolverRunSelector({
  runs,
  selectedRunId,
  onSelectRun,
  compareRunId,
  onSelectCompareRun,
  isLoading,
}: SolverRunSelectorProps) {
  const getTriggerLabel = (run: SolverRunSummary) => {
    const config = run.solver_configuration || {};
    const metadata = run.metadata_json || {};
    const trigger = (config.trigger || metadata.trigger || "MANUAL") as string;
    return trigger.toUpperCase();
  };

  const getTriggerBadge = (trigger: string) => {
    if (trigger.includes("SIMULATION")) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          SIMULATION
        </span>
      );
    }
    if (trigger.includes("DYNAMIC") || trigger.includes("DELAY")) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          RESCHEDULE
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        MANUAL
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Solver Execution Runs</span>
            <span className="text-xs font-mono font-normal text-zinc-500">
              ({runs.length} recorded)
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Select a solver run to inspect genuine CSP decision steps and constraint checks.
          </p>
        </div>

        {selectedRunId && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Compare with:
            </label>
            <select
              value={compareRunId || ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                onSelectCompareRun(val);
              }}
              className="text-xs font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">(None)</option>
              {runs
                .filter((r) => r.id !== selectedRunId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Run #{r.id} ({r.strategy.replace(/_/g, " ")}) -{" "}
                    {r.is_success ? "Success" : "Conflict"}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-zinc-400 font-mono animate-pulse">
          Loading historical solver runs from API...
        </div>
      ) : runs.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-400 italic font-mono border border-dashed border-zinc-200 dark:border-zinc-800 rounded">
          No solver runs found. Run a solve in the AI Scheduler or Flight Simulation to generate telemetry.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2">Run ID</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Flights Assigned</th>
                <th className="px-3 py-2 text-right">Nodes</th>
                <th className="px-3 py-2 text-right">Backtracks</th>
                <th className="px-3 py-2 text-right">Time (ms)</th>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
              {runs.map((run) => {
                const isSelected = run.id === selectedRunId;
                const isCompared = run.id === compareRunId;
                const trigger = getTriggerLabel(run);

                return (
                  <tr
                    key={run.id}
                    onClick={() => onSelectRun(run.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100"
                        : isCompared
                        ? "bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <td className="px-3 py-2 font-bold">
                      #{run.id}
                      {isSelected && (
                        <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">
                          (active)
                        </span>
                      )}
                      {isCompared && (
                        <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                          (compare)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{getTriggerBadge(trigger)}</td>
                    <td className="px-3 py-2 font-sans font-medium text-[11px]">
                      {run.strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
                        ? "Backtracking + AC-3"
                        : "Backtracking"}
                    </td>
                    <td className="px-3 py-2">
                      {run.is_success ? (
                        <Badge variant="success">SUCCESS</Badge>
                      ) : (
                        <Badge variant="danger">CONFLICT</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {run.assignments_produced} / {run.flights_considered}
                    </td>
                    <td className="px-3 py-2 text-right">{run.nodes_explored}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          run.backtracks_count > 0
                            ? "text-amber-600 dark:text-amber-400 font-bold"
                            : "text-zinc-400"
                        }
                      >
                        {run.backtracks_count}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {run.execution_time_ms ? run.execution_time_ms.toFixed(1) : "0.0"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectRun(run.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {isSelected ? "Inspecting" : "Inspect"}
                      </button>
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
