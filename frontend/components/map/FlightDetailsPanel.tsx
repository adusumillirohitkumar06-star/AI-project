"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FlightRouteInfo, SelectedMapEntity } from "@/types/map";

export interface FlightDetailsPanelProps {
  selectedEntity: SelectedMapEntity;
  onClose: () => void;
  onSelectFlight: (route: FlightRouteInfo) => void;
}

export function FlightDetailsPanel({
  selectedEntity,
  onClose,
  onSelectFlight,
}: FlightDetailsPanelProps) {
  if (!selectedEntity) {
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md p-4 text-xs text-zinc-500 font-mono text-center">
        Select an airport hub or flight route on the map to inspect operational details.
      </div>
    );
  }

  const formatIso = (isoStr?: string | null) => {
    if (!isoStr) return "Not available";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
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

  // 1. FLIGHT DETAILS
  if (selectedEntity.type === "flight") {
    const route = selectedEntity.data;
    const { flight, originAirport, destinationAirport, aircraft } = route;

    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-4 space-y-4 text-xs font-mono max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {flight.flight_number}
              </span>
              <Badge
                variant={
                  flight.status === "IN_AIR"
                    ? "success"
                    : flight.status === "DELAYED"
                    ? "warning"
                    : flight.status === "CANCELLED"
                    ? "danger"
                    : "info"
                }
              >
                {flight.status}
              </Badge>
              {flight.delay_duration_minutes > 0 && (
                <Badge variant="warning">
                  +{flight.delay_duration_minutes}m ({flight.delay_reason || "DELAY"})
                </Badge>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(
                  flight.priority
                )}`}
              >
                {flight.priority}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">{flight.airline}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 text-sm leading-none"
            title="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Route Visualization Card */}
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between text-center">
            {/* Origin */}
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {originAirport.iata_code}
              </div>
              <div className="text-[10px] text-zinc-600 dark:text-zinc-300 font-semibold truncate">
                {originAirport.city}
              </div>
              <div className="text-[9px] text-zinc-400 truncate">{originAirport.name}</div>
            </div>

            {/* Flight Path Graphic */}
            <div className="px-3 flex flex-col items-center">
              <span className="text-xs text-zinc-400 font-bold">✈</span>
              <div className="w-16 border-t-2 border-dashed border-blue-400 my-0.5" />
              <span className="text-[9px] text-zinc-500">
                {route.distanceKm.toLocaleString()} km
              </span>
            </div>

            {/* Destination */}
            <div className="flex-1">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {destinationAirport.iata_code}
              </div>
              <div className="text-[10px] text-zinc-600 dark:text-zinc-300 font-semibold truncate">
                {destinationAirport.city}
              </div>
              <div className="text-[9px] text-zinc-400 truncate">{destinationAirport.name}</div>
            </div>
          </div>
        </div>

        {/* Timings */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-[10px] text-zinc-400 uppercase block mb-0.5">
              Scheduled Departure
            </span>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatIso(flight.scheduled_departure)}
            </div>
            {flight.actual_departure && (
              <div className="text-[9px] text-zinc-400">
                Actual: {formatIso(flight.actual_departure)}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-[10px] text-zinc-400 uppercase block mb-0.5">
              Scheduled Arrival
            </span>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatIso(flight.scheduled_arrival)}
            </div>
            {flight.actual_arrival && (
              <div className="text-[9px] text-zinc-400">
                Actual: {formatIso(flight.actual_arrival)}
              </div>
            )}
          </div>
        </div>

        {/* Aircraft & Gate Info */}
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Assigned Aircraft:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {aircraft ? `${aircraft.model} (${aircraft.registration})` : "Not assigned"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Aircraft Category:</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {aircraft?.category || "Standard"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Gate Allocation:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {route.assignedGateCode
                ? `Gate ${route.assignedGateCode} ${
                    route.assignedTerminalCode ? `(${route.assignedTerminalCode})` : ""
                  }`
                : "Pending Assignment"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Turnaround Requirement:</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {flight.turnaround_duration_minutes} minutes
            </span>
          </div>

          {flight.delay_duration_minutes > 0 && (
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span>Operational Delay:</span>
              <span className="font-bold">+{flight.delay_duration_minutes} min</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. AIRPORT DETAILS
  const airport = selectedEntity.data;
  const departures = selectedEntity.departures || [];
  const arrivals = selectedEntity.arrivals || [];

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-4 space-y-4 text-xs font-mono max-h-[80vh] overflow-y-auto">
      {/* Airport Header */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {airport.iata_code}
            </span>
            <span className="text-zinc-400 text-xs">/ {airport.icao_code}</span>
            <Badge variant="success">Active Facility</Badge>
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold">
            {airport.name}
          </div>
          <div className="text-[10px] text-zinc-400">
            {airport.city}, {airport.country}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 text-sm leading-none"
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Geolocation Telemetry */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <span className="text-zinc-400 block uppercase">Coordinates</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {airport.latitude.toFixed(4)}°, {airport.longitude.toFixed(4)}°
          </span>
        </div>
        <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <span className="text-zinc-400 block uppercase">Timezone</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {airport.timezone}
          </span>
        </div>
      </div>

      {/* Associated Flights (Departures & Arrivals) */}
      <div className="space-y-3">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
            Departing Flights ({departures.length})
          </span>
          {departures.length === 0 ? (
            <div className="text-[10px] text-zinc-400 italic">No scheduled departures</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {departures.map((r) => (
                <div
                  key={r.flight.id}
                  onClick={() => onSelectFlight(r)}
                  className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 cursor-pointer flex items-center justify-between text-[10px] transition-colors"
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {r.flight.flight_number} → {r.destinationAirport.iata_code}
                  </span>
                  <span className="text-zinc-400">{r.flight.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
            Arriving Flights ({arrivals.length})
          </span>
          {arrivals.length === 0 ? (
            <div className="text-[10px] text-zinc-400 italic">No scheduled arrivals</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {arrivals.map((r) => (
                <div
                  key={r.flight.id}
                  onClick={() => onSelectFlight(r)}
                  className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 cursor-pointer flex items-center justify-between text-[10px] transition-colors"
                >
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {r.originAirport.iata_code} → {r.flight.flight_number}
                  </span>
                  <span className="text-zinc-400">{r.flight.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
