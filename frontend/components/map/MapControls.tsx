"use client";

import React from "react";
import Link from "next/link";
import { Airport, FlightPriority, FlightStatus } from "@/types/flight";

import { MapFilterState } from "@/types/map";
import { Button } from "@/components/ui/Button";

export interface MapControlsProps {
  airports: Airport[];
  filters: MapFilterState;
  onChangeFilter: <K extends keyof MapFilterState>(key: K, value: MapFilterState[K]) => void;
  onResetFilters: () => void;
  onResetView: () => void;
  onFitFlights: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalAirportsCount: number;
  totalFlightsCount: number;
  filteredFlightsCount: number;
}

export function MapControls({
  airports,
  filters,
  onChangeFilter,
  onResetFilters,
  onResetView,
  onFitFlights,
  onRefresh,
  isRefreshing,
  totalAirportsCount,
  totalFlightsCount,
  filteredFlightsCount,
}: MapControlsProps) {
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md p-3.5 space-y-3">
      {/* Row 1: Search & Entity Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Search Network
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Flight #, IATA, city..."
              value={filters.searchTerm}
              onChange={(e) => onChangeFilter("searchTerm", e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border text-xs bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>

        {/* Airport Hub Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Airport Node
          </label>
          <select
            className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
            value={filters.airportId || ""}
            onChange={(e) =>
              onChangeFilter("airportId", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">All Airports ({totalAirportsCount})</option>
            {airports.map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.iata_code} - {airport.name} ({airport.city})
              </option>
            ))}
          </select>
        </div>

        {/* Flight Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Flight Status
          </label>
          <select
            className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
            value={filters.status}
            onChange={(e) => onChangeFilter("status", e.target.value as FlightStatus | "ALL")}
          >
            <option value="ALL">All Flight Statuses</option>
            <option value="IN_AIR">IN_AIR (En Route)</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="BOARDING">BOARDING</option>
            <option value="DEPARTED">DEPARTED</option>
            <option value="APPROACHING">APPROACHING</option>
            <option value="LANDED">LANDED</option>
            <option value="AT_GATE">AT_GATE</option>
            <option value="DELAYED">DELAYED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        {/* Operational Priority Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Priority Tier
          </label>
          <select
            className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
            value={filters.priority}
            onChange={(e) =>
              onChangeFilter("priority", e.target.value as FlightPriority | "ALL")
            }
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">EMERGENCY</option>
            <option value="MEDICAL">MEDICAL</option>
            <option value="VIP">VIP</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
      </div>

      {/* Row 2: Viewport Actions & Live Metrics Counter */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {filteredFlightsCount} of {totalFlightsCount} flights
          </span>
          <span>•</span>
          <span>{totalAirportsCount} airports mapped</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onFitFlights}
            title="Fit viewport to visible flight trajectories"
          >
            <svg
              className="w-3.5 h-3.5 mr-1 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
            Fit Flights
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onResetView}
            title="Reset to global world view"
          >
            Reset World View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            title="Clear all active filters"
          >
            Reset Filters
          </Button>

          <Link href="/simulation">
            <Button
              variant="primary"
              size="sm"
              title="Open time-driven flight simulation"
            >
              <span className="flex items-center gap-1.5">
                <span>▶</span> Simulation
              </span>
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <svg
              className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
    </div>
  );
}

