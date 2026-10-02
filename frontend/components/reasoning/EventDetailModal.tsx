"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { ReasoningEventData } from "@/types/scheduling";

interface EventDetailModalProps {
  event: ReasoningEventData | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const getEventCategory = (type: string) => {
    if (type.includes("ASSIGNMENT")) return "Assignment Decision";
    if (type.includes("VARIABLE")) return "Variable Selection (MRV)";
    if (type.includes("VALUE")) return "Gate Value Consideration";
    if (type.includes("CONSTRAINT")) return "Constraint Evaluation";
    if (type.includes("CONFLICT")) return "Conflict / Violation";
    if (type.includes("BACKTRACK")) return "Backtracking Action";
    if (type.includes("PROPAGATION") || type.includes("DOMAIN")) return "Constraint Propagation (AC-3)";
    if (type.includes("SOLUTION")) return "Solver Termination";
    return "Algorithmic Event";
  };

  const getEventExplanation = (evt: ReasoningEventData) => {
    switch (evt.event_type) {
      case "VARIABLE_SELECTED":
        return "The CSP solver selected this flight next according to the Minimum Remaining Values (MRV) heuristic and degree heuristic to minimize branch branching factor.";
      case "VALUE_CONSIDERED":
        return `The solver is evaluating Gate #${evt.gate_id ?? "unknown"} as a candidate assignment for this flight, testing all unary and binary operational constraints.`;
      case "CONSTRAINT_CHECK":
        return `Constraint '${evt.constraint ?? "operational"}' was evaluated against this flight and gate pair. If satisfied, the solver proceeds; if violated, the gate candidate is rejected.`;
      case "ASSIGNMENT_MADE":
        return `Gate #${evt.gate_id ?? "unknown"} successfully satisfied all hard constraints (aircraft size, gate conflict, buffer time, airline compatibility). The variable was bound in the current search state.`;
      case "DOMAIN_REDUCED":
        return "AC-3 arc consistency pruning eliminated one or more invalid gates from the future variable's domain because no compatible assignment existed.";
      case "CONFLICT_DETECTED":
        return `A constraint violation or domain wipeout occurred. ${evt.message}`;
      case "BACKTRACK_STARTED":
        return "Dead end reached in the current search subtree. The solver is undoing the last assignment and restoring pruned domains to explore alternative gates.";
      case "BACKTRACK_COMPLETED":
        return "Backtracking step completed. The search tree state has been reverted to the parent decision node.";
      case "SOLUTION_FOUND":
        return "All flight variables have been successfully assigned compatible gates without violating any hard operational constraints.";
      case "NO_SOLUTION":
        return "Exhaustive search completed without finding a valid assignment for all flights given the available gate inventory and timing constraints.";
      default:
        return evt.message;
    }
  };

  const detailsObj = evtDetails(event);

  function evtDetails(evt: ReasoningEventData) {
    if (evt.details && typeof evt.details === "object") {
      return evt.details;
    }
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
              Step #{event.step_index}
            </span>
            <h3 id="event-detail-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {getEventCategory(event.event_type)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status & Timing summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block">Event Type</span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {event.event_type}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block">Flight ID</span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {event.flight_id ? `#${event.flight_id}` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block">Gate ID</span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {event.gate_id ? `#${event.gate_id}` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block">Constraint</span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {event.constraint || "N/A"}
              </span>
            </div>
          </div>

          {/* Algorithmic Reason */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Deterministic Algorithmic Explanation
            </h4>
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {getEventExplanation(event)}
            </div>
          </div>

          {/* Emitted message */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Raw Solver Engine Message
            </h4>
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg font-mono text-zinc-800 dark:text-zinc-200">
              {event.message}
            </div>
          </div>

          {/* Detailed payload if present */}
          {detailsObj && Object.keys(detailsObj).length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Event Payload & Telemetry Attributes
              </h4>
              <div className="p-3 bg-zinc-950 text-zinc-200 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                <pre>{JSON.stringify(detailsObj, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-400 font-mono">
            Recorded at: {new Date(event.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
