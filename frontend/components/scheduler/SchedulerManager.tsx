"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Airport, Flight } from "@/types/flight";
import { Gate } from "@/types/gate";
import {
  ScheduleSolveResponseData,
  SolverStrategyOption,
} from "@/types/scheduling";
import { getAirports, getFlights } from "@/lib/api/flights";
import { getGates } from "@/lib/api/gates";
import { solveSchedule } from "@/lib/api/scheduling";
import { SchedulerConfiguration } from "./SchedulerConfiguration";
import { SolverMetricsPanel } from "./SolverMetricsPanel";
import { SolverResultView } from "./SolverResultView";
import { ReasoningEventsPanel } from "./ReasoningEventsPanel";
import { ErrorState, EmptyState } from "@/components/ui/FeedbackStates";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function SchedulerManager() {
  // 1. Airport & Entity State
  const [airports, setAirports] = useState<Airport[]>([]);
  const [selectedAirportId, setSelectedAirportId] = useState<number | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightIds, setSelectedFlightIds] = useState<number[]>([]);

  // 2. Scheduler Configuration State
  const [strategy, setStrategy] = useState<SolverStrategyOption>(
    "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
  );
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);

  // 3. Execution & Telemetry State
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingGates, setIsLoadingGates] = useState(false);
  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solveResult, setSolveResult] = useState<ScheduleSolveResponseData | null>(null);

  // Load initial airports list
  useEffect(() => {
    let isMounted = true;
    async function fetchInitialAirports() {
      setIsLoadingInitial(true);
      setError(null);
      try {
        const response = await getAirports(100);
        if (!isMounted) return;
        const activeAirports = response.items.filter((a) => a.is_active);
        setAirports(activeAirports);
        if (activeAirports.length > 0) {
          setSelectedAirportId(activeAirports[0].id);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load airports";
        setError(msg);
      } finally {
        if (isMounted) setIsLoadingInitial(false);
      }
    }
    fetchInitialAirports();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch gates & flights whenever selectedAirportId changes
  useEffect(() => {
    if (!selectedAirportId) {
      setGates([]);
      setFlights([]);
      setSelectedFlightIds([]);
      return;
    }

    let isMounted = true;

    const airportId = selectedAirportId;
    async function fetchAirportEntities() {
      setIsLoadingGates(true);
      setIsLoadingFlights(true);
      setError(null);

      try {
        // Fetch gates belonging to this airport's terminals
        const gatesResponse = await getGates({
          airport_id: airportId,
          is_active: true,
          page_size: 100,
        });

        // Fetch flights arriving or departing at this airport
        const flightsResponse = await getFlights({
          airport_id: airportId,
          page_size: 100,
        });

        if (!isMounted) return;
        setGates(gatesResponse.items);
        setFlights(flightsResponse.items);
        // By default select all available flights for convenience
        setSelectedFlightIds(flightsResponse.items.map((f) => f.id));
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load airport operational data";
        setError(msg);
      } finally {
        if (isMounted) {
          setIsLoadingGates(false);
          setIsLoadingFlights(false);
        }
      }
    }

    fetchAirportEntities();

    return () => {
      isMounted = false;
    };
  }, [selectedAirportId]);

  // Airport selection handler
  const handleSelectAirport = useCallback((airportId: number) => {
    setSelectedAirportId(airportId);
    setSolveResult(null);
  }, []);

  // Flight checkbox toggle
  const handleToggleFlight = useCallback((flightId: number) => {
    setSelectedFlightIds((prev) =>
      prev.includes(flightId) ? prev.filter((id) => id !== flightId) : [...prev, flightId]
    );
  }, []);

  // Select all / deselect all flights
  const handleSelectAllFlights = useCallback(() => {
    setSelectedFlightIds(flights.map((f) => f.id));
  }, [flights]);

  const handleDeselectAllFlights = useCallback(() => {
    setSelectedFlightIds([]);
  }, []);

  // Execute solver
  const handleRunSolver = async () => {
    if (!selectedAirportId) return;
    if (selectedFlightIds.length === 0) {
      setError("Please select at least one flight to allocate gates for.");
      return;
    }

    setIsSolving(true);
    setError(null);

    try {
      const response = await solveSchedule({
        airport_id: selectedAirportId,
        flight_ids: selectedFlightIds,
        strategy,
        inter_flight_buffer_minutes: bufferMinutes,
      });

      setSolveResult(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "CSP solver execution failed.";
      setError(msg);
    } finally {
      setIsSolving(false);
    }
  };

  // Reset results and return to configuration
  const handleReset = () => {
    setSolveResult(null);
    setError(null);
  };

  // Re-run with the other strategy
  const handleToggleAndRerun = () => {
    const nextStrategy: SolverStrategyOption =
      strategy === "BACKTRACKING"
        ? "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"
        : "BACKTRACKING";
    setStrategy(nextStrategy);
    setSolveResult(null);
  };

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <svg
          className="animate-spin h-8 w-8 text-blue-600 mb-3"
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
        <p className="text-xs font-mono text-zinc-500">
          Connecting to airport topology and solver service...
        </p>
      </div>
    );
  }

  if (airports.length === 0 && !error) {
    return (
      <EmptyState
        title="No Active Airports Configured"
        description="The system requires at least one active airport facility with configured gates to execute CSP scheduling."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Context Description */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <svg
                  className="w-5 h-5"
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
              </span>
              AI CSP Gate Allocation Scheduler
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Automated Constraint Satisfaction Problem (CSP) solver engine for airport gate allocation.
              Applies pure Python MRV, LCV, Forward Checking, and AC-3 constraint propagation to enforce
              hard temporal overlaps, aircraft category capabilities, and safety buffer rules.
            </p>
          </div>

          {solveResult && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                New Solve / Reset
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Global Error Notice */}
      {error && (
        <ErrorState
          title="Scheduler Error"
          description="Failed to complete scheduling request."
          error={error}
          onRetry={() => {
            setError(null);
            if (!solveResult) {
              handleRunSolver();
            }
          }}
        />
      )}

      {/* Solving Indicator Overlay */}
      {isSolving && (
        <div className="p-8 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 text-center space-y-3">
          <div className="flex justify-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
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
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Running CSP AI Engine...
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Constructing flight variable domains, checking gate compatibility constraints,
            and executing {strategy === "BACKTRACKING" ? "Pure Backtracking search" : "Backtracking with Forward Checking & AC-3 propagation"}...
          </p>
        </div>
      )}

      {/* Mode A: Configuration View (when no solve result yet) */}
      {!solveResult && !isSolving && (
        <SchedulerConfiguration
          airports={airports}
          selectedAirportId={selectedAirportId}
          onSelectAirport={handleSelectAirport}
          gates={gates}
          isLoadingGates={isLoadingGates}
          flights={flights}
          isLoadingFlights={isLoadingFlights}
          selectedFlightIds={selectedFlightIds}
          onToggleFlight={handleToggleFlight}
          onSelectAllFlights={handleSelectAllFlights}
          onDeselectAllFlights={handleDeselectAllFlights}
          strategy={strategy}
          onChangeStrategy={setStrategy}
          bufferMinutes={bufferMinutes}
          onChangeBufferMinutes={setBufferMinutes}
          onRunSolver={handleRunSolver}
          isSolving={isSolving}
        />
      )}

      {/* Mode B: Results View (when solve has completed) */}
      {solveResult && !isSolving && (
        <div className="space-y-6">
          {/* Action Ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Execution Complete
              </span>
              <Badge variant={solveResult.success ? "success" : "danger"}>
                {solveResult.success ? "Feasible Schedule Found" : "Unsat / Conflicts Detected"}
              </Badge>
              {solveResult.solver_run_id && (
                <span className="font-mono text-zinc-500 text-[11px]">
                  Run #{solveResult.solver_run_id}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleAndRerun}>
                Switch to {strategy === "BACKTRACKING" ? "Forward Checking" : "Pure Backtrack"}
              </Button>
              <Button variant="primary" size="sm" onClick={handleReset}>
                New Configuration
              </Button>
            </div>
          </div>

          {/* 1. Performance Telemetry Panel */}
          <SolverMetricsPanel
            metrics={solveResult.metrics}
            strategy={solveResult.strategy}
          />

          {/* 2. Assignments & Conflict Results */}
          <SolverResultView
            success={solveResult.success}
            solverRunId={solveResult.solver_run_id}
            assignments={solveResult.assignments}
            unassignedFlights={solveResult.unassigned_flights}
            conflicts={solveResult.conflicts}
          />

          {/* 3. Chronological XAI Reasoning Events Panel */}
          <ReasoningEventsPanel
            events={solveResult.reasoning_events}
          />
        </div>
      )}
    </div>
  );
}
