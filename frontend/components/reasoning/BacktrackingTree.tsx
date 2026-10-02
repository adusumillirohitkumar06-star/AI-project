"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { ReasoningEventData } from "@/types/scheduling";

interface BacktrackingTreeProps {
  events: ReasoningEventData[];
  backtracksCount: number;
  onSelectEvent: (event: ReasoningEventData) => void;
}

interface TreeNode {
  stepIndex: number;
  type: "ASSIGNMENT" | "CONFLICT" | "BACKTRACK" | "VARIABLE";
  flightId?: number | string | null;
  gateId?: number | string | null;
  message: string;
  isSuccess: boolean;
  event: ReasoningEventData;
}

export function BacktrackingTree({
  events,
  backtracksCount,
  onSelectEvent,
}: BacktrackingTreeProps) {
  // Extract key search tree transitions: assignments, conflicts, backtracks
  const treeNodes = useMemo(() => {
    const nodes: TreeNode[] = [];
    for (const evt of events) {
      if (evt.event_type === "ASSIGNMENT_MADE") {
        nodes.push({
          stepIndex: evt.step_index,
          type: "ASSIGNMENT",
          flightId: evt.flight_id,
          gateId: evt.gate_id,
          message: evt.message,
          isSuccess: true,
          event: evt,
        });
      } else if (
        evt.event_type === "CONFLICT_DETECTED" ||
        evt.event_type === "NO_SOLUTION"
      ) {
        nodes.push({
          stepIndex: evt.step_index,
          type: "CONFLICT",
          flightId: evt.flight_id,
          gateId: evt.gate_id,
          message: evt.message,
          isSuccess: false,
          event: evt,
        });
      } else if (evt.event_type === "BACKTRACK_STARTED") {
        nodes.push({
          stepIndex: evt.step_index,
          type: "BACKTRACK",
          flightId: evt.flight_id,
          gateId: evt.gate_id,
          message: evt.message,
          isSuccess: false,
          event: evt,
        });
      }
    }
    return nodes;
  }, [events]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>CSP Search Tree & Backtracking Explorer</span>
            {backtracksCount === 0 ? (
              <Badge variant="success">Zero Backtracks (Deterministic)</Badge>
            ) : (
              <Badge variant="warning">{backtracksCount} Backtracks Executed</Badge>
            )}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Trace the solver's depth-first state exploration path, branching points, and dead-end reversals.
          </p>
        </div>
      </div>

      {backtracksCount === 0 ? (
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Optimal Search Path — No Backtracking Required</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            The Minimum Remaining Values (MRV) heuristic and degree heuristic successfully ordered the flight variables so that every gate assignment branch satisfied all compatibility and buffer constraints on the first attempt without reaching a dead end.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
          The solver encountered {backtracksCount} dead ends during search tree exploration where no valid gate remained for a downstream flight. The solver restored previous domains and backtracked to parent decision nodes.
        </div>
      )}

      {/* Visual Tree Sequence */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Decision Sequence ({treeNodes.length} search tree events)
        </h4>

        {treeNodes.length === 0 ? (
          <div className="text-xs text-zinc-400 italic py-2">
            No assignment or backtracking events recorded.
          </div>
        ) : (
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {treeNodes.map((node, i) => {
              const isAssign = node.type === "ASSIGNMENT";
              const isConflict = node.type === "CONFLICT";
              const isBacktrack = node.type === "BACKTRACK";

              return (
                <div
                  key={`${node.stepIndex}-${i}`}
                  onClick={() => onSelectEvent(node.event)}
                  className={`relative p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    isAssign
                      ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400"
                      : isConflict
                      ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50 hover:border-rose-400"
                      : "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50 hover:border-amber-400"
                  }`}
                >
                  {/* Tree node bullet indicator */}
                  <span
                    className={`absolute -left-[19px] top-3.5 h-3 w-3 rounded-full border-2 bg-white dark:bg-zinc-900 ${
                      isAssign
                        ? "border-emerald-500"
                        : isConflict
                        ? "border-rose-500"
                        : "border-amber-500"
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400">
                        Step #{node.stepIndex}
                      </span>
                      {isAssign && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          BRANCH ASSIGNMENT
                        </span>
                      )}
                      {isConflict && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          DEAD END / CONFLICT
                        </span>
                      )}
                      {isBacktrack && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          BACKTRACK REVERSAL
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-[11px] text-zinc-500">
                      {node.flightId ? `Flight #${node.flightId}` : ""}{" "}
                      {node.gateId ? `-> Gate #${node.gateId}` : ""}
                    </span>
                  </div>

                  <p className="font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                    {node.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
