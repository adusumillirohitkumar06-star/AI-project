"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { PriorityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Aircraft, Airport, Flight } from "@/types/flight";

export interface FlightDetailModalProps {
  flight: Flight | null;
  airports: Map<number, Airport>;
  aircraft: Map<number, Aircraft>;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (flight: Flight) => void;
}

export function FlightDetailModal({
  flight,
  airports,
  aircraft,
  isOpen,
  onClose,
  onEdit,
}: FlightDetailModalProps) {
  if (!flight) return null;

  const origin = airports.get(flight.origin_airport_id);
  const destination = airports.get(flight.destination_airport_id);
  const plane = flight.aircraft_id ? aircraft.get(flight.aircraft_id) : null;

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Flight ${flight.flight_number}`}
      description={`${flight.airline} • ${flight.flight_type}`}
      maxWidth="lg"
    >
      <div className="space-y-6 text-xs">
        {/* Status & Priority Ribbon */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono mb-1">
              Operational Status
            </div>
            <StatusBadge status={flight.status} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono mb-1 text-right">
              Priority Ranking
            </div>
            <PriorityBadge priority={flight.priority} />
          </div>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Origin Airport
            </div>
            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {origin?.iata_code || `ID: ${flight.origin_airport_id}`}
            </div>
            <div className="text-zinc-600 dark:text-zinc-300 truncate">
              {origin?.name || "Unknown Airport"}
            </div>
            <div className="text-[11px] text-zinc-400">
              {origin ? `${origin.city}, ${origin.country}` : ""}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Destination Airport
            </div>
            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {destination?.iata_code || `ID: ${flight.destination_airport_id}`}
            </div>
            <div className="text-zinc-600 dark:text-zinc-300 truncate">
              {destination?.name || "Unknown Airport"}
            </div>
            <div className="text-[11px] text-zinc-400">
              {destination ? `${destination.city}, ${destination.country}` : ""}
            </div>
          </div>
        </div>

        {/* Schedule & Timing */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500">
            Timing & Turnaround
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-zinc-400 text-[11px]">Scheduled Arrival:</span>
              <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {formatDateTime(flight.scheduled_arrival)}
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px]">Scheduled Departure:</span>
              <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {formatDateTime(flight.scheduled_departure)}
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px]">Turnaround Duration:</span>
              <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {flight.turnaround_duration_minutes} minutes
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px]">Recorded Delay:</span>
              <div className="font-mono font-medium text-amber-600 dark:text-amber-400">
                {flight.delay_duration_minutes > 0
                  ? `+${flight.delay_duration_minutes} min (${flight.delay_reason || "OPERATIONAL"})`
                  : "On Schedule (0 min)"}
              </div>
            </div>
            {flight.delay_duration_minutes > 0 && flight.actual_arrival && (
              <div>
                <span className="text-zinc-400 text-[11px]">Operational Arrival:</span>
                <div className="font-mono font-medium text-amber-600 dark:text-amber-400">
                  {formatDateTime(flight.actual_arrival)}
                </div>
              </div>
            )}
            {flight.delay_duration_minutes > 0 && flight.actual_departure && (
              <div>
                <span className="text-zinc-400 text-[11px]">Operational Departure:</span>
                <div className="font-mono font-medium text-amber-600 dark:text-amber-400">
                  {formatDateTime(flight.actual_departure)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aircraft & Passenger Payload */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500">
            Aircraft & Passenger Load
          </div>
          {plane ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-zinc-400 text-[11px]">Registration:</span>
                <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {plane.registration}
                </div>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Model / Type:</span>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {plane.model} ({plane.aircraft_type})
                </div>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Category:</span>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {plane.category}
                </div>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Passenger Count:</span>
                <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {flight.passenger_count} / {plane.capacity} seats
                </div>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400 italic">
              No aircraft currently allocated to this flight record.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(flight);
            }}
          >
            Edit Flight
          </Button>
        </div>
      </div>
    </Modal>
  );
}
