"use client";

import React, { useMemo, useState } from "react";
import { Airport, Flight } from "@/types/flight";
import { Gate } from "@/types/gate";
import { SolverStrategyOption } from "@/types/scheduling";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export interface SchedulerConfigurationProps {
  airports: Airport[];
  selectedAirportId: number | null;
  onSelectAirport: (airportId: number) => void;
  gates: Gate[];
  isLoadingGates: boolean;
  flights: Flight[];
  isLoadingFlights: boolean;
  selectedFlightIds: number[];
  onToggleFlight: (flightId: number) => void;
  onSelectAllFlights: () => void;
  onDeselectAllFlights: () => void;
  strategy: SolverStrategyOption;
  onChangeStrategy: (strategy: SolverStrategyOption) => void;
  bufferMinutes: number;
  onChangeBufferMinutes: (buffer: number) => void;
  onRunSolver: () => void;
  isSolving: boolean;
}

export function SchedulerConfiguration({
  airports,
  selectedAirportId,
  onSelectAirport,
  gates,
  isLoadingGates,
  flights,
  isLoadingFlights,
  selectedFlightIds,
  onToggleFlight,
  onSelectAllFlights,
  onDeselectAllFlights,
  strategy,
  onChangeStrategy,
  bufferMinutes,
  onChangeBufferMinutes,
  onRunSolver,
  isSolving,
}: SchedulerConfigurationProps) {
  const [flightSearchTerm, setFlightSearchTerm] = useState("");

  const selectedAirport = useMemo(() => {
    return airports.find((a) => a.id === selectedAirportId) || null;
  }, [airports, selectedAirportId]);

  // Filter flights by search term
  const filteredFlights = useMemo(() => {
    if (!flightSearchTerm.trim()) return flights;
    const term = flightSearchTerm.toLowerCase();
    return flights.filter(
      (f) =>
        f.flight_number.toLowerCase().includes(term) ||
        f.airline.toLowerCase().includes(term) ||
        f.flight_type.toLowerCase().includes(term) ||
        f.priority.toLowerCase().includes(term)
    );
  }, [flights, flightSearchTerm]);

  // Gate capability statistics
  const gateStats = useMemo(() => {
    const total = gates.length;
    const domestic = gates.filter((g) => g.capability === "DOMESTIC").length;
    const international = gates.filter((g) => g.capability === "INTERNATIONAL").length;
    const both = gates.filter((g) => g.capability === "BOTH").length;
    return { total, domestic, international, both };
  }, [gates]);

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

  const getPriorityBadgeClass = (priority: string) => {
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

  const canRunSolver =
    selectedAirportId !== null &&
    selectedFlightIds.length > 0 &&
    gates.length > 0 &&
    !isSolving;

  return (
    <div className="space-y-6">
      {/* 1. Airport Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                1
              </span>
              Target Airport Selection
            </span>
            {selectedAirport && (
              <Badge variant="outline" className="font-mono text-xs">
                {selectedAirport.iata_code} • {selectedAirport.city}, {selectedAirport.country}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Select
                label="Select Operating Airport"
                value={selectedAirportId || ""}
                onChange={(e) => onSelectAirport(Number(e.target.value))}
                hint="Gate allocation is solved within the operational topology of this airport."
              >
                <option value="" disabled>
                  -- Select an Airport --
                </option>
                {airports.map((airport) => (
                  <option key={airport.id} value={airport.id}>
                    {airport.iata_code} - {airport.name} ({airport.city})
                  </option>
                ))}
              </Select>
            </div>

            {selectedAirport && (
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedAirport.name}
                  </span>
                  <p className="text-zinc-500 text-[11px] font-mono">
                    ICAO: {selectedAirport.icao_code} | TZ: {selectedAirport.timezone}
                  </p>
                </div>
                <Badge variant="success">Active Facility</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Gate Topology Review */}
      {selectedAirportId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  2
                </span>
                Available Gate Topology
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {isLoadingGates ? "Loading..." : `${gateStats.total} active gates available`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingGates ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : gates.length === 0 ? (
              <div className="p-4 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ No active gates found at this airport. Please create or activate gates in Gate Management before solving.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gate Capability Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-zinc-400 uppercase">Total Gates</div>
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{gateStats.total}</div>
                  </div>
                  <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-zinc-400 uppercase">Dual-Use (Both)</div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400">{gateStats.both}</div>
                  </div>
                  <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-zinc-400 uppercase">Domestic Only</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{gateStats.domestic}</div>
                  </div>
                  <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-zinc-400 uppercase">International Only</div>
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">{gateStats.international}</div>
                  </div>
                </div>

                {/* Gate Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                  {gates.map((gate) => (
                    <span
                      key={gate.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-700 dark:text-zinc-300"
                      title={`Capability: ${gate.capability} | Max Size: ${gate.max_aircraft_size || "Any"}`}
                    >
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{gate.gate_code}</span>
                      <span className="text-[9px] text-zinc-400">({gate.capability.charAt(0)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Flight Manifest Selection */}
      {selectedAirportId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  3
                </span>
                Target Flight Manifest Selection
                <Badge variant={selectedFlightIds.length > 0 ? "info" : "secondary"} className="ml-2">
                  {selectedFlightIds.length} of {flights.length} selected
                </Badge>
              </CardTitle>

              {/* Selection Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAllFlights}
                  disabled={isLoadingFlights || flights.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeselectAllFlights}
                  disabled={isLoadingFlights || selectedFlightIds.length === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Filter */}
            <div className="mb-3">
              <Input
                placeholder="Search manifest by flight number, airline, type, or priority..."
                value={flightSearchTerm}
                onChange={(e) => setFlightSearchTerm(e.target.value)}
              />
            </div>

            {isLoadingFlights ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="p-6 text-center rounded-md border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                {flights.length === 0
                  ? "No scheduled flights found for this airport. Add flights in Flight Management."
                  : "No flights matched your filter search."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800 max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          checked={
                            filteredFlights.length > 0 &&
                            filteredFlights.every((f) => selectedFlightIds.includes(f.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectAllFlights();
                            } else {
                              onDeselectAllFlights();
                            }
                          }}
                        />
                      </th>
                      <th className="p-2.5">Flight</th>
                      <th className="p-2.5">Airline</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5">Arrival</th>
                      <th className="p-2.5">Departure</th>
                      <th className="p-2.5">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredFlights.map((flight) => {
                      const isChecked = selectedFlightIds.includes(flight.id);
                      return (
                        <tr
                          key={flight.id}
                          onClick={() => onToggleFlight(flight.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              checked={isChecked}
                              onChange={() => onToggleFlight(flight.id)}
                            />
                          </td>
                          <td className="p-2.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {flight.flight_number}
                          </td>
                          <td className="p-2.5 text-zinc-600 dark:text-zinc-400">
                            {flight.airline}
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {flight.flight_type}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(
                                flight.priority
                              )}`}
                            >
                              {flight.priority}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {formatTime(flight.scheduled_arrival)}{" "}
                            <span className="text-[9px] text-zinc-400">({formatDate(flight.scheduled_arrival)})</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {formatTime(flight.scheduled_departure)}{" "}
                            <span className="text-[9px] text-zinc-400">({formatDate(flight.scheduled_departure)})</span>
                          </td>
                          <td className="p-2.5 font-mono text-zinc-500">
                            {flight.turnaround_duration_minutes}m
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. CSP Strategy & Scheduling Parameters */}
      {selectedAirportId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                4
              </span>
              CSP Solver Strategy & Safety Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strategy Selection Radio Cards */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Select CSP Search Strategy
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Backtracking with CP */}
                <div
                  onClick={() => onChangeStrategy("BACKTRACKING_WITH_CONSTRAINT_PROPAGATION")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    strategy === "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Backtracking + Constraint Propagation
                    </span>
                    <Badge variant="info">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Applies Forward Checking & AC-3 arc consistency. Proactively prunes gate domains upon each assignment, dramatically minimizing search tree backtracks.
                  </p>
                </div>

                {/* Pure Backtracking */}
                <div
                  onClick={() => onChangeStrategy("BACKTRACKING")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    strategy === "BACKTRACKING"
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-zinc-400" />
                      Pure Backtracking Search
                    </span>
                    <Badge variant="secondary">Baseline</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Chronological backtracking search with MRV (Minimum Remaining Values) and LCV (Least Constraining Value) variable ordering.
                  </p>
                </div>
              </div>
            </div>

            {/* Inter-flight Buffer Minutes */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <Input
                  type="number"
                  label="Inter-Flight Gate Buffer (Minutes)"
                  min={0}
                  max={60}
                  step={5}
                  value={bufferMinutes}
                  onChange={(e) => onChangeBufferMinutes(Math.max(0, Math.min(60, Number(e.target.value))))}
                  hint="Mandatory safety cushion between consecutive aircraft occupying the same gate."
                />
              </div>

              <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 block">
                  Gate Occupancy Rule:
                </span>
                <p className="font-mono text-[10px]">
                  occupancy_start = arrival_time
                  <br />
                  occupancy_end = departure_time
                </p>
                <p className="text-[10px] text-zinc-500">
                  Buffer enforces: <code className="font-mono">flight_2.start ≥ flight_1.end + {bufferMinutes}m</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Launch Action Bar */}
      {selectedAirportId && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Ready to solve: </span>
            <span className="font-mono">
              {selectedFlightIds.length} flights • {gates.length} gates • {bufferMinutes}m buffer • {strategy}
            </span>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={onRunSolver}
            disabled={!canRunSolver}
            className="w-full sm:w-auto shadow-md"
          >
            {isSolving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Solving Constraints...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Run AI CSP Solver
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
