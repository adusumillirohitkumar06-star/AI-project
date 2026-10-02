"use client";

import React from "react";
import { PriorityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Aircraft, Airport, Flight } from "@/types/flight";

export interface FlightTableProps {
  flights: Flight[];
  airports: Map<number, Airport>;
  aircraft: Map<number, Aircraft>;
  onView: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export function FlightTable({
  flights,
  airports,
  aircraft,
  onView,
  onEdit,
  onDelete,
}: FlightTableProps) {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-mono">
          <tr>
            <th scope="col" className="px-4 py-3.5">
              Flight
            </th>
            <th scope="col" className="px-4 py-3.5">
              Route
            </th>
            <th scope="col" className="px-4 py-3.5">
              Aircraft
            </th>
            <th scope="col" className="px-4 py-3.5">
              Arrival
            </th>
            <th scope="col" className="px-4 py-3.5">
              Departure
            </th>
            <th scope="col" className="px-4 py-3.5">
              Status
            </th>
            <th scope="col" className="px-4 py-3.5">
              Priority
            </th>
            <th scope="col" className="px-4 py-3.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
          {flights.map((flight) => {
            const origin = airports.get(flight.origin_airport_id);
            const destination = airports.get(flight.destination_airport_id);
            const plane = flight.aircraft_id ? aircraft.get(flight.aircraft_id) : null;

            return (
              <tr
                key={flight.id}
                className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {/* Flight Number & Airline */}
                <td className="px-4 py-3">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    {flight.flight_number}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate max-w-[120px]">
                    {flight.airline}
                  </div>
                </td>

                {/* Route */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                    <span title={origin?.name || `Airport #${flight.origin_airport_id}`}>
                      {origin?.iata_code || `ID:${flight.origin_airport_id}`}
                    </span>
                    <span className="text-zinc-400">&rarr;</span>
                    <span title={destination?.name || `Airport #${flight.destination_airport_id}`}>
                      {destination?.iata_code || `ID:${flight.destination_airport_id}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wide">
                    {flight.flight_type}
                  </div>
                </td>

                {/* Aircraft */}
                <td className="px-4 py-3">
                  {plane ? (
                    <div>
                      <div className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                        {plane.registration}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {plane.aircraft_type} &bull; {plane.category}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-400 italic text-[11px]">Unassigned</span>
                  )}
                </td>

                {/* Arrival */}
                <td className="px-4 py-3">
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                    {flight.actual_arrival ? formatTime(flight.actual_arrival) : formatTime(flight.scheduled_arrival)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {flight.delay_duration_minutes > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">Sched: {formatTime(flight.scheduled_arrival)}</span>
                    ) : (
                      formatDate(flight.scheduled_arrival)
                    )}
                  </div>
                </td>

                {/* Departure */}
                <td className="px-4 py-3">
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                    {flight.actual_departure ? formatTime(flight.actual_departure) : formatTime(flight.scheduled_departure)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {flight.delay_duration_minutes > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">Sched: {formatTime(flight.scheduled_departure)}</span>
                    ) : (
                      formatDate(flight.scheduled_departure)
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={flight.status} />
                    {flight.delay_duration_minutes > 0 ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                        +{flight.delay_duration_minutes}m ({flight.delay_reason || "DELAY"})
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono">On time</span>
                    )}
                  </div>
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <PriorityBadge priority={flight.priority} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(flight)}
                      aria-label={`View flight ${flight.flight_number}`}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(flight)}
                      aria-label={`Edit flight ${flight.flight_number}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(flight)}
                      aria-label={`Delete flight ${flight.flight_number}`}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
