"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Airport } from "@/types/flight";
import {
  AnalyticsOverview,
  ConflictAnalytics,
  FlightAnalytics,
  GateUtilization,
  ReschedulingAnalytics,
  SolverPerformance,
} from "@/types/analytics";
import { getAirports } from "@/lib/api/flights";
import {
  getAnalyticsOverview,
  getConflictAnalytics,
  getFlightAnalytics,
  getGateUtilization,
  getReschedulingAnalytics,
  getSolverPerformance,
  AnalyticsQueryOptions,
} from "@/lib/api/analytics";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { OverviewMetricCards } from "@/components/analytics/OverviewMetricCards";
import { FlightDistributionCharts } from "@/components/analytics/FlightDistributionCharts";
import { GateUtilizationSection } from "@/components/analytics/GateUtilizationSection";
import { ConflictAnalyticsSection } from "@/components/analytics/ConflictAnalyticsSection";
import { SolverPerformanceSection } from "@/components/analytics/SolverPerformanceSection";
import { ReschedulingSection } from "@/components/analytics/ReschedulingSection";

export default function AnalyticsPage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [selectedAirportId, setSelectedAirportId] = useState<number | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "ALL" | "TODAY" | "LAST_24H" | "LAST_7D"
  >("ALL");

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [flightAnalytics, setFlightAnalytics] = useState<FlightAnalytics | null>(null);
  const [gateUtilization, setGateUtilization] = useState<GateUtilization | null>(null);
  const [conflictAnalytics, setConflictAnalytics] = useState<ConflictAnalytics | null>(null);
  const [solverPerformance, setSolverPerformance] = useState<SolverPerformance | null>(null);
  const [reschedulingAnalytics, setReschedulingAnalytics] =
    useState<ReschedulingAnalytics | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load airports once
  useEffect(() => {
    getAirports(100)
      .then((res) => {
        setAirports(res.items || []);
      })
      .catch((err) => {
        console.error("Failed to load airports list:", err);
      });
  }, []);

  // Compute start/end time based on selectedTimeRange
  const getTimeBounds = useCallback(() => {
    const now = new Date();
    if (selectedTimeRange === "TODAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startTime: start.toISOString(), endTime: end.toISOString() };
    }
    if (selectedTimeRange === "LAST_24H") {
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { startTime: start.toISOString(), endTime: now.toISOString() };
    }
    if (selectedTimeRange === "LAST_7D") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startTime: start.toISOString(), endTime: now.toISOString() };
    }
    return { startTime: null, endTime: null };
  }, [selectedTimeRange]);

  // Load all analytics data
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { startTime, endTime } = getTimeBounds();
    const queryOpts: AnalyticsQueryOptions = {
      airportId: selectedAirportId,
      startTime,
      endTime,
    };

    try {
      const [
        overviewRes,
        flightsRes,
        gatesRes,
        conflictsRes,
        solverRes,
        reschedRes,
      ] = await Promise.all([
        getAnalyticsOverview(queryOpts),
        getFlightAnalytics(queryOpts),
        getGateUtilization(queryOpts),
        getConflictAnalytics(queryOpts),
        getSolverPerformance(),
        getReschedulingAnalytics(),
      ]);

      setOverview(overviewRes);
      setFlightAnalytics(flightsRes);
      setGateUtilization(gatesRes);
      setConflictAnalytics(conflictsRes);
      setSolverPerformance(solverRes);
      setReschedulingAnalytics(reschedRes);
    } catch (err: unknown) {
      console.error("Failed to fetch analytics data:", err);
      setError("Failed to load operational analytics data from backend API.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAirportId, getTimeBounds]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Export currently displayed metrics to CSV
  const handleExportCsv = () => {
    if (!overview || !gateUtilization) return;

    const rows: string[][] = [
      ["=== AI Airport Operations Analytics Export ==="],
      [`Export Timestamp: ${new Date().toISOString()}`],
      [
        `Airport Filter: ${
          selectedAirportId
            ? airports.find((a) => a.id === selectedAirportId)?.iata_code ||
              selectedAirportId
            : "All Airports"
        }`,
      ],
      [`Period Filter: ${selectedTimeRange}`],
      [],
      ["--- Top-Level Operational Overview ---"],
      ["Metric", "Value"],
      ["Total Flights", String(overview.total_flights)],
      ["Assigned Flights", String(overview.assigned_flights)],
      ["Unassigned Flights", String(overview.unassigned_flights)],
      ["Total Gates", String(overview.total_gates)],
      ["Gates Used", String(overview.gates_used)],
      ["Active Conflicts", String(overview.active_conflicts)],
      ["Delayed Flights", String(overview.delayed_flights)],
      ["Total Delay (minutes)", String(overview.total_delay_minutes)],
      ["Average Delay (minutes)", String(overview.avg_delay_minutes)],
      ["Total CSP Solver Runs", String(overview.total_solver_runs)],
      ["Successful Solver Runs", String(overview.successful_solver_runs)],
      [],
      ["--- Gate Occupancy & Utilization ---"],
      ["Gate Code", "Terminal", "Airport", "Max Aircraft Size", "Flights", "Occupied Minutes", "Utilization %"],
      ...gateUtilization.gates.map((g) => [
        g.gate_code,
        g.terminal_code,
        g.airport_code,
        g.max_aircraft_size,
        String(g.flight_count),
        String(g.occupied_minutes),
        `${g.utilization_percentage}%`,
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `airport_analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Operations & Solver Performance Analytics</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
              Live Telemetry
            </span>
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Factual operational insight into gate capacity, flight distributions, conflict frequencies, and pure Python CSP solver benchmarks.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <AnalyticsFilterBar
        airports={airports}
        selectedAirportId={selectedAirportId}
        onSelectAirport={setSelectedAirportId}
        selectedTimeRange={selectedTimeRange}
        onSelectTimeRange={setSelectedTimeRange}
        onRefresh={loadAnalytics}
        onExportCsv={handleExportCsv}
        isLoading={isLoading}
      />

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAnalytics}
            className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-sans font-medium hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Summary KPI Cards */}
      <OverviewMetricCards overview={overview} isLoading={isLoading} />

      {/* 2. Flight Distributions and Delays */}
      <FlightDistributionCharts
        flightAnalytics={flightAnalytics}
        isLoading={isLoading}
      />

      {/* 3. Gate Capacity & Utilization */}
      <GateUtilizationSection
        gateUtilization={gateUtilization}
        isLoading={isLoading}
      />

      {/* 4. Conflicts and Violations */}
      <ConflictAnalyticsSection
        conflictAnalytics={conflictAnalytics}
        isLoading={isLoading}
      />

      {/* 5. CSP Solver Performance & Strategy Comparison */}
      <SolverPerformanceSection
        solverPerformance={solverPerformance}
        isLoading={isLoading}
      />

      {/* 6. Dynamic Rescheduling & Simulation Events */}
      <ReschedulingSection
        reschedulingAnalytics={reschedulingAnalytics}
        isLoading={isLoading}
      />
    </div>
  );
}
