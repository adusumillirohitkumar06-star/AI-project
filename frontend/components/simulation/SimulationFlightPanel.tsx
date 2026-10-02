"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DelayReason } from "@/types/flight";
import { SimulatedFlightRoute } from "@/types/simulation";

export interface SimulationFlightPanelProps {
  flight: SimulatedFlightRoute | null;
  onClose: () => void;
  onAllocateGate?: (flightId: number) => Promise<void>;
  isAllocating?: boolean;
  onApplyDelay?: (flightId: number, delayMinutes: number, reason: DelayReason) => Promise<void>;
  isApplyingDelay?: boolean;
}

export function SimulationFlightPanel({
  flight,
  onClose,
  onAllocateGate,
  isAllocating = false,
  onApplyDelay,
  isApplyingDelay = false,
}: SimulationFlightPanelProps) {
  // Delay interaction state
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<string>("45");
  const [selectedReason, setSelectedReason] = useState<DelayReason>("WEATHER");
  const [isConfirmingDelay, setIsConfirmingDelay] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!flight) return null;

  const formatIso = (isoStr?: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC"
      );
    } catch {
      return isoStr;
    }
  };

  const getSimStatusBadge = (status: string) => {
    switch (status) {
      case "BEFORE_DEPARTURE":
        return <Badge variant="secondary">BEFORE DEPARTURE</Badge>;
      case "IN_FLIGHT":
        return <Badge variant="success">IN FLIGHT</Badge>;
      case "ARRIVED":
        return <Badge variant="info">ARRIVED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Preset selection handler
  const handleSelectPreset = (minutes: number) => {
    setSelectedDelay(minutes);
    setIsConfirmingDelay(true);
    setActionMessage(null);
  };

  // Custom delay submit
  const handleSelectCustom = () => {
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      setSelectedDelay(mins);
      setIsConfirmingDelay(true);
      setActionMessage(null);
    }
  };

  // Confirm and dispatch
  const handleConfirmApply = async () => {
    if (!onApplyDelay || !selectedDelay || selectedDelay <= 0) return;
    try {
      await onApplyDelay(flight.flight.id, selectedDelay, selectedReason);
      setIsConfirmingDelay(false);
      setSelectedDelay(null);
      setActionMessage(`Applied +${selectedDelay}m delay. AI evaluation complete.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply delay";
      setActionMessage(`Error: ${msg}`);
    }
  };

  const handleCancelDelay = () => {
    setIsConfirmingDelay(false);
    setSelectedDelay(null);
    setActionMessage(null);
  };

  const delayMins = flight.flight.delay_duration_minutes || 0;
  const opArrival = flight.flight.actual_arrival || (delayMins > 0 ? "Delayed" : null);
  const opDeparture = flight.flight.actual_departure || (delayMins > 0 ? "Delayed" : null);

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-4 space-y-3.5 font-mono text-xs max-h-[88vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {flight.flight.flight_number}
            </span>
            {getSimStatusBadge(flight.simStatus)}
            {delayMins > 0 && <Badge variant="warning">+{delayMins}m DELAY</Badge>}
          </div>
          <div className="text-[11px] text-zinc-500">
            {flight.flight.airline} • {flight.flight.priority} Priority
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 text-sm leading-none"
          title="Close flight details"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Origin / Destination Trajectory */}
      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {flight.originAirport.iata_code}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">
              {flight.originAirport.city}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold mt-1">
              Sched: {formatIso(flight.flight.scheduled_departure)}
            </div>
            {opDeparture && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                Op: {formatIso(opDeparture)}
              </div>
            )}
          </div>

          <div className="px-2 flex flex-col items-center">
            <span className="text-xs text-zinc-400">✈</span>
            <div className="w-12 border-t-2 border-dashed border-blue-400 my-0.5" />
            <span className="text-[9px] text-zinc-400">{flight.distanceKm} km</span>
          </div>

          <div className="flex-1">
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {flight.destinationAirport.iata_code}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">
              {flight.destinationAirport.city}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold mt-1">
              Sched: {formatIso(flight.flight.scheduled_arrival)}
            </div>
            {opArrival && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                Op: {formatIso(opArrival)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Progress Bar */}
      <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">Flight Progress</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {(flight.simProgress * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${flight.simProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Operational Gate Allocation State */}
      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 font-medium">Gate Allocation:</span>
          {flight.assignedGateCode ? (
            <Badge variant="success">CONFIRMED</Badge>
          ) : flight.gateAllocationStatus === "REQUESTING" || isAllocating ? (
            <Badge variant="warning">SOLVING...</Badge>
          ) : flight.gateAllocationStatus === "FAILED" ? (
            <Badge variant="danger">NO GATE</Badge>
          ) : (
            <Badge variant="secondary">PENDING</Badge>
          )}
        </div>

        <div className="text-xs">
          {flight.assignedGateCode ? (
            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>
                Gate {flight.assignedGateCode}
                {flight.assignedTerminalCode ? ` (${flight.assignedTerminalCode})` : ""}
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {flight.destinationAirport.iata_code}
              </span>
            </div>
          ) : flight.gateAllocationStatus === "REQUESTING" || isAllocating ? (
            <div className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>CSP Solver evaluating destination gates...</span>
            </div>
          ) : flight.gateAllocationStatus === "FAILED" ? (
            <div className="text-rose-600 dark:text-rose-400 text-[11px]">
              No compatible gate available at {flight.destinationAirport.iata_code} (Constraint Conflict).
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-zinc-400 text-[11px]">Awaiting Approach Trigger</span>
              {onAllocateGate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAllocateGate(flight.flight.id)}
                  disabled={isAllocating}
                >
                  Allocate Now
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Operational Delay & Dynamic Rescheduling Controls (Phase 13) */}
      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <span>⏱️</span> Simulate Flight Delay
          </span>
          {delayMins > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              Reason: {flight.flight.delay_reason || "OPERATIONAL"}
            </span>
          )}
        </div>

        {/* Reason Selector */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500">Root Cause:</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value as DelayReason)}
            disabled={isApplyingDelay || isConfirmingDelay}
            className="w-full text-xs p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          >
            <option value="WEATHER">WEATHER</option>
            <option value="AIR_TRAFFIC">AIR TRAFFIC</option>
            <option value="AIRCRAFT">AIRCRAFT MAINTENANCE</option>
            <option value="GATE">GATE CONGESTION</option>
            <option value="CREW">CREW ROTATION</option>
            <option value="OPERATIONAL">OPERATIONAL</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>

        {/* Presets and Custom Input */}
        {!isConfirmingDelay ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectPreset(15)}
                disabled={isApplyingDelay}
                className="text-[11px] h-7"
              >
                +15 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectPreset(30)}
                disabled={isApplyingDelay}
                className="text-[11px] h-7"
              >
                +30 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectPreset(60)}
                disabled={isApplyingDelay}
                className="text-[11px] h-7"
              >
                +60 min
              </Button>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="number"
                min="1"
                max="360"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Mins"
                className="w-16 p-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-center"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectCustom}
                disabled={isApplyingDelay}
                className="flex-1 text-[11px] h-7"
              >
                Custom Delay
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation Dialogue */
          <div className="p-2.5 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="text-[11px] text-zinc-700 dark:text-zinc-200">
              Apply <span className="font-bold text-amber-600">+{selectedDelay} min</span> delay ({selectedReason})?
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Will evaluate gate collisions and trigger CSP AI rescheduling if needed.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmApply}
                disabled={isApplyingDelay}
                className="flex-1 text-[11px] h-7 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isApplyingDelay ? "Evaluating CSP..." : "Confirm Delay"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelDelay}
                disabled={isApplyingDelay}
                className="text-[11px] h-7"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {actionMessage && (
          <div className="text-[10px] p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {actionMessage}
          </div>
        )}
      </div>

      {/* Aircraft Details */}
      <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Aircraft:</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {flight.aircraft
              ? `${flight.aircraft.model} (${flight.aircraft.registration})`
              : "Standard Fleet"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Heading:</span>
          <span className="text-zinc-800 dark:text-zinc-200">
            {Math.round(flight.simBearing)}°
          </span>
        </div>
      </div>

      {/* Explainable AI link */}
      <div className="pt-1">
        <Link
          href={`/reasoning?flightId=${flight.flight.id}`}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition font-sans shadow-sm"
        >
          <span>View AI Reasoning for Flight</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
