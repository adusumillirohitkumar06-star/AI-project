"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Aircraft,
  Airport,
  Flight,
  FlightCreatePayload,
  FlightPriority,
  FlightStatus,
  FlightType,
} from "@/types/flight";

export interface FlightFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: FlightCreatePayload) => Promise<void>;
  flight?: Flight | null;
  airports: Airport[];
  aircraftList: Aircraft[];
}

export function FlightFormModal({
  isOpen,
  onClose,
  onSubmit,
  flight,
  airports,
  aircraftList,
}: FlightFormModalProps) {
  const isEditing = Boolean(flight);

  const [flightNumber, setFlightNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [originAirportId, setOriginAirportId] = useState<number | "">("");
  const [destinationAirportId, setDestinationAirportId] = useState<number | "">("");
  const [aircraftId, setAircraftId] = useState<number | "">("");
  const [scheduledArrival, setScheduledArrival] = useState("");
  const [scheduledDeparture, setScheduledDeparture] = useState("");
  const [flightType, setFlightType] = useState<FlightType>("DOMESTIC");
  const [priority, setPriority] = useState<FlightPriority>("NORMAL");
  const [turnaroundMinutes, setTurnaroundMinutes] = useState(45);
  const [passengerCount, setPassengerCount] = useState(0);
  const [status, setStatus] = useState<FlightStatus>("SCHEDULED");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Helper to format ISO timestamp to datetime-local input format (YYYY-MM-DDTHH:mm)
  const toLocalInputValue = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (flight) {
      setFlightNumber(flight.flight_number);
      setAirline(flight.airline);
      setOriginAirportId(flight.origin_airport_id);
      setDestinationAirportId(flight.destination_airport_id);
      setAircraftId(flight.aircraft_id || "");
      setScheduledArrival(toLocalInputValue(flight.scheduled_arrival));
      setScheduledDeparture(toLocalInputValue(flight.scheduled_departure));
      setFlightType(flight.flight_type);
      setPriority(flight.priority);
      setTurnaroundMinutes(flight.turnaround_duration_minutes);
      setPassengerCount(flight.passenger_count);
      setStatus(flight.status);
    } else {
      // Default to sensible values for new flight
      setFlightNumber("");
      setAirline("");
      setOriginAirportId(airports[0]?.id || "");
      setDestinationAirportId(airports[1]?.id || "");
      setAircraftId(aircraftList[0]?.id || "");

      const now = new Date();
      now.setMinutes(now.getMinutes() + 60);
      setScheduledArrival(toLocalInputValue(now.toISOString()));

      const later = new Date(now);
      later.setMinutes(later.getMinutes() + 90);
      setScheduledDeparture(toLocalInputValue(later.toISOString()));

      setFlightType("DOMESTIC");
      setPriority("NORMAL");
      setTurnaroundMinutes(45);
      setPassengerCount(150);
      setStatus("SCHEDULED");
    }
    setErrors({});
    setApiError(null);
  }, [flight, isOpen, airports, aircraftList]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!flightNumber.trim()) {
      errs.flightNumber = "Flight number is required (e.g., AA100).";
    }
    if (!airline.trim()) {
      errs.airline = "Airline name is required.";
    }
    if (!originAirportId) {
      errs.originAirportId = "Origin airport must be selected.";
    }
    if (!destinationAirportId) {
      errs.destinationAirportId = "Destination airport must be selected.";
    }
    if (originAirportId && destinationAirportId && originAirportId === destinationAirportId) {
      errs.destinationAirportId = "Origin and destination airports must be distinct.";
    }
    if (!scheduledArrival) {
      errs.scheduledArrival = "Scheduled arrival time is required.";
    }
    if (!scheduledDeparture) {
      errs.scheduledDeparture = "Scheduled departure time is required.";
    }
    if (scheduledArrival && scheduledDeparture) {
      const arr = new Date(scheduledArrival).getTime();
      const dep = new Date(scheduledDeparture).getTime();
      if (dep < arr) {
        errs.scheduledDeparture = "Departure time cannot be earlier than arrival time.";
      }
    }
    if (passengerCount < 0) {
      errs.passengerCount = "Passenger count cannot be negative.";
    }
    if (turnaroundMinutes < 0) {
      errs.turnaroundMinutes = "Turnaround duration cannot be negative.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload: FlightCreatePayload = {
        flight_number: flightNumber.trim().toUpperCase(),
        airline: airline.trim(),
        origin_airport_id: Number(originAirportId),
        destination_airport_id: Number(destinationAirportId),
        aircraft_id: aircraftId ? Number(aircraftId) : null,
        scheduled_arrival: new Date(scheduledArrival).toISOString(),
        scheduled_departure: new Date(scheduledDeparture).toISOString(),
        flight_type: flightType,
        priority: priority,
        turnaround_duration_minutes: Number(turnaroundMinutes),
        passenger_count: Number(passengerCount),
        status: status,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save flight.";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Flight ${flight?.flight_number}` : "Add New Flight"}
      description="Enter flight schedule, route, and aircraft parameters for ground operations."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {apiError}
          </div>
        )}

        {/* Flight Number & Airline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Flight Number *"
            placeholder="e.g. AA101, EK502"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            error={errors.flightNumber}
            disabled={isSubmitting}
            required
          />
          <Input
            label="Airline *"
            placeholder="e.g. American Airlines, Emirates"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            error={errors.airline}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Origin & Destination Airports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Origin Airport *"
            value={originAirportId}
            onChange={(e) => setOriginAirportId(Number(e.target.value))}
            error={errors.originAirportId}
            disabled={isSubmitting || airports.length === 0}
            required
          >
            {airports.length === 0 && <option value="">No airports available</option>}
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata_code} - {a.name} ({a.city})
              </option>
            ))}
          </Select>

          <Select
            label="Destination Airport *"
            value={destinationAirportId}
            onChange={(e) => setDestinationAirportId(Number(e.target.value))}
            error={errors.destinationAirportId}
            disabled={isSubmitting || airports.length === 0}
            required
          >
            {airports.length === 0 && <option value="">No airports available</option>}
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata_code} - {a.name} ({a.city})
              </option>
            ))}
          </Select>
        </div>

        {/* Aircraft Allocation */}
        <Select
          label="Allocated Aircraft"
          value={aircraftId}
          onChange={(e) => setAircraftId(e.target.value ? Number(e.target.value) : "")}
          disabled={isSubmitting}
          hint={aircraftList.length === 0 ? "No aircraft available in database" : undefined}
        >
          <option value="">(Optional) No aircraft assigned</option>
          {aircraftList.map((ac) => (
            <option key={ac.id} value={ac.id}>
              {ac.registration} — {ac.model} ({ac.aircraft_type}, {ac.category})
            </option>
          ))}
        </Select>

        {/* Schedule Arrival & Departure */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduled Arrival *"
            type="datetime-local"
            value={scheduledArrival}
            onChange={(e) => setScheduledArrival(e.target.value)}
            error={errors.scheduledArrival}
            disabled={isSubmitting}
            required
          />
          <Input
            label="Scheduled Departure *"
            type="datetime-local"
            value={scheduledDeparture}
            onChange={(e) => setScheduledDeparture(e.target.value)}
            error={errors.scheduledDeparture}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Flight Type, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Flight Type"
            value={flightType}
            onChange={(e) => setFlightType(e.target.value as FlightType)}
            disabled={isSubmitting}
          >
            <option value="DOMESTIC">Domestic</option>
            <option value="INTERNATIONAL">International</option>
          </Select>

          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value as FlightPriority)}
            disabled={isSubmitting}
          >
            <option value="NORMAL">Normal</option>
            <option value="VIP">VIP</option>
            <option value="MEDICAL">Medical</option>
            <option value="EMERGENCY">Emergency</option>
          </Select>

          <Select
            label="Operational Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as FlightStatus)}
            disabled={isSubmitting}
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="BOARDING">Boarding</option>
            <option value="IN_AIR">In Air</option>
            <option value="APPROACHING">Approaching</option>
            <option value="LANDED">Landed</option>
            <option value="AT_GATE">At Gate</option>
            <option value="DELAYED">Delayed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>

        {/* Turnaround & Passenger Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Turnaround Duration (minutes)"
            type="number"
            min={0}
            value={turnaroundMinutes}
            onChange={(e) => setTurnaroundMinutes(Number(e.target.value))}
            error={errors.turnaroundMinutes}
            disabled={isSubmitting}
          />
          <Input
            label="Passenger Count"
            type="number"
            min={0}
            value={passengerCount}
            onChange={(e) => setPassengerCount(Number(e.target.value))}
            error={errors.passengerCount}
            disabled={isSubmitting}
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isEditing ? "Save Changes" : "Create Flight"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
