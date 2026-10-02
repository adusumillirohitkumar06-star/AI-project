"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ScheduledAssignment, SolverConflictData, UnassignedFlightData } from "@/types/scheduling";

export interface SolverResultViewProps {
  success: boolean;
  solverRunId?: number | null;
  assignments: ScheduledAssignment[];
  unassignedFlights: UnassignedFlightData[];
  conflicts: SolverConflictData[];
}

export function SolverResultView({
  success,
  solverRunId,
  assignments,
  unassignedFlights,
  conflicts,
}: SolverResultViewProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduledAssignment | null>(null);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Solution Status Banner */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          success
            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
            : "border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              success ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
            }`}
          />
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {success
                ? "Optimal Gate Allocation Solved & Automatically Persisted"
                : "No Valid Gate Allocation Found (Constraints Unsatisfiable)"}
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              {success
                ? `Produced ${assignments.length} conflict-free assignments transactionally committed to database.`
                : "The active constraint system could not find a non-overlapping assignment for all requested flights."}
            </p>
          </div>
        </div>

        {solverRunId && (
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono px-2.5 py-1 rounded bg-white/70 dark:bg-zinc-900/70 border border-current/20">
              SolverRun #{solverRunId}
            </div>
            <Link
              href={`/reasoning?runId=${solverRunId}`}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-1 font-sans"
            >
              View Solver Reasoning &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* 2. Assignments Table (if success) */}
      {success && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produced Gate Allocations</CardTitle>
              <span className="text-xs font-mono text-zinc-400">
                {assignments.length} assignments
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-mono">
                  <tr>
                    <th scope="col" className="px-4 py-3">Flight</th>
                    <th scope="col" className="px-4 py-3">Assigned Gate</th>
                    <th scope="col" className="px-4 py-3">Terminal</th>
                    <th scope="col" className="px-4 py-3">Occupancy Start</th>
                    <th scope="col" className="px-4 py-3">Occupancy End</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 font-mono">
                  {assignments.map((asg) => (
                    <tr
                      key={`${asg.flight_id}-${asg.gate_id}`}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {asg.flight_number}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          ID #{asg.flight_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">
                        {asg.gate_code}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {asg.terminal_code}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatTime(asg.start_time)}</div>
                        <div className="text-[10px] text-zinc-400">{formatDate(asg.start_time)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatTime(asg.end_time)}</div>
                        <div className="text-[10px] text-zinc-400">{formatDate(asg.end_time)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssignment(asg)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Conflicts List (if any) */}
      {conflicts.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10">
          <CardHeader>
            <CardTitle className="text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Detected Operational Conflicts & Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {conflicts.map((c, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-zinc-900 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono mb-1">
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      {c.conflict_type}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                      Severity: {c.severity}
                    </span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">{c.description}</p>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 shrink-0 text-right">
                  {c.flight_id && <div>Flight #{c.flight_id}</div>}
                  {c.gate_id && <div>Gate #{c.gate_id}</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4. Unassigned Flights (if no solution) */}
      {!success && unassignedFlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400">
              Unassigned Flights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
              {unassignedFlights.map((f) => (
                <div
                  key={f.flight_id}
                  className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60"
                >
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {f.flight_number}
                  </div>
                  <div className="text-zinc-500 mt-1">
                    Arrival: {formatTime(f.arrival_time)}
                  </div>
                  <div className="text-zinc-500">
                    Departure: {formatTime(f.departure_time)}
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase mt-1">
                    Priority: {f.priority} &bull; {f.flight_type}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Detail Inspection Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={Boolean(selectedAssignment)}
          onClose={() => setSelectedAssignment(null)}
          title={`Assignment: Flight ${selectedAssignment.flight_number} \u2192 Gate ${selectedAssignment.gate_code}`}
          description={`Terminal ${selectedAssignment.terminal_code}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <div>
                <span className="text-zinc-400">Flight ID: </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">#{selectedAssignment.flight_id}</span>
              </div>
              <div>
                <span className="text-zinc-400">Gate ID: </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">#{selectedAssignment.gate_id} ({selectedAssignment.gate_code})</span>
              </div>
              <div>
                <span className="text-zinc-400">Terminal Code: </span>
                <span>{selectedAssignment.terminal_code}</span>
              </div>
              <div>
                <span className="text-zinc-400">Occupancy Window: </span>
                <span>{formatTime(selectedAssignment.start_time)} \u2192 {formatTime(selectedAssignment.end_time)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              {solverRunId ? (
                <Link
                  href={`/reasoning?runId=${solverRunId}&flightId=${selectedAssignment.flight_id}`}
                  className="text-xs font-sans font-medium text-blue-600 hover:underline"
                >
                  View Solver Reasoning for Flight &rarr;
                </Link>
              ) : <div />}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAssignment(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
