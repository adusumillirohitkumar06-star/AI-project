"use client";

import React from "react";
import { Airport } from "@/types/flight";
import { Gate, Terminal } from "@/types/gate";
import { GanttZoomLevel } from "@/types/schedule";
import { Card, CardContent } from "@/components/ui/Card";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface ScheduleControlsProps {
  airports: Airport[];
  selectedAirportId: number | null;
  onSelectAirport: (id: number) => void;
  terminals: Terminal[];
  selectedTerminalId: number | null;
  onSelectTerminal: (id: number | null) => void;
  gates: Gate[];
  selectedGateId: number | null;
  onSelectGate: (id: number | null) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  selectedStatus: string;
  onChangeStatus: (status: string) => void;
  searchTerm: string;
  onChangeSearchTerm: (term: string) => void;
  zoom: GanttZoomLevel;
  onChangeZoom: (zoom: GanttZoomLevel) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  isRefreshing: boolean;
}

const ZOOM_OPTIONS: { id: GanttZoomLevel; label: string }[] = [
  { id: "24h", label: "Day (24h)" },
  { id: "12h", label: "12 Hours" },
  { id: "6h", label: "6 Hours" },
  { id: "3h", label: "3 Hours" },
  { id: "1h", label: "1 Hour" },
];

export function ScheduleControls({
  airports,
  selectedAirportId,
  onSelectAirport,
  terminals,
  selectedTerminalId,
  onSelectTerminal,
  gates,
  selectedGateId,
  onSelectGate,
  selectedDate,
  onChangeDate,
  selectedStatus,
  onChangeStatus,
  searchTerm,
  onChangeSearchTerm,
  zoom,
  onChangeZoom,
  onRefresh,
  onResetFilters,
  isRefreshing,
}: ScheduleControlsProps) {
  // Filter available gates by currently selected terminal if any
  const availableGates = selectedTerminalId
    ? gates.filter((g) => g.terminal_id === selectedTerminalId)
    : gates;

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <CardContent className="p-4 space-y-4">
        {/* Row 1: Primary Selectors (Airport, Date, Terminal, Gate, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Airport Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Airport Facility
            </label>
            <select
              className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={selectedAirportId || ""}
              onChange={(e) => onSelectAirport(Number(e.target.value))}
            >
              {airports.map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.iata_code} - {airport.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Schedule Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
            />
          </div>

          {/* Terminal Filter */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Terminal
            </label>
            <select
              className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={selectedTerminalId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSelectTerminal(val);
                // Reset gate if selected gate is not in newly selected terminal
                if (val && selectedGateId) {
                  const gateMatches = gates.some(
                    (g) => g.id === selectedGateId && g.terminal_id === val
                  );
                  if (!gateMatches) onSelectGate(null);
                }
              }}
            >
              <option value="">All Terminals ({terminals.length})</option>
              {terminals.map((terminal) => (
                <option key={terminal.id} value={terminal.id}>
                  {terminal.terminal_code} - {terminal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gate Filter */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Specific Gate
            </label>
            <select
              className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={selectedGateId || ""}
              onChange={(e) =>
                onSelectGate(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">All Gates ({availableGates.length})</option>
              {availableGates.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  Gate {gate.gate_code} ({gate.capability})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Status */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Assignment Status
            </label>
            <select
              className="w-full rounded-md border text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={selectedStatus}
              onChange={(e) => onChangeStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TENTATIVE">TENTATIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>
        </div>

        {/* Row 2: Search, Zoom Controls, Reset & Refresh */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search by Flight Number / Airline / Gate */}
          <div className="w-full md:w-80">
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
                placeholder="Search flight #, airline, gate..."
                value={searchTerm}
                onChange={(e) => onChangeSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border text-xs bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 px-2">
              Zoom:
            </span>
            {ZOOM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeZoom(opt.id)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-all ${
                  zoom === opt.id
                    ? "bg-white dark:bg-zinc-800 font-semibold text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              title="Reset all filters to defaults"
            >
              Reset Filters
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <svg
                className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
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
      </CardContent>
    </Card>
  );
}
