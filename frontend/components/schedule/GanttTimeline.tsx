"use client";

import React, { useMemo } from "react";
import { Gate, Terminal } from "@/types/gate";
import { Flight } from "@/types/flight";
import { Assignment, Conflict, GanttZoomLevel } from "@/types/schedule";

export interface GanttTimelineProps {
  date: string;
  terminals: Terminal[];
  gates: Gate[];
  assignments: Assignment[];
  flights: Flight[];
  conflicts: Conflict[];
  zoom: GanttZoomLevel;
  onSelectAssignment: (assignment: Assignment) => void;
  selectedAssignmentId?: number | null;
}

const ZOOM_HOUR_WIDTHS: Record<GanttZoomLevel, number> = {
  "24h": 72,
  "12h": 120,
  "6h": 200,
  "3h": 360,
  "1h": 720,
};

export function GanttTimeline({
  date,
  terminals,
  gates,
  assignments,
  flights,
  conflicts,
  zoom,
  onSelectAssignment,
  selectedAssignmentId,
}: GanttTimelineProps) {
  const hourWidth = ZOOM_HOUR_WIDTHS[zoom] || 72;
  const totalTimelineWidth = hourWidth * 24;

  // Flight map for instant lookup of flight metadata
  const flightsMap = useMemo(() => {
    const map = new Map<number, Flight>();
    flights.forEach((f) => map.set(f.id, f));
    return map;
  }, [flights]);

  // Terminal map
  const terminalsMap = useMemo(() => {
    const map = new Map<number, Terminal>();
    terminals.forEach((t) => map.set(t.id, t));
    return map;
  }, [terminals]);

  // Conflict map for quick lookup
  const conflictMap = useMemo(() => {
    const map = new Map<number, Conflict>();
    conflicts.forEach((c) => {
      if (c.flight_id && !c.is_resolved) {
        map.set(c.flight_id, c);
      }
    });
    return map;
  }, [conflicts]);

  // Check strict time overlap between assignments on the same gate
  // Rule: overlap occurs ONLY if start_A < end_B AND start_B < end_A
  // (Back-to-back: start_B == end_A is strictly valid and NOT a conflict)
  const overlappingAssignmentIds = useMemo(() => {
    const set = new Set<number>();
    const byGate = new Map<number, Assignment[]>();

    assignments.forEach((asg) => {
      if (!byGate.has(asg.gate_id)) byGate.set(asg.gate_id, []);
      byGate.get(asg.gate_id)!.push(asg);
    });

    byGate.forEach((gateAsgs) => {
      for (let i = 0; i < gateAsgs.length; i++) {
        for (let j = i + 1; j < gateAsgs.length; j++) {
          const a = gateAsgs[i];
          const b = gateAsgs[j];
          const aStart = new Date(a.assignment_start_time).getTime();
          const aEnd = new Date(a.assignment_end_time).getTime();
          const bStart = new Date(b.assignment_start_time).getTime();
          const bEnd = new Date(b.assignment_end_time).getTime();

          // Strict overlap condition
          if (aStart < bEnd && bStart < aEnd) {
            set.add(a.id);
            set.add(b.id);
          }
        }
      }
    });

    return set;
  }, [assignments]);

  // Group gates by Terminal
  const groupedGates = useMemo(() => {
    const groups: { terminal: Terminal | null; gates: Gate[] }[] = [];
    const terminalGroups = new Map<number, Gate[]>();
    const unassignedTerminalGates: Gate[] = [];

    gates.forEach((gate) => {
      if (gate.terminal_id) {
        if (!terminalGroups.has(gate.terminal_id)) {
          terminalGroups.set(gate.terminal_id, []);
        }
        terminalGroups.get(gate.terminal_id)!.push(gate);
      } else {
        unassignedTerminalGates.push(gate);
      }
    });

    terminals.forEach((term) => {
      const termGates = terminalGroups.get(term.id) || [];
      if (termGates.length > 0) {
        groups.push({ terminal: term, gates: termGates });
      }
    });

    if (unassignedTerminalGates.length > 0) {
      groups.push({ terminal: null, gates: unassignedTerminalGates });
    }

    return groups;
  }, [terminals, gates]);

  // Date boundary timestamps for the selected calendar day
  const { dayStartMs, dayEndMs, totalDayMs } = useMemo(() => {
    // Parse date safely in local time
    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    return {
      dayStartMs: start,
      dayEndMs: end,
      totalDayMs: end - start,
    };
  }, [date]);

  // Current browser time indicator
  const nowPercent = useMemo(() => {
    const now = new Date();
    const [year, month, day] = date.split("-").map(Number);
    const isCurrentDate =
      now.getFullYear() === year &&
      now.getMonth() === month - 1 &&
      now.getDate() === day;

    if (!isCurrentDate) return null;

    const nowMs = now.getTime();
    if (nowMs < dayStartMs || nowMs > dayEndMs) return null;

    return ((nowMs - dayStartMs) / totalDayMs) * 100;
  }, [date, dayStartMs, dayEndMs, totalDayMs]);

  // Time format helper
  const formatTimeHM = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  const getStatusColor = (status: string, hasConflict: boolean) => {
    if (hasConflict) {
      return "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-200 hover:bg-rose-500/30";
    }
    switch (status) {
      case "ACTIVE":
        return "bg-blue-600/20 border-blue-600 text-blue-900 dark:text-blue-200 hover:bg-blue-600/30";
      case "CONFIRMED":
        return "bg-emerald-600/20 border-emerald-600 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600/30";
      case "TENTATIVE":
        return "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30";
      case "COMPLETED":
        return "bg-zinc-500/20 border-zinc-500 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-500/30";
      case "REVOKED":
        return "bg-rose-500/20 border-rose-400 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30";
      default:
        return "bg-blue-500/20 border-blue-500 text-blue-900 dark:text-blue-200 hover:bg-blue-500/30";
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
      <div className="overflow-x-auto relative">
        <div style={{ width: `${totalTimelineWidth + 180}px`, minWidth: "100%" }}>
          {/* Header Row: Gate label & Time Axis */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-30">
            {/* Sticky Top-Left Corner */}
            <div className="w-[180px] shrink-0 p-2.5 font-semibold text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-40 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
              <span>Gate / Facility</span>
              <span className="text-[10px] text-zinc-400 font-mono">24h</span>
            </div>

            {/* Time Axis (24 Hour Ticks) */}
            <div
              className="flex relative text-xs font-mono text-zinc-500 dark:text-zinc-400"
              style={{ width: `${totalTimelineWidth}px` }}
            >
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="shrink-0 border-r border-zinc-200 dark:border-zinc-800 py-2 px-1 text-center font-medium"
                  style={{ width: `${hourWidth}px` }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}

              {/* Current Time Indicator Head */}
              {nowPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
                  style={{ left: `${nowPercent}%` }}
                >
                  <span className="bg-rose-600 text-white text-[9px] font-bold font-mono px-1 py-0.5 rounded shadow-xs -translate-x-1/2">
                    NOW
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Body: Grouped by Terminal */}
          <div className="relative">
            {/* Vertical Current Time Line through all rows */}
            {nowPercent !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20 border-l-2 border-dashed border-rose-500"
                style={{ left: `calc(180px + ${nowPercent}%)` }}
              />
            )}

            {groupedGates.map((group, groupIdx) => {
              const termTitle = group.terminal
                ? `${group.terminal.terminal_code} — ${group.terminal.name}`
                : "Unassigned Terminal";

              return (
                <div key={group.terminal?.id || `group-${groupIdx}`}>
                  {/* Terminal Header Banner */}
                  <div className="flex bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="w-[180px] shrink-0 p-2 font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900">
                      🏢 {termTitle}
                    </div>
                    <div
                      className="text-[10px] text-zinc-500 flex items-center px-3 font-mono"
                      style={{ width: `${totalTimelineWidth}px` }}
                    >
                      {group.gates.length} active gates configured
                    </div>
                  </div>

                  {/* Gate Rows */}
                  {group.gates.map((gate) => {
                    const gateAssignments = assignments.filter(
                      (asg) => asg.gate_id === gate.id
                    );

                    return (
                      <div
                        key={gate.id}
                        className="flex border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors h-14"
                      >
                        {/* Sticky Left Gate Label */}
                        <div className="w-[180px] shrink-0 p-2 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-20 bg-white dark:bg-zinc-950 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              Gate {gate.gate_code}
                            </span>
                            <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {gate.capability}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            Max: {gate.max_aircraft_size || "Any"}
                          </div>
                        </div>

                        {/* Gate Timeline Track */}
                        <div
                          className="relative h-full flex items-center"
                          style={{ width: `${totalTimelineWidth}px` }}
                        >
                          {/* Hour Gridlines */}
                          {Array.from({ length: 24 }).map((_, h) => (
                            <div
                              key={h}
                              className="absolute top-0 bottom-0 border-r border-zinc-100 dark:border-zinc-800/40 pointer-events-none"
                              style={{
                                left: `${h * hourWidth}px`,
                                width: `${hourWidth}px`,
                              }}
                            />
                          ))}

                          {/* Flight Blocks for this Gate */}
                          {gateAssignments.map((asg) => {
                            const asgStart = new Date(asg.assignment_start_time).getTime();
                            const asgEnd = new Date(asg.assignment_end_time).getTime();

                            // Filter out assignments completely outside today's window
                            if (asgStart >= dayEndMs || asgEnd <= dayStartMs) {
                              return null;
                            }

                            // Calculate horizontal occupancy:
                            // occupancy_start = arrival_time
                            // occupancy_end = departure_time
                            const effectiveStart = Math.max(asgStart, dayStartMs);
                            const effectiveEnd = Math.min(asgEnd, dayEndMs);

                            const leftPercent =
                              ((effectiveStart - dayStartMs) / totalDayMs) * 100;
                            const rightPercent =
                              ((effectiveEnd - dayStartMs) / totalDayMs) * 100;
                            const widthPercent = Math.max(0.6, rightPercent - leftPercent);

                            const flight = flightsMap.get(asg.flight_id);
                            const hasBackendConflict = conflictMap.has(asg.flight_id);
                            const hasStrictOverlap = overlappingAssignmentIds.has(asg.id);
                            const hasConflict = hasBackendConflict || hasStrictOverlap;
                            const isSelected = selectedAssignmentId === asg.id;

                            return (
                              <button
                                key={asg.id}
                                type="button"
                                onClick={() => onSelectAssignment(asg)}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className={`absolute h-10 rounded-md border text-left px-2 py-1 transition-all cursor-pointer overflow-hidden z-10 shadow-xs flex flex-col justify-between ${
                                  isSelected ? "ring-2 ring-blue-500" : ""
                                } ${getStatusColor(asg.status, hasConflict)}`}
                                title={`Flight ${asg.flight_number || flight?.flight_number} | ${formatTimeHM(
                                  asg.assignment_start_time
                                )} - ${formatTimeHM(asg.assignment_end_time)} | ${asg.status}${
                                  hasConflict ? " | CONFLICT DETECTED" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-mono font-bold text-[11px] truncate flex items-center gap-1">
                                    {hasConflict && (
                                      <span className="text-rose-600 font-bold" title="Operational Conflict">
                                        ⚠
                                      </span>
                                    )}
                                    {flight?.delay_duration_minutes && flight.delay_duration_minutes > 0 ? (
                                      <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-0.5 rounded font-bold">
                                        +{flight.delay_duration_minutes}m
                                      </span>
                                    ) : null}
                                    {asg.flight_number || flight?.flight_number || "FLIGHT"}
                                  </span>
                                  <span className="font-mono text-[9px] opacity-80 shrink-0">
                                    {formatTimeHM(asg.assignment_start_time)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between w-full text-[9px] opacity-75 font-mono truncate">
                                  <span className="truncate">
                                    {asg.airline || flight?.airline || "Commercial"}
                                  </span>
                                  <span className="shrink-0">
                                    {formatTimeHM(asg.assignment_end_time)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
