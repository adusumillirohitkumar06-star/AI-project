"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Airport, FlightPriority, FlightStatus } from "@/types/flight";
import { FlightRouteInfo, MapFilterState, SelectedMapEntity } from "@/types/map";
import { loadMapNetworkData, MapDataPayload } from "@/lib/api/map";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";
import { FlightDetailsPanel } from "./FlightDetailsPanel";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

// Dynamically import WorldMapCanvas to ensure zero SSR execution of Leaflet
const WorldMapCanvas = dynamic(
  () => import("./WorldMapCanvas").then((mod) => mod.WorldMapCanvas),
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
        Initializing Interactive Airspace Canvas...
      </div>
    ),
  }
);

export function MapManager() {
  // 1. Data State
  const [data, setData] = useState<MapDataPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Selection & Filter State
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);
  const [filters, setFilters] = useState<MapFilterState>({
    searchTerm: "",
    airportId: null,
    status: "ALL",
    priority: "ALL",
  });

  // 3. Map Viewport Actions Ref
  const mapActionsRef = useRef<{
    resetView: () => void;
    fitFlights: () => void;
    focusAirport: (airport: Airport) => void;
  } | null>(null);

  // Load backend map data
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const payload = await loadMapNetworkData();
      setData(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load map network data";
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

  // Refresh data handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Filter change handler
  const handleChangeFilter = useCallback(
    <K extends keyof MapFilterState>(key: K, value: MapFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));

      // If selecting specific airport from dropdown, center map on it
      if (key === "airportId" && value !== null && data) {
        const airport = data.airports.find((a) => a.id === value);
        if (airport) {
          handleSelectAirport(airport);
          mapActionsRef.current?.focusAirport(airport);
        }
      }
    },
    [data]
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      airportId: null,
      status: "ALL",
      priority: "ALL",
    });
    setSelectedEntity(null);
  }, []);

  // Airport selection handler
  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      if (!data) return;
      const departures = data.routes.filter(
        (r) => r.flight.origin_airport_id === airport.id
      );
      const arrivals = data.routes.filter(
        (r) => r.flight.destination_airport_id === airport.id
      );

      setSelectedEntity({
        type: "airport",
        data: airport,
        departures,
        arrivals,
      });

      mapActionsRef.current?.focusAirport(airport);
    },
    [data]
  );

  // Flight selection handler
  const handleSelectFlight = useCallback((route: FlightRouteInfo) => {
    setSelectedEntity({
      type: "flight",
      data: route,
    });
  }, []);

  // Filter routes based on search, airport, status, and priority
  const filteredRoutes = useMemo(() => {
    if (!data) return [];
    const term = filters.searchTerm.toLowerCase().trim();

    return data.routes.filter((route) => {
      const { flight, originAirport, destinationAirport, aircraft } = route;

      // 1. Airport filter
      if (filters.airportId) {
        if (
          flight.origin_airport_id !== filters.airportId &&
          flight.destination_airport_id !== filters.airportId
        ) {
          return false;
        }
      }

      // 2. Status filter
      if (filters.status !== "ALL" && flight.status !== filters.status) {
        return false;
      }

      // 3. Priority filter
      if (filters.priority !== "ALL" && flight.priority !== filters.priority) {
        return false;
      }

      // 4. Search term
      if (term) {
        const matchesFlight = flight.flight_number.toLowerCase().includes(term);
        const matchesAirline = flight.airline.toLowerCase().includes(term);
        const matchesOriginIata = originAirport.iata_code.toLowerCase().includes(term);
        const matchesOriginCity = originAirport.city.toLowerCase().includes(term);
        const matchesDestIata = destinationAirport.iata_code.toLowerCase().includes(term);
        const matchesDestCity = destinationAirport.city.toLowerCase().includes(term);
        const matchesAircraft =
          aircraft &&
          (aircraft.model.toLowerCase().includes(term) ||
            aircraft.registration.toLowerCase().includes(term));

        if (
          !matchesFlight &&
          !matchesAirline &&
          !matchesOriginIata &&
          !matchesOriginCity &&
          !matchesDestIata &&
          !matchesDestCity &&
          !matchesAircraft
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

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
          Loading airport network and great-circle flight trajectories...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Airspace Network Error"
        description="Failed to load geospatial route network."
        error={error}
        onRetry={handleRefresh}
      />
    );
  }

  if (!data || data.airports.length === 0) {
    return (
      <EmptyState
        title="No Airports Configured"
        description="The network requires active airports with geospatial coordinates to render the world route map."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header & Controls */}
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
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
                />
              </svg>
            </span>
            Global Airspace & Route Network Map
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Real-time geospatial visualization of airport hubs and great-circle flight routes based on authentic
            backend coordinates, flight status, and aircraft assignments.
          </p>
        </div>
      </div>

      {/* 2. Interactive Map Controls Bar */}
      <MapControls
        airports={data.airports}
        filters={filters}
        onChangeFilter={handleChangeFilter}
        onResetFilters={handleResetFilters}
        onResetView={() => mapActionsRef.current?.resetView()}
        onFitFlights={() => mapActionsRef.current?.fitFlights()}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        totalAirportsCount={data.airports.length}
        totalFlightsCount={data.flights.length}
        filteredFlightsCount={filteredRoutes.length}
      />

      {/* 3. Main Map Viewport with Floating Overlays */}
      <div className="relative w-full h-[640px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md">
        {/* Leaflet Canvas */}
        <WorldMapCanvas
          airports={data.airports}
          routes={filteredRoutes}
          selectedEntity={selectedEntity}
          onSelectFlight={handleSelectFlight}
          onSelectAirport={handleSelectAirport}
          onRegisterMapActions={(actions) => {
            mapActionsRef.current = actions;
          }}
        />

        {/* Floating Map Legend (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 max-w-xs">
          <MapLegend />
        </div>

        {/* Floating Flight/Airport Details Panel (Top-Right / Bottom-Right) */}
        {selectedEntity && (
          <div className="absolute top-4 right-4 z-20 w-80 sm:w-96">
            <FlightDetailsPanel
              selectedEntity={selectedEntity}
              onClose={() => setSelectedEntity(null)}
              onSelectFlight={handleSelectFlight}
            />
          </div>
        )}
      </div>
    </div>
  );
}
