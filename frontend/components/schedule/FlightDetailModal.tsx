"use client";

import React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Flight } from "@/types/flight";
import { Gate, Terminal } from "@/types/gate";
import { Assignment, Conflict } from "@/types/schedule";

export interface FlightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  flight: Flight | null;
  gate: Gate | null;
  terminal: Terminal | null;
  conflict: Conflict | null;
}

export function FlightDetailModal({
  isOpen,
  onClose,
  assignment,
  flight,
  gate,
  terminal,
  conflict,
}: FlightDetailModalProps) {
  if (!assignment) return null;

  const formatIso = (isoString?: string | null) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const calculateDurationMinutes = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr).getTime();
      const e = new Date(endStr).getTime();
      const diffMin = Math.round((e - s) / (1000 * 60));
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return hours > 0 ? `${hours}h ${mins}m (${diffMin} min)` : `${mins} min`;
    } catch {
      return "N/A";
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "EMERGENCY":
        return "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold";
      case "MEDICAL":
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "VIP":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Flight Assignment Inspection • ${assignment.flight_number || flight?.flight_number || "Flight"}`}
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs">
        {/* 1. Header Banner */}
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base font-mono">
              ✈
            </div>
            <div>
              <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
                {assignment.flight_number || flight?.flight_number}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {assignment.airline || flight?.airline || "Commercial Airline"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPriorityBadgeClass(
                flight?.priority
              )}`}
            >
              {flight?.priority || "NORMAL"} Priority
            </span>

            <Badge
              variant={
                assignment.status === "CONFIRMED"
                  ? "success"
                  : assignment.status === "ACTIVE"
                  ? "info"
                  : "secondary"
              }
            >
              {assignment.status}
            </Badge>
          </div>
        </div>

        {/* 2. Gate & Terminal Allocation Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
          <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Assigned Gate
            </div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              Gate {assignment.gate_code || gate?.gate_code || `ID ${assignment.gate_id}`}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Type: {gate?.gate_type || "JET_BRIDGE"}
            </div>
          </div>

          <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Terminal Facility
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {assignment.terminal_code || terminal?.terminal_code || "Terminal"}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {terminal?.name || "Active Facility"}
            </div>
          </div>

          <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              Gate Capability
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {gate?.capability || "BOTH"}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Max: {gate?.max_aircraft_size || "WIDE_BODY"}
            </div>
          </div>
        </div>

        {/* 3. Operational Timing & Gate Occupancy */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Gate Occupancy Timing (CSP Rule)
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              Duration: {calculateDurationMinutes(assignment.assignment_start_time, assignment.assignment_end_time)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[11px]">
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase text-[10px] block">
                Occupancy Start (Scheduled Arrival)
              </span>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatIso(assignment.assignment_start_time)}
              </div>
              {flight?.actual_arrival && (
                <div className="text-[10px] text-zinc-500">
                  Actual: {formatIso(flight.actual_arrival)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-zinc-400 uppercase text-[10px] block">
                Occupancy End (Scheduled Departure)
              </span>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatIso(assignment.assignment_end_time)}
              </div>
              {flight?.actual_departure && (
                <div className="text-[10px] text-zinc-500">
                  Actual: {formatIso(flight.actual_departure)}
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Required Turnaround Buffer:</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {flight?.turnaround_duration_minutes ?? 45} minutes
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Note: Turnaround requirement is evaluated as a constraint (<code className="font-mono">departure ≥ arrival + turnaround</code>).
              The gate remains physically occupied from arrival to departure.
            </p>
          </div>
        </div>

        {/* 4. Conflict & Sanity Diagnostics */}
        {conflict ? (
          <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Active Operational Conflict Detected
              </div>
              <Badge variant="danger">{conflict.severity} SEVERITY</Badge>
            </div>
            <p className="text-xs">{conflict.description}</p>
            <div className="font-mono text-[10px] text-rose-600 dark:text-rose-400 pt-1">
              Type: {conflict.conflict_type} • Detected: {formatIso(conflict.detected_at)}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>No scheduling conflicts detected for this gate allocation.</span>
          </div>
        )}

        {/* 5. Footer Metadata */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500 font-mono">
          <div>
            Assignment ID: #{assignment.id} • Source: {assignment.source}
            {assignment.solver_run_id && ` • Solver Run: #${assignment.solver_run_id}`}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={
                assignment.solver_run_id
                  ? `/reasoning?runId=${assignment.solver_run_id}&flightId=${assignment.flight_id}`
                  : `/reasoning?flightId=${assignment.flight_id}`
              }
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium text-xs transition inline-flex items-center gap-1"
            >
              View AI Reasoning &rarr;
            </Link>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
