"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { SolverRunReasoningResponse } from "@/types/scheduling";

interface MetricsPanelProps {
  reasoningData: SolverRunReasoningResponse;
}

export function MetricsPanel({ reasoningData }: MetricsPanelProps) {
  // Aggregate statistics directly from genuine recorded events
  const events = reasoningData.reasoning_events || [];

  const constraintChecksCount = events.filter((e) =>
    e.event_type.includes("CONSTRAINT")
  ).length;

  const domainReductionsCount = events.filter((e) =>
    e.event_type.includes("DOMAIN_REDUCED")
  ).length;

  const propagationStepsCount = events.filter((e) =>
    e.event_type.includes("PROPAGATION")
  ).length;

  const assignmentEventsCount = events.filter((e) =>
    e.event_type.includes("ASSIGNMENT_MADE")
  ).length;

  const conflictEventsCount = events.filter(
    (e) => e.event_type.includes("CONFLICT") || e.event_type.includes("NO_SOLUTION")
  ).length;

  const backtracksCount = reasoningData.backtracks_count;
  const nodesExplored = reasoningData.nodes_explored;
  const executionTimeMs = reasoningData.execution_time_ms;

  const strategyLabel =
    reasoningData.strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
      ? "Backtracking with AC-3 Constraint Propagation"
      : "Standard Backtracking (Depth-First Search + MRV)";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Solver Execution Telemetry — Run #{reasoningData.solver_run_id}
            </h3>
            {reasoningData.is_success ? (
              <Badge variant="success">OPTIMAL / COMPLETE</Badge>
            ) : (
              <Badge variant="danger">CONFLICT / INCOMPLETE</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Algorithm: <span className="font-mono text-zinc-700 dark:text-zinc-300">{strategyLabel}</span>
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Total Events Recorded: <span className="font-bold text-zinc-800 dark:text-zinc-200">{events.length}</span>
        </div>
      </div>

      {/* Grid of 6-8 core CSP metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Nodes Explored
          </div>
          <div className="mt-1 text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {nodesExplored}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Decision tree states</div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Execution Time
          </div>
          <div className="mt-1 text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {executionTimeMs ? `${executionTimeMs.toFixed(1)} ms` : "0.0 ms"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Pure Python runtime</div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Backtracks
          </div>
          <div
            className={`mt-1 text-xl font-mono font-bold ${
              backtracksCount > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {backtracksCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {backtracksCount === 0 ? "Zero backtracks (optimal)" : "Branch reversals"}
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Constraint Checks
          </div>
          <div className="mt-1 text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {constraintChecksCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Evaluations performed</div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Assignments
          </div>
          <div className="mt-1 text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {reasoningData.assignments_produced} / {reasoningData.flights_considered}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {assignmentEventsCount} assignment events
          </div>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Prunings / Reductions
          </div>
          <div className="mt-1 text-xl font-mono font-bold text-purple-600 dark:text-purple-400">
            {domainReductionsCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {propagationStepsCount} propagation steps
          </div>
        </div>
      </div>

      {/* Efficiency indicators */}
      <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded border border-zinc-200/60 dark:border-zinc-800 p-2.5 text-xs text-zinc-600 dark:text-zinc-300 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div>
          <span className="text-zinc-400">Search Efficiency:</span>{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
            {nodesExplored > 0
              ? `${((reasoningData.assignments_produced / nodesExplored) * 100).toFixed(1)}%`
              : "100%"}
          </span>{" "}
          assigned per node explored
        </div>
        <div>
          <span className="text-zinc-400">Checks per Flight:</span>{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
            {reasoningData.flights_considered > 0
              ? (constraintChecksCount / reasoningData.flights_considered).toFixed(1)
              : "0"}
          </span>
        </div>
        <div>
          <span className="text-zinc-400">Conflict Events:</span>{" "}
          <span
            className={`font-semibold ${
              conflictEventsCount > 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {conflictEventsCount}
          </span>
        </div>
      </div>
    </div>
  );
}
