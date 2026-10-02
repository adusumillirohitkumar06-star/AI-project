"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Airport } from "@/types/flight";
import { Terminal } from "@/types/gate";

export interface GateFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  airportFilter: string;
  onAirportChange: (a: string) => void;
  terminalFilter: string;
  onTerminalChange: (t: string) => void;
  capabilityFilter: string;
  onCapabilityChange: (c: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  availabilityFilter: string;
  onAvailabilityChange: (av: string) => void;
  airports: Airport[];
  terminals: Terminal[];
  onReset: () => void;
  totalResults: number;
}

export function GateFilters({
  searchQuery,
  onSearchChange,
  airportFilter,
  onAirportChange,
  terminalFilter,
  onTerminalChange,
  capabilityFilter,
  onCapabilityChange,
  statusFilter,
  onStatusChange,
  availabilityFilter,
  onAvailabilityChange,
  airports,
  terminals,
  onReset,
  totalResults,
}: GateFiltersProps) {
  const hasActiveFilters = Boolean(
    searchQuery ||
      airportFilter ||
      terminalFilter ||
      capabilityFilter ||
      statusFilter ||
      availabilityFilter
  );

  const availableTerminals = terminals.filter((t) =>
    airportFilter ? t.airport_id === Number(airportFilter) : true
  );

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search input */}
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by gate code (e.g. A1, B12)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Airport Filter */}
        <Select
          value={airportFilter}
          onChange={(e) => {
            onAirportChange(e.target.value);
            onTerminalChange("");
          }}
          aria-label="Filter by airport"
        >
          <option value="">All Airports</option>
          {airports.map((a) => (
            <option key={a.id} value={a.id}>
              {a.iata_code} - {a.city}
            </option>
          ))}
        </Select>

        {/* Terminal Filter */}
        <Select
          value={terminalFilter}
          onChange={(e) => onTerminalChange(e.target.value)}
          aria-label="Filter by terminal"
        >
          <option value="">All Terminals</option>
          {availableTerminals.map((t) => (
            <option key={t.id} value={t.id}>
              {t.terminal_code} - {t.name}
            </option>
          ))}
        </Select>

        {/* Capability Filter */}
        <Select
          value={capabilityFilter}
          onChange={(e) => onCapabilityChange(e.target.value)}
          aria-label="Filter by capability"
        >
          <option value="">All Capabilities</option>
          <option value="DOMESTIC">Domestic</option>
          <option value="INTERNATIONAL">International</option>
          <option value="BOTH">Domestic & International</option>
        </Select>

        {/* Status / Availability Filter */}
        <Select
          value={availabilityFilter}
          onChange={(e) => onAvailabilityChange(e.target.value)}
          aria-label="Filter by availability"
        >
          <option value="">All States</option>
          <option value="AVAILABLE">Available</option>
          <option value="CLOSED">Closed (Maintenance)</option>
          <option value="INACTIVE">Deactivated</option>
        </Select>
      </div>

      {/* Filter summary & Reset */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="text-zinc-500 font-mono">
          Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalResults}</span> matching gates
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
