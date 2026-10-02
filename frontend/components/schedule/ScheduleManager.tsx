"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Airport, Flight } from "@/types/flight";
import { Gate, Terminal } from "@/types/gate";
import { Assignment, Conflict, GanttZoomLevel } from "@/types/schedule";
import { getAirports, getFlights } from "@/lib/api/flights";
import { getGates, getTerminals } from "@/lib/api/gates";
import { getAssignments, getConflicts } from "@/lib/api/schedule";
import { ScheduleSummaryCards } from "./ScheduleSummaryCards";
import { ScheduleControls } from "./ScheduleControls";
import { GanttTimeline } from "./GanttTimeline";
import { FlightDetailModal } from "./FlightDetailModal";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { Button } from "@/components/ui/Button";

export function ScheduleManager() {
  // 1. Filter States
  const getTodayString = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedAirportId, setSelectedAirportId] = useState<number | null>(null);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [zoom, setZoom] = useState<GanttZoomLevel>("24h");

  // 2. Data States
  const [airports, setAirports] = useState<Airport[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // 3. UI & Modal States
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Fetch initial airports
  useEffect(() => {
    let isMounted = true;
    async function loadAirports() {
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
    loadAirports();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch schedule data for selected airport
  const loadScheduleData = useCallback(async (airportId: number) => {
    setError(null);
    try {
      const [terminalsRes, gatesRes, flightsRes, assignmentsRes, conflictsRes] =
        await Promise.all([
          getTerminals(airportId, 100),
          getGates({ airport_id: airportId, is_active: true, page_size: 100 }),
          getFlights({ airport_id: airportId, page_size: 100 }),
          getAssignments({ airport_id: airportId, page_size: 100 }),
          getConflicts({ airport_id: airportId, is_resolved: false, page_size: 100 }),
        ]);

      setTerminals(terminalsRes.items);
      setGates(gatesRes.items);
      setFlights(flightsRes.items);
      setAssignments(assignmentsRes.items);
      setConflicts(conflictsRes.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch airport schedule data";
      setError(msg);
    }
  }, []);

  // Trigger data fetch when selectedAirportId changes
  useEffect(() => {
    if (!selectedAirportId) return;
    const airportId = selectedAirportId;
    let isMounted = true;

    async function fetchData() {
      setIsRefreshing(true);
      await loadScheduleData(airportId);
      if (isMounted) setIsRefreshing(false);
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedAirportId, loadScheduleData]);

  // Handle explicit refresh button click
  const handleRefresh = async () => {
    if (!selectedAirportId) return;
    setIsRefreshing(true);
    await loadScheduleData(selectedAirportId);
    setIsRefreshing(false);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedTerminalId(null);
    setSelectedGateId(null);
    setSelectedStatus("ALL");
    setSearchTerm("");
    setZoom("24h");
  };

  // Filter gates based on terminal and gate selection
  const filteredGates = useMemo(() => {
    return gates.filter((gate) => {
      if (selectedTerminalId && gate.terminal_id !== selectedTerminalId) return false;
      if (selectedGateId && gate.id !== selectedGateId) return false;
      return true;
    });
  }, [gates, selectedTerminalId, selectedGateId]);

  // Filter assignments based on controls, status, and search
  const filteredAssignments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return assignments.filter((asg) => {
      // 1. Status filter
      if (selectedStatus !== "ALL" && asg.status !== selectedStatus) {
        return false;
      }

      // 2. Gate filter
      if (selectedGateId && asg.gate_id !== selectedGateId) {
        return false;
      }

      // 3. Terminal filter
      if (selectedTerminalId) {
        const gate = gates.find((g) => g.id === asg.gate_id);
        if (!gate || gate.terminal_id !== selectedTerminalId) return false;
      }

      // 4. Search term (Flight number, airline, or gate code)
      if (term) {
        const flightNum = (asg.flight_number || "").toLowerCase();
        const airline = (asg.airline || "").toLowerCase();
        const gateCode = (asg.gate_code || "").toLowerCase();
        const matchesFlight = flightNum.includes(term);
        const matchesAirline = airline.includes(term);
        const matchesGate = gateCode.includes(term);

        // Also check loaded flight entity if available
        const flightObj = flights.find((f) => f.id === asg.flight_id);
        const matchesFlightObj =
          flightObj &&
          (flightObj.flight_number.toLowerCase().includes(term) ||
            flightObj.airline.toLowerCase().includes(term));

        if (!matchesFlight && !matchesAirline && !matchesGate && !matchesFlightObj) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, selectedStatus, selectedGateId, selectedTerminalId, searchTerm, gates, flights]);

  // Compute summary statistics from factual data
  const summary = useMemo(() => {
    const totalFlightsCount = flights.length;
    const assignedFlightIds = new Set(filteredAssignments.map((a) => a.flight_id));
    const assignedCount = assignedFlightIds.size;
    const occupiedGateIds = new Set(filteredAssignments.map((a) => a.gate_id));
    const gatesUsedCount = occupiedGateIds.size;
    const totalGatesCount = gates.length;
    const conflictsCount = conflicts.length;

    return {
      totalFlights: totalFlightsCount,
      assignedFlights: assignedCount,
      gatesUsed: gatesUsedCount,
      totalGates: totalGatesCount,
      conflictsCount,
    };
  }, [flights, filteredAssignments, gates, conflicts]);

  // Selected assignment detail entities
  const selectedDetails = useMemo(() => {
    if (!selectedAssignment) {
      return { flight: null, gate: null, terminal: null, conflict: null };
    }
    const flight = flights.find((f) => f.id === selectedAssignment.flight_id) || null;
    const gate = gates.find((g) => g.id === selectedAssignment.gate_id) || null;
    const terminal =
      gate && gate.terminal_id
        ? terminals.find((t) => t.id === gate.terminal_id) || null
        : null;
    const conflict =
      conflicts.find(
        (c) =>
          c.flight_id === selectedAssignment.flight_id ||
          c.gate_id === selectedAssignment.gate_id
      ) || null;

    return { flight, gate, terminal, conflict };
  }, [selectedAssignment, flights, gates, terminals, conflicts]);

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
          Loading airport schedule and gate assignments...
        </p>
      </div>
    );
  }

  if (airports.length === 0 && !error) {
    return (
      <EmptyState
        title="No Active Airports Configured"
        description="The system requires at least one active airport facility to display the Gantt schedule."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </span>
            Airport Gate Occupancy Gantt Schedule
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Real-time gate allocation timeline based on factual backend assignments.
            Visualizes gate occupancy (arrival to departure), terminal topologies, and operational conflicts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/scheduler">
            <Button variant="outline" size="sm">
              <svg
                className="w-3.5 h-3.5 mr-1.5 text-blue-600"
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
              AI Scheduler
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error Display */}
      {error && (
        <ErrorState
          title="Schedule Loading Error"
          description="Failed to load gate assignments."
          error={error}
          onRetry={handleRefresh}
        />
      )}

      {/* 3. Summary Cards */}
      <ScheduleSummaryCards
        totalFlights={summary.totalFlights}
        assignedFlights={summary.assignedFlights}
        gatesUsed={summary.gatesUsed}
        totalGates={summary.totalGates}
        conflictsCount={summary.conflictsCount}
      />

      {/* 4. Controls & Filters */}
      <ScheduleControls
        airports={airports}
        selectedAirportId={selectedAirportId}
        onSelectAirport={(id) => {
          setSelectedAirportId(id);
          setSelectedTerminalId(null);
          setSelectedGateId(null);
        }}
        terminals={terminals}
        selectedTerminalId={selectedTerminalId}
        onSelectTerminal={setSelectedTerminalId}
        gates={gates}
        selectedGateId={selectedGateId}
        onSelectGate={setSelectedGateId}
        selectedDate={selectedDate}
        onChangeDate={setSelectedDate}
        selectedStatus={selectedStatus}
        onChangeStatus={setSelectedStatus}
        searchTerm={searchTerm}
        onChangeSearchTerm={setSearchTerm}
        zoom={zoom}
        onChangeZoom={setZoom}
        onRefresh={handleRefresh}
        onResetFilters={handleResetFilters}
        isRefreshing={isRefreshing}
      />

      {/* 5. Main Gantt View or Empty States */}
      {assignments.length === 0 && !isRefreshing ? (
        <div className="p-10 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex justify-center text-zinc-400">
            <svg
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Gate Assignments Available For This Period
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            There are currently no gate assignments recorded in the database for this airport.
            Execute the CSP AI Scheduler to compute an optimal schedule.
          </p>
          <div className="pt-2">
            <Link href="/scheduler">
              <Button variant="primary" size="sm">
                Run AI Scheduler
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredAssignments.length === 0 && assignments.length > 0 ? (
        <div className="p-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Flights Match The Selected Filters
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing specific gate/terminal filters, or resetting filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <GanttTimeline
          date={selectedDate}
          terminals={terminals}
          gates={filteredGates}
          assignments={filteredAssignments}
          flights={flights}
          conflicts={conflicts}
          zoom={zoom}
          onSelectAssignment={(asg) => setSelectedAssignment(asg)}
          selectedAssignmentId={selectedAssignment?.id}
        />
      )}

      {/* 6. Flight Details Modal */}
      <FlightDetailModal
        isOpen={selectedAssignment !== null}
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        flight={selectedDetails.flight}
        gate={selectedDetails.gate}
        terminal={selectedDetails.terminal}
        conflict={selectedDetails.conflict}
      />
    </div>
  );
}
