"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { SolverRunReasoningResponse } from "@/types/scheduling";

interface StrategyComparisonProps {
  runA: SolverRunReasoningResponse;
  runB: SolverRunReasoningResponse;
  onClose: () => void;
}

export function StrategyComparison({
  runA,
  runB,
  onClose,
}: StrategyComparisonProps) {
  const getChecksCount = (data: SolverRunReasoningResponse) =>
    (data.reasoning_events || []).filter((e) => e.event_type.includes("CONSTRAINT")).length;

  const getPruningCount = (data: SolverRunReasoningResponse) =>
    (data.reasoning_events || []).filter((e) => e.event_type.includes("DOMAIN_REDUCED")).length;

  const getPropagationCount = (data: SolverRunReasoningResponse) =>
    (data.reasoning_events || []).filter((e) => e.event_type.includes("PROPAGATION")).length;

  const metrics = [
    {
      label: "Strategy",
      valA:
        runA.strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
          ? "Backtracking + AC-3"
          : "Standard Backtracking",
      valB:
        runB.strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
          ? "Backtracking + AC-3"
          : "Standard Backtracking",
      type: "text",
    },
    {
      label: "Solution Status",
      valA: runA.is_success ? "Success" : "Conflict",
      valB: runB.is_success ? "Success" : "Conflict",
      type: "badge",
    },
    {
      label: "Execution Time (ms)",
      valA: runA.execution_time_ms ? runA.execution_time_ms.toFixed(1) : "0.0",
      valB: runB.execution_time_ms ? runB.execution_time_ms.toFixed(1) : "0.0",
      type: "number",
      lowerIsBetter: true,
    },
    {
      label: "Nodes Explored",
      valA: runA.nodes_explored,
      valB: runB.nodes_explored,
      type: "number",
      lowerIsBetter: true,
    },
    {
      label: "Backtracks Count",
      valA: runA.backtracks_count,
      valB: runB.backtracks_count,
      type: "number",
      lowerIsBetter: true,
    },
    {
      label: "Constraint Checks",
      valA: getChecksCount(runA),
      valB: getChecksCount(runB),
      type: "number",
      lowerIsBetter: true,
    },
    {
      label: "Flights Assigned",
      valA: `${runA.assignments_produced} / ${runA.flights_considered}`,
      valB: `${runB.assignments_produced} / ${runB.flights_considered}`,
      type: "ratio",
    },
    {
      label: "Domain Reductions",
      valA: getPruningCount(runA),
      valB: getPruningCount(runB),
      type: "number",
      higherIsBetter: true,
    },
    {
      label: "Propagation Steps",
      valA: getPropagationCount(runA),
      valB: getPropagationCount(runB),
      type: "number",
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>Side-by-Side Solver Strategy Comparison</span>
          <span className="text-xs font-mono font-normal text-blue-600 dark:text-blue-400">
            Run #{runA.solver_run_id} vs Run #{runB.solver_run_id}
          </span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Close Comparison [✕]
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              <th className="py-2 px-3 text-left">Metric</th>
              <th className="py-2 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                Run #{runA.solver_run_id} (Active)
              </th>
              <th className="py-2 px-3 text-center bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                Run #{runB.solver_run_id} (Comparison)
              </th>
              <th className="py-2 px-3 text-left">Algorithmic Trade-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {metrics.map((m, idx) => {
              return (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-sans font-medium text-zinc-700 dark:text-zinc-300">
                    {m.label}
                  </td>
                  <td className="py-2 px-3 text-center font-bold bg-blue-50/20 dark:bg-blue-950/10">
                    {m.type === "badge" ? (
                      <Badge variant={m.valA === "Success" ? "success" : "danger"}>
                        {m.valA}
                      </Badge>
                    ) : (
                      m.valA
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-bold bg-amber-50/20 dark:bg-amber-950/10">
                    {m.type === "badge" ? (
                      <Badge variant={m.valB === "Success" ? "success" : "danger"}>
                        {m.valB}
                      </Badge>
                    ) : (
                      m.valB
                    )}
                  </td>
                  <td className="py-2 px-3 font-sans text-[11px] text-zinc-500">
                    {m.label === "Strategy"
                      ? "AC-3 propagates arc consistency to prune impossible gate assignments early."
                      : m.label === "Backtracks Count"
                      ? "Fewer backtracks indicates superior heuristic ordering or domain pruning."
                      : m.label === "Nodes Explored"
                      ? "Search space explored during depth-first tree traversal."
                      : m.label === "Domain Reductions"
                      ? "Pruned values prevent entering futile search subtrees."
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
