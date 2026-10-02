"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FlightSimStatus,
  GateAllocationStatus,
  SimulatedFlightRoute,
  SimulationEvent,
  SimulationSpeed,
} from "@/types/simulation";
import { DelayReason } from "@/types/flight";
import { applyFlightDelay } from "@/lib/api/flights";
import { loadMapNetworkData, MapDataPayload } from "@/lib/api/map";
import { requestSimulationGateAllocation } from "@/lib/api/simulation";
import {
  calculateSimulationTimeBounds,
  computeFlightSimState,
  computeSimulationMetrics,
} from "@/lib/utils/simulation";
import { SimulationControls } from "./SimulationControls";
import { SimulationDashboard } from "./SimulationDashboard";
import { SimulationEventLog } from "./SimulationEventLog";
import { SimulationFlightPanel } from "./SimulationFlightPanel";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { Button } from "@/components/ui/Button";

// Dynamic import of WorldMapCanvas for zero SSR Leaflet issues
const WorldMapCanvas = dynamic(
  () => import("../map/WorldMapCanvas").then((mod) => mod.WorldMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono text-xs">
        <svg
          className="animate-spin h-7 w-7 text-blue-600 mb-2"
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
        Initializing Interactive Simulation Canvas...
      </div>
    ),
  }
);

export function SimulationManager() {
  // 1. Backend Data State
  const [data, setData] = useState<MapDataPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Simulation Clock State
  const [simTimeBounds, setSimTimeBounds] = useState<{ startMs: number; endMs: number }>({
    startMs: Date.now(),
    endMs: Date.now() + 3600000,
  });
  const [simTimeMs, setSimTimeMs] = useState<number>(Date.now());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  // 3. Selection & Event State
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);

  // 4. Dynamic Gate Allocation Status Tracker
  const [flightGateStatuses, setFlightGateStatuses] = useState<
    Record<number, { status: GateAllocationStatus; error?: string }>
  >({});
  const [isManualAllocating, setIsManualAllocating] = useState<boolean>(false);
  const [isDelaying, setIsDelaying] = useState<boolean>(false);

  // Refs for animation loop, transition tracking, and allocation deduplication
  const animationFrameRef = useRef<number | null>(null);
  const lastRealTimeRef = useRef<number | null>(null);
  const prevFlightStatesRef = useRef<Map<number, FlightSimStatus>>(new Map());
  const allocatedFlightIdsRef = useRef<Set<number>>(new Set());

  // Load real network data from backend
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const payload = await loadMapNetworkData();
      setData(payload);
      const bounds = calculateSimulationTimeBounds(payload.routes);
      setSimTimeBounds(bounds);
      setSimTimeMs(bounds.startMs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load simulation network data";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      await loadData();
      if (isMounted) setIsLoading(false);
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Centralized Simulation Clock Loop (using requestAnimationFrame)
  useEffect(() => {
    if (!isPlaying) {
      lastRealTimeRef.current = null;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (lastRealTimeRef.current === null) {
        lastRealTimeRef.current = now;
      }

      const deltaRealMs = now - lastRealTimeRef.current;
      lastRealTimeRef.current = now;

      // Rate: 1 real second = 60 simulation seconds (1 sim minute) at 1× speed
      const deltaSimMs = deltaRealMs * speed * 60;

      setSimTimeMs((prev) => {
        const next = prev + deltaSimMs;
        if (next >= simTimeBounds.endMs) {
          setIsPlaying(false);
          return simTimeBounds.endMs;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, speed, simTimeBounds.endMs]);

  // Pure CSP Gate Allocation Trigger
  const triggerGateAllocation = useCallback(
    async (flightId: number, currentSimMs: number) => {
      if (allocatedFlightIdsRef.current.has(flightId)) return;
      allocatedFlightIdsRef.current.add(flightId);

      const targetRoute = data?.routes.find((r) => r.flight.id === flightId);
      if (!targetRoute) return;

      setFlightGateStatuses((prev) => ({
        ...prev,
        [flightId]: { status: "REQUESTING" },
      }));

      const simTimeFormatted = new Date(currentSimMs).toUTCString().slice(17, 25);
      setEvents((prev) => [
        {
          id: `${flightId}-gate-req-${currentSimMs}`,
          simTimeIso: new Date(currentSimMs).toISOString(),
          simTimeFormatted: `${simTimeFormatted} UTC`,
          simTimeMs: currentSimMs,
          flightId,
          flightNumber: targetRoute.flight.flight_number,
          airline: targetRoute.flight.airline,
          eventType: "GATE_ALLOCATION_REQUESTED",
          description: `Approaching ${targetRoute.destinationAirport.iata_code} (progress ${(
            targetRoute.progress * 100
          ).toFixed(0)}%) - requesting AI gate allocation`,
        },
        ...prev,
      ]);

      try {
        const res = await requestSimulationGateAllocation({
          flight_id: flightId,
          simulation_time: new Date(currentSimMs).toISOString(),
          inter_flight_buffer_minutes: 10,
        });

        if (res.success && res.gate_code) {
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              routes: prevData.routes.map((r) =>
                r.flight.id === flightId
                  ? {
                      ...r,
                      assignedGateCode: res.gate_code,
                      assignedTerminalCode: res.terminal_code ?? "T1",
                    }
                  : r
              ),
            };
          });

          setFlightGateStatuses((prev) => ({
            ...prev,
            [flightId]: { status: "ASSIGNED" },
          }));

          setEvents((prev) => [
            {
              id: `${flightId}-gate-ok-${currentSimMs}`,
              simTimeIso: new Date(currentSimMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs: currentSimMs,
              flightId,
              flightNumber: targetRoute.flight.flight_number,
              airline: targetRoute.flight.airline,
              eventType: "GATE_ASSIGNED",
              description: `Gate ${res.gate_code} (${res.terminal_code ?? "T1"}) allocated by CSP Engine at ${targetRoute.destinationAirport.iata_code}`,
            },
            ...prev,
          ]);
        } else {
          setFlightGateStatuses((prev) => ({
            ...prev,
            [flightId]: {
              status: "FAILED",
              error: res.message || "No compatible gate available",
            },
          }));

          setEvents((prev) => [
            {
              id: `${flightId}-gate-fail-${currentSimMs}`,
              simTimeIso: new Date(currentSimMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs: currentSimMs,
              flightId,
              flightNumber: targetRoute.flight.flight_number,
              airline: targetRoute.flight.airline,
              eventType: "GATE_ALLOCATION_FAILED",
              description: `No gate available at ${targetRoute.destinationAirport.iata_code}: ${res.message}`,
            },
            ...prev,
          ]);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Allocation request failed";
        setFlightGateStatuses((prev) => ({
          ...prev,
          [flightId]: { status: "FAILED", error: errMsg },
        }));
        setEvents((prev) => [
          {
            id: `${flightId}-gate-err-${currentSimMs}`,
            simTimeIso: new Date(currentSimMs).toISOString(),
            simTimeFormatted: `${simTimeFormatted} UTC`,
            simTimeMs: currentSimMs,
            flightId,
            flightNumber: targetRoute.flight.flight_number,
            airline: targetRoute.flight.airline,
            eventType: "GATE_ALLOCATION_FAILED",
            description: `Allocation API error: ${errMsg}`,
          },
          ...prev,
        ]);
      }
    },
    [data]
  );

  // Manual Trigger handler from panel
  const handleManualAllocateGate = useCallback(
    async (flightId: number) => {
      setIsManualAllocating(true);
      await triggerGateAllocation(flightId, simTimeMs);
      setIsManualAllocating(false);
    },
    [triggerGateAllocation, simTimeMs]
  );

  // Dynamic Delay & CSP Rescheduling Handler (Phase 13)
  const handleApplyFlightDelay = useCallback(
    async (flightId: number, delayMinutes: number, reason: DelayReason) => {
      setIsDelaying(true);
      try {
        const res = await applyFlightDelay(flightId, {
          delay_minutes: delayMinutes,
          reason,
          reschedule_if_conflict: true,
        });

        if (res.success) {
          // Synchronize flight route and operational timing across state
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              routes: prevData.routes.map((r) => {
                if (r.flight.id === flightId) {
                  return {
                    ...r,
                    flight: {
                      ...r.flight,
                      delay_duration_minutes: res.delay_minutes,
                      delay_reason: res.delay_reason,
                      actual_arrival: res.operational_arrival,
                      actual_departure: res.operational_departure,
                      status: "DELAYED",
                    },
                    assignedGateCode: res.current_gate_code ?? r.assignedGateCode,
                    assignedTerminalCode: res.current_terminal_code ?? r.assignedTerminalCode,
                  };
                }
                return r;
              }),
            };
          });

          // Log generated simulation events into live stream
          const simTimeFormatted = new Date(simTimeMs).toUTCString().slice(17, 25);
          const newEvs: SimulationEvent[] = [
            {
              id: `${flightId}-delay-${Date.now()}`,
              simTimeIso: new Date(simTimeMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs,
              flightId,
              flightNumber: res.flight_number,
              airline: res.airline,
              eventType: "DELAY_APPLIED",
              description: `Applied +${res.delay_minutes}m delay (${res.delay_reason}) to ${res.flight_number}`,
            },
          ];

          if (res.has_conflict) {
            newEvs.push({
              id: `${flightId}-conflict-${Date.now()}`,
              simTimeIso: new Date(simTimeMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs,
              flightId,
              flightNumber: res.flight_number,
              airline: res.airline,
              eventType: "GATE_CONFLICT_DETECTED",
              description: `Gate collision on ${res.previous_gate_code} detected after delay`,
            });
          }

          if (res.rescheduled && res.current_gate_code) {
            newEvs.push({
              id: `${flightId}-reassigned-${Date.now()}`,
              simTimeIso: new Date(simTimeMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs,
              flightId,
              flightNumber: res.flight_number,
              airline: res.airline,
              eventType: "GATE_REASSIGNED",
              description: `Reassigned from Gate ${res.previous_gate_code} to Gate ${res.current_gate_code} (${res.current_terminal_code}) via CSP AI Engine`,
            });
            newEvs.push({
              id: `${flightId}-resolved-${Date.now()}`,
              simTimeIso: new Date(simTimeMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs,
              flightId,
              flightNumber: res.flight_number,
              airline: res.airline,
              eventType: "CONFLICT_RESOLVED",
              description: `Gate conflict resolved by CSP Dynamic Rescheduler`,
            });
          } else if (res.status === "NO_GATE_AVAILABLE") {
            newEvs.push({
              id: `${flightId}-fail-${Date.now()}`,
              simTimeIso: new Date(simTimeMs).toISOString(),
              simTimeFormatted: `${simTimeFormatted} UTC`,
              simTimeMs,
              flightId,
              flightNumber: res.flight_number,
              airline: res.airline,
              eventType: "RESCHEDULING_FAILED",
              description: `No compatible replacement gate available satisfying hard constraints`,
            });
          }

          setEvents((prev) => [...newEvs, ...prev]);
        }
      } finally {
        setIsDelaying(false);
      }
    },
    [simTimeMs]
  );

  // Compute simulated flight positions at current simTimeMs
  const simulatedRoutes: SimulatedFlightRoute[] = useMemo(() => {
    if (!data) return [];
    return data.routes.map((route) => {
      const simRoute = computeFlightSimState(route, simTimeMs);
      const gateStatus = flightGateStatuses[route.flight.id];
      return {
        ...simRoute,
        gateAllocationStatus:
          gateStatus?.status ?? (simRoute.assignedGateCode ? "ASSIGNED" : "UNASSIGNED"),
        gateAllocationError: gateStatus?.error ?? null,
      };
    });
  }, [data, simTimeMs, flightGateStatuses]);

  // Track state transitions, log events without duplicates, and trigger gate allocation on approach
  useEffect(() => {
    if (simulatedRoutes.length === 0) return;

    const newEvents: SimulationEvent[] = [];
    const currentStates = new Map<number, FlightSimStatus>();

    simulatedRoutes.forEach((simFlight) => {
      const id = simFlight.flight.id;
      const currentStatus = simFlight.simStatus;
      currentStates.set(id, currentStatus);

      const prevStatus = prevFlightStatesRef.current.get(id);

      if (prevStatus) {
        // Transition 1: BEFORE_DEPARTURE -> IN_FLIGHT
        if (prevStatus === "BEFORE_DEPARTURE" && currentStatus === "IN_FLIGHT") {
          const simTimeFormatted = new Date(simTimeMs)
            .toUTCString()
            .slice(17, 25);
          newEvents.push({
            id: `${id}-dep-${simTimeMs}`,
            simTimeIso: new Date(simTimeMs).toISOString(),
            simTimeFormatted: `${simTimeFormatted} UTC`,
            simTimeMs,
            flightId: id,
            flightNumber: simFlight.flight.flight_number,
            airline: simFlight.flight.airline,
            eventType: "FLIGHT_DEPARTED",
            description: `DEPARTED ${simFlight.originAirport.iata_code} for ${simFlight.destinationAirport.iata_code}`,
          });
        }

        // Transition 2: IN_FLIGHT -> ARRIVED
        if (prevStatus === "IN_FLIGHT" && currentStatus === "ARRIVED") {
          const simTimeFormatted = new Date(simTimeMs)
            .toUTCString()
            .slice(17, 25);
          newEvents.push({
            id: `${id}-arr-${simTimeMs}`,
            simTimeIso: new Date(simTimeMs).toISOString(),
            simTimeFormatted: `${simTimeFormatted} UTC`,
            simTimeMs,
            flightId: id,
            flightNumber: simFlight.flight.flight_number,
            airline: simFlight.flight.airline,
            eventType: "FLIGHT_ARRIVED",
            description: `ARRIVED ${simFlight.destinationAirport.iata_code} from ${simFlight.originAirport.iata_code}`,
          });
        }
      }

      // Operational Rule: When flight is en route and approaches destination (progress >= 0.70),
      // evaluate gate assignment via AI CSP Solver if not already allocated or pending
      if (
        simFlight.simStatus === "IN_FLIGHT" &&
        simFlight.simProgress >= 0.7 &&
        !simFlight.assignedGateCode &&
        !allocatedFlightIdsRef.current.has(id)
      ) {
        triggerGateAllocation(id, simTimeMs);
      }
    });

    prevFlightStatesRef.current = currentStates;

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev]);
    }
  }, [simulatedRoutes, simTimeMs, triggerGateAllocation]);

  // Compute live dashboard metrics
  const metrics = useMemo(() => {
    return computeSimulationMetrics(simulatedRoutes);
  }, [simulatedRoutes]);

  // Selected flight entity
  const selectedFlight = useMemo(() => {
    if (!selectedFlightId) return null;
    return simulatedRoutes.find((r) => r.flight.id === selectedFlightId) || null;
  }, [simulatedRoutes, selectedFlightId]);

  // Reset handler
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSimTimeMs(simTimeBounds.startMs);
    prevFlightStatesRef.current.clear();
    allocatedFlightIdsRef.current.clear();
    setFlightGateStatuses({});
    setEvents([]);
    setSelectedFlightId(null);
  }, [simTimeBounds.startMs]);

  // Seeking handler
  const handleSeek = useCallback((targetMs: number) => {
    setSimTimeMs(targetMs);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <svg
          className="animate-spin h-9 w-9 text-blue-600 mb-3"
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
          Initializing flight simulation timeline and trajectory models...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Simulation Initialization Error"
        description="Failed to load real flight data for simulation."
        error={error}
        onRetry={loadData}
      />
    );
  }

  if (!data || data.routes.length === 0) {
    return (
      <EmptyState
        title="No Scheduled Flights Available For Simulation"
        description="The simulation requires active scheduled flights in the database. Add flights in Flight Management or generate allocations with the AI Scheduler."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              ✈
            </span>
            Animated Flight Operations Simulation
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Time-driven simulation engine advancing aircraft along genuine great-circle flight routes with
            dynamic pure Python CSP AI gate allocation upon approaching destination.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/map">
            <Button variant="outline" size="sm">
              Airspace Map
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="outline" size="sm">
              Gantt Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Simulation Dashboard Metrics */}
      <SimulationDashboard metrics={metrics} />

      {/* 3. Primary Simulation Controls & Clock Bar */}
      <SimulationControls
        simTimeMs={simTimeMs}
        startMs={simTimeBounds.startMs}
        endMs={simTimeBounds.endMs}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReset={handleReset}
        speed={speed}
        onChangeSpeed={setSpeed}
        onSeek={handleSeek}
      />

      {/* 4. Interactive Simulation Map Canvas with Overlays */}
      <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md">
        {/* Leaflet Map Canvas */}
        <WorldMapCanvas
          airports={data.airports}
          routes={simulatedRoutes}
          selectedEntity={
            selectedFlight
              ? { type: "flight", data: selectedFlight }
              : null
          }
          onSelectFlight={(route) => setSelectedFlightId(route.flight.id)}
          onSelectAirport={() => {}}
        />

        {/* Floating Flight Details Panel (Top-Right) */}
        {selectedFlight && (
          <div className="absolute top-4 right-4 z-20 w-80 sm:w-96">
            <SimulationFlightPanel
              flight={selectedFlight}
              onClose={() => setSelectedFlightId(null)}
              onAllocateGate={handleManualAllocateGate}
              isAllocating={isManualAllocating}
              onApplyDelay={handleApplyFlightDelay}
              isApplyingDelay={isDelaying}
            />
          </div>
        )}

        {/* Floating Simulation Event Log (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 w-80 sm:w-96">
          <SimulationEventLog events={events} />
        </div>
      </div>
    </div>
  );
}
