"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReasoningEventData } from "@/types/scheduling";

export interface ReasoningEventsPanelProps {
  events: ReasoningEventData[];
}

export function ReasoningEventsPanel({ events }: ReasoningEventsPanelProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredEvents = useMemo(() => {
    if (filterType === "ALL") return events;
    if (filterType === "ASSIGNMENTS") {
      return events.filter((e) => e.event_type.includes("ASSIGNMENT"));
    }
    if (filterType === "CONSTRAINTS") {
      return events.filter((e) => e.event_type.includes("CONSTRAINT"));
    }
    if (filterType === "CONFLICTS") {
      return events.filter((e) => e.event_type.includes("CONFLICT") || e.event_type.includes("NO_SOLUTION"));
    }
    if (filterType === "BACKTRACKING") {
      return events.filter((e) => e.event_type.includes("BACKTRACK"));
    }
    if (filterType === "PROPAGATION") {
      return events.filter((e) => e.event_type.includes("PROPAGATION") || e.event_type.includes("DOMAIN"));
    }
    return events;
  }, [events, filterType]);

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

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Explainable AI (XAI) Reasoning Feed</span>
              <span className="text-xs font-mono font-normal text-zinc-400">
                ({events.length} algorithmic events emitted)
              </span>
            </CardTitle>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {["ALL", "ASSIGNMENTS", "CONSTRAINTS", "CONFLICTS", "BACKTRACKING", "PROPAGATION"].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilterType(category)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterType === category
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-400 italic">
            No reasoning events recorded during this solve execution.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-1 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredEvents.map((evt) => (
              <div
                key={evt.step_index}
                className="pt-2 first:pt-0 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] text-zinc-400 w-7 text-right">
                    #{evt.step_index}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {getEventBadge(evt.event_type)}
                      <span className="text-[11px] text-zinc-400">
                        {formatTimestamp(evt.timestamp)}
                      </span>
                      {evt.constraint && (
                        <span className="text-[10px] text-zinc-500 uppercase">
                          [{evt.constraint}]
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 text-xs">
                      {evt.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400 shrink-0">
                  {evt.flight_id && <span>Flight #{evt.flight_id}</span>}
                  {evt.gate_id && <span>Gate #{evt.gate_id}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
