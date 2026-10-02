"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { ReasoningEventData } from "@/types/scheduling";

interface AssignmentSummaryProps {
  events: ReasoningEventData[];
  onFilterFlight: (flightId: string) => void;
}

interface FlightAssignmentSummary {
  flightId: number | string;
  assignedGateId: number | string | null;
  status: "ASSIGNED" | "UNASSIGNED" | "CONFLICT";
  testedGates: Set<number | string>;
  violatedConstraints: Set<string>;
}

export function AssignmentSummary({
  events,
  onFilterFlight,
}: AssignmentSummaryProps) {
  const flightSummaries = useMemo(() => {
    const map = new Map<number | string, FlightAssignmentSummary>();

    for (const evt of events) {
      if (!evt.flight_id) continue;
      const fid = evt.flight_id;

      if (!map.has(fid)) {
        map.set(fid, {
          flightId: fid,
          assignedGateId: null,
          status: "UNASSIGNED",
          testedGates: new Set(),
          violatedConstraints: new Set(),
        });
      }

      const item = map.get(fid)!;

      if (evt.gate_id) {
        item.testedGates.add(evt.gate_id);
      }

      if (evt.event_type === "ASSIGNMENT_MADE") {
        item.assignedGateId = evt.gate_id || null;
        item.status = "ASSIGNED";
      }

      if (
        evt.constraint &&
        (evt.message.toLowerCase().includes("violate") ||
          evt.message.toLowerCase().includes("conflict") ||
          evt.message.toLowerCase().includes("failed"))
      ) {
        item.violatedConstraints.add(evt.constraint);
      }

      if (
        evt.event_type === "CONFLICT_DETECTED" ||
        evt.event_type === "NO_SOLUTION"
      ) {
        if (item.status !== "ASSIGNED") {
          item.status = "CONFLICT";
        }
      }
    }

    return Array.from(map.values());
  }, [events]);

  if (flightSummaries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Flight Allocation Outcomes & Constraint Breakdown</span>
            <span className="text-xs font-mono font-normal text-zinc-500">
              ({flightSummaries.length} flights tracked)
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Factual outcome derived exclusively from recorded CSP solver evaluations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {flightSummaries.map((summary) => {
          const isAssigned = summary.status === "ASSIGNED";

          return (
            <div
              key={String(summary.flightId)}
              className={`p-3 rounded-lg border text-xs space-y-2 transition ${
                isAssigned
                  ? "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80"
                  : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  Flight #{summary.flightId}
                </span>
                {isAssigned ? (
                  <Badge variant="success">ASSIGNED</Badge>
                ) : (
                  <Badge variant="danger">UNASSIGNED</Badge>
                )}
              </div>

              <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                {isAssigned ? (
                  <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Allocated to Gate #{summary.assignedGateId}
                  </div>
                ) : (
                  <div className="text-rose-700 dark:text-rose-400 font-medium">
                    No compatible gate found
                  </div>
                )}
              </div>

              <div className="text-[10px] text-zinc-500 space-y-1">
                <div>
                  Gates evaluated:{" "}
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {summary.testedGates.size}
                  </span>
                </div>

                {summary.violatedConstraints.size > 0 && (
                  <div>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      Violations encountered:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {Array.from(summary.violatedConstraints).map((c) => (
                        <span
                          key={c}
                          className="px-1 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9px] uppercase font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onFilterFlight(String(summary.flightId))}
                className="w-full mt-2 text-center py-1 rounded bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-mono text-blue-600 dark:text-blue-400 transition"
              >
                Filter Timeline for Flight #{summary.flightId} &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
