"use client";

import React from "react";
import { Airport } from "@/types/flight";
import { Button } from "@/components/ui/Button";

interface AnalyticsFilterBarProps {
  airports: Airport[];
  selectedAirportId: number | null;
  onSelectAirport: (id: number | null) => void;
  selectedTimeRange: "ALL" | "TODAY" | "LAST_24H" | "LAST_7D";
  onSelectTimeRange: (range: "ALL" | "TODAY" | "LAST_24H" | "LAST_7D") => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
}

export function AnalyticsFilterBar({
  airports,
  selectedAirportId,
  onSelectAirport,
  selectedTimeRange,
  onSelectTimeRange,
  onRefresh,
  onExportCsv,
  isLoading,
}: AnalyticsFilterBarProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Filters: Airport and Time Range */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Airport Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
            Airport:
          </label>
          <select
            value={selectedAirportId ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              onSelectAirport(val);
            }}
            className="text-xs font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">All Airports (System-Wide)</option>
            {airports.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.iata_code} - {apt.name} ({apt.city})
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">
            Period:
          </span>
          {[
            { id: "ALL", label: "All Records" },
            { id: "TODAY", label: "Today" },
            { id: "LAST_24H", label: "Last 24h" },
            { id: "LAST_7D", label: "Last 7d" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTimeRange(t.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                selectedTimeRange === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions: Refresh & Export */}
      <div className="flex items-center gap-2 self-end md:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          className="text-xs font-mono"
        >
          Export CSV ⬇
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs font-mono"
        >
          {isLoading ? "Refreshing..." : "↻ Refresh"}
        </Button>
      </div>
    </div>
  );
}
