"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Airport, FlightPriority, FlightStatus, FlightType } from "@/types/flight";

export interface FlightFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  airportFilter: string;
  onAirportChange: (airportId: string) => void;
  airports: Airport[];
  onReset: () => void;
  totalResults: number;
}

export function FlightFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  typeFilter,
  onTypeChange,
  airportFilter,
  onAirportChange,
  airports,
  onReset,
  totalResults,
}: FlightFiltersProps) {
  const hasActiveFilters = Boolean(
    searchQuery || statusFilter || priorityFilter || typeFilter || airportFilter
  );

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search input */}
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by flight number (e.g. AA101)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Airport Filter */}
        <Select
          value={airportFilter}
          onChange={(e) => onAirportChange(e.target.value)}
          aria-label="Filter by airport"
        >
          <option value="">All Airports</option>
          {airports.map((a) => (
            <option key={a.id} value={a.id}>
              {a.iata_code} - {a.city}
            </option>
          ))}
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
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

        {/* Priority Filter */}
        <Select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="NORMAL">Normal</option>
          <option value="VIP">VIP</option>
          <option value="MEDICAL">Medical</option>
          <option value="EMERGENCY">Emergency</option>
        </Select>
      </div>

      {/* Filter summary & Reset */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="text-zinc-500 font-mono">
          Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalResults}</span> matching flights
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
