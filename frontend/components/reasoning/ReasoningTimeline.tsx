"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { ReasoningEventData } from "@/types/scheduling";

interface ReasoningTimelineProps {
  events: ReasoningEventData[];
  onSelectEvent: (event: ReasoningEventData) => void;
  initialFlightFilter?: string | null;
}

export function ReasoningTimeline({
  events,
  onSelectEvent,
  initialFlightFilter,
}: ReasoningTimelineProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(initialFlightFilter || "");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FAILURES" | "SUCCESS">("ALL");

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Category filter
      if (categoryFilter === "ASSIGNMENTS" && !evt.event_type.includes("ASSIGNMENT")) {
        return false;
      }
      if (categoryFilter === "VARIABLES" && !evt.event_type.includes("VARIABLE")) {
        return false;
      }
      if (categoryFilter === "CONSIDERATIONS" && !evt.event_type.includes("VALUE_CONSIDERED")) {
        return false;
      }
      if (categoryFilter === "CONSTRAINTS" && !evt.event_type.includes("CONSTRAINT")) {
        return false;
      }
      if (categoryFilter === "CONFLICTS" && !evt.event_type.includes("CONFLICT") && !evt.event_type.includes("NO_SOLUTION")) {
        return false;
      }
      if (categoryFilter === "BACKTRACKING" && !evt.event_type.includes("BACKTRACK")) {
        return false;
      }
      if (
        categoryFilter === "PROPAGATION" &&
        !evt.event_type.includes("PROPAGATION") &&
        !evt.event_type.includes("DOMAIN")
      ) {
        return false;
      }

      // Status filter
      if (statusFilter === "FAILURES") {
        const isFailure =
          evt.event_type.includes("CONFLICT") ||
          evt.event_type.includes("NO_SOLUTION") ||
          evt.event_type.includes("BACKTRACK") ||
          (evt.event_type.includes("CONSTRAINT") &&
            (evt.message.toLowerCase().includes("violate") ||
              evt.message.toLowerCase().includes("failed") ||
              evt.message.toLowerCase().includes("conflict")));
        if (!isFailure) return false;
      }
      if (statusFilter === "SUCCESS") {
        const isSuccess =
          evt.event_type.includes("ASSIGNMENT") ||
          evt.event_type.includes("SOLUTION_FOUND") ||
          (evt.event_type.includes("CONSTRAINT") &&
            evt.message.toLowerCase().includes("pass"));
        if (!isSuccess) return false;
      }

      // Search query (flight, gate, constraint, message)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const msg = (evt.message || "").toLowerCase();
        const constraint = (evt.constraint || "").toLowerCase();
        const flightStr = evt.flight_id ? `flight #${evt.flight_id}`.toLowerCase() : "";
        const flightIdStr = evt.flight_id ? String(evt.flight_id) : "";
        const gateStr = evt.gate_id ? `gate #${evt.gate_id}`.toLowerCase() : "";
        const gateIdStr = evt.gate_id ? String(evt.gate_id) : "";

        const matches =
          msg.includes(q) ||
          constraint.includes(q) ||
          flightStr.includes(q) ||
          flightIdStr === q ||
          gateStr.includes(q) ||
          gateIdStr === q;

        if (!matches) return false;
      }

      return true;
    });
  }, [events, categoryFilter, statusFilter, searchQuery]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case "ASSIGNMENT_MADE":
        return <Badge variant="success">ASSIGNMENT</Badge>;
      case "VARIABLE_SELECTED":
        return <Badge variant="info">VARIABLE</Badge>;
      case "VALUE_CONSIDERED":
        return <Badge variant="default">CONSIDERED</Badge>;
      case "CONSTRAINT_CHECK":
        return <Badge variant="outline">CHECK</Badge>;
      case "CONFLICT_DETECTED":
        return <Badge variant="danger">CONFLICT</Badge>;
      case "BACKTRACK_STARTED":
      case "BACKTRACK_COMPLETED":
        return <Badge variant="warning">BACKTRACK</Badge>;
      case "DOMAIN_REDUCED":
      case "PROPAGATION_STARTED":
      case "PROPAGATION_COMPLETED":
        return <Badge variant="secondary">PROPAGATION</Badge>;
      case "SOLUTION_FOUND":
        return <Badge variant="success">SOLUTION</Badge>;
      case "NO_SOLUTION":
        return <Badge variant="danger">NO SOLUTION</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const isConstraintViolation = (evt: ReasoningEventData) => {
    const text = evt.message.toLowerCase();
    return (
      text.includes("violate") ||
      text.includes("conflict") ||
      text.includes("failed") ||
      text.includes("rejected")
    );
  };

  const isConstraintPass = (evt: ReasoningEventData) => {
    const text = evt.message.toLowerCase();
    return (
      text.includes("pass") ||
      text.includes("satisfied") ||
      text.includes("compatible")
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-4">
      {/* Header and Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Chronological Solver Reasoning Feed</span>
              <span className="text-xs font-mono font-normal text-zinc-500">
                ({filteredEvents.length} of {events.length} events)
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Click any step to inspect complete telemetry payload and constraint logic.
            </p>
          </div>

          {/* Quick status toggles */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === "ALL"
                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("SUCCESS")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === "SUCCESS"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Assignments & Passes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("FAILURES")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === "FAILURES"
                  ? "bg-rose-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Violations & Backtracks
            </button>
          </div>
        </div>

        {/* Search bar & Category filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Flight ID, Gate, Constraint (e.g. 'AIRCRAFT_SIZE', '101')..."
              className="w-full text-xs font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
            {[
              { id: "ALL", label: "All Types" },
              { id: "VARIABLES", label: "MRV Variables" },
              { id: "CONSIDERATIONS", label: "Gate Candidates" },
              { id: "CONSTRAINTS", label: "Constraint Checks" },
              { id: "ASSIGNMENTS", label: "Assignments" },
              { id: "PROPAGATION", label: "Pruning (AC-3)" },
              { id: "BACKTRACKING", label: "Backtracks" },
              { id: "CONFLICTS", label: "Conflicts" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2 py-1 rounded transition ${
                  categoryFilter === cat.id
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table / Feed */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 italic font-mono">
            No events match the selected filters.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-xs">
            {filteredEvents.map((evt) => {
              const isViolation = isConstraintViolation(evt);
              const isPass = isConstraintPass(evt);

              return (
                <div
                  key={evt.step_index}
                  onClick={() => onSelectEvent(evt)}
                  className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-[11px] text-zinc-400 w-8 shrink-0 text-right pt-0.5">
                      #{evt.step_index}
                    </span>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getEventBadge(evt.event_type)}

                        {evt.constraint && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 uppercase font-semibold">
                            {evt.constraint}
                          </span>
                        )}

                        {isViolation && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                            FAIL / VIOLATION
                          </span>
                        )}

                        {isPass && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                            PASS / SATISFIED
                          </span>
                        )}
                      </div>

                      <p className="text-zinc-800 dark:text-zinc-200 text-xs break-words">
                        {evt.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {evt.flight_id && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px]">
                        Flight #{evt.flight_id}
                      </span>
                    )}
                    {evt.gate_id && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px]">
                        Gate #{evt.gate_id}
                      </span>
                    )}

                    <span className="text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition underline">
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
