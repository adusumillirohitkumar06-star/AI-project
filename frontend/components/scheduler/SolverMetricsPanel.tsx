"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SolverMetricsData } from "@/types/scheduling";

export interface SolverMetricsPanelProps {
  metrics: SolverMetricsData;
  strategy: string;
}

export function SolverMetricsPanel({ metrics, strategy }: SolverMetricsPanelProps) {
  const formatMs = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)} \u03BCs`;
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <Card className="border-blue-200/80 dark:border-blue-900/40 bg-zinc-50/40 dark:bg-zinc-900/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            CSP Solver Performance Telemetry
          </CardTitle>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            Strategy: {strategy}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
          {/* Execution Time */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Execution Time
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatMs(metrics.execution_time_ms)}
            </div>
          </div>

          {/* Nodes Explored */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Nodes Explored
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {metrics.nodes_explored}
            </div>
          </div>

          {/* Assignments Attempted */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Assignments Made
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.flights_assigned} / {metrics.flights_total}
            </div>
          </div>

          {/* Backtracks */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Backtracks
            </div>
            <div className={`text-lg font-bold ${metrics.backtracks > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
              {metrics.backtracks}
            </div>
          </div>

          {/* Constraint Checks */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Constraint Checks
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {metrics.constraint_checks}
            </div>
          </div>

          {/* Conflicts Detected */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Conflicts Detected
            </div>
            <div className={`text-lg font-bold ${metrics.conflicts_detected > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {metrics.conflicts_detected}
            </div>
          </div>
        </div>

        {/* Secondary Search Details */}
        {(metrics.domain_reductions !== undefined || metrics.propagation_steps !== undefined || metrics.maximum_search_depth !== undefined) && (
          <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
            {metrics.domain_reductions !== undefined && (
              <span>Domain Reductions: <strong className="text-zinc-800 dark:text-zinc-200">{metrics.domain_reductions}</strong></span>
            )}
            {metrics.propagation_steps !== undefined && (
              <span>Propagation Steps: <strong className="text-zinc-800 dark:text-zinc-200">{metrics.propagation_steps}</strong></span>
            )}
            {metrics.maximum_search_depth !== undefined && (
              <span>Max Search Depth: <strong className="text-zinc-800 dark:text-zinc-200">{metrics.maximum_search_depth}</strong></span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
