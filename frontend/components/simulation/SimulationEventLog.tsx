"use client";

import React from "react";
import { SimulationEvent, SimulationEventType } from "@/types/simulation";

export interface SimulationEventLogProps {
  events: SimulationEvent[];
  onClearEvents?: () => void;
}

export function SimulationEventLog({ events }: SimulationEventLogProps) {
  const getEventBadge = (type: SimulationEventType) => {
    switch (type) {
      case "FLIGHT_DEPARTED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            🛫 DEPARTED
          </span>
        );
      case "FLIGHT_ARRIVED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            🛬 ARRIVED
          </span>
        );
      case "GATE_ALLOCATION_REQUESTED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            ⚡ GATE REQ
          </span>
        );
      case "GATE_ASSIGNED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
            🎯 GATE ASSIGNED
          </span>
        );
      case "GATE_ALLOCATION_FAILED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            ⚠️ NO GATE
          </span>
        );
      case "DELAY_APPLIED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            ⏱️ DELAY
          </span>
        );
      case "GATE_CONFLICT_DETECTED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
            💥 CONFLICT
          </span>
        );
      case "RESCHEDULING_REQUESTED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            🔄 RESCHEDULE
          </span>
        );
      case "GATE_REASSIGNED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
            🔀 REASSIGNED
          </span>
        );
      case "RESCHEDULING_FAILED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            ❌ RESCHED FAIL
          </span>
        );
      case "CONFLICT_RESOLVED":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            ✅ RESOLVED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md p-3.5 space-y-2.5 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Simulation Event Log ({events.length})
        </span>
        <span className="text-[10px] text-zinc-400">Live Transitions</span>
      </div>

      {/* Events Stream */}
      {events.length === 0 ? (
        <div className="py-4 text-center text-zinc-400 text-[11px] italic">
          No transition events recorded yet. Play the simulation to observe flight departures, arrivals, and AI gate allocations.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {events.slice(0, 50).map((ev) => (
            <div
              key={ev.id}
              className="p-1.5 rounded-md border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between text-[11px] gap-2"
            >
              <div className="flex items-center gap-2 truncate">
                {getEventBadge(ev.eventType)}

                <span className="font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                  {ev.flightNumber}
                </span>

                <span className="text-zinc-500 truncate">{ev.description}</span>
              </div>

              <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                {ev.simTimeFormatted}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
