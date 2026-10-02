"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { SimulationMetrics } from "@/types/simulation";

export interface SimulationDashboardProps {
  metrics: SimulationMetrics;
}

export function SimulationDashboard({ metrics }: SimulationDashboardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {/* 1. Total Flights */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Flights
            </span>
            <span className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              ✈
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {metrics.totalFlights}
            </span>
            <span className="text-[11px] text-zinc-500">simulated</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Not Departed */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Not Departed
            </span>
            <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              🛫
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.notDeparted}
            </span>
            <span className="text-[11px] text-zinc-500">at origin</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. In Flight */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              In Flight
            </span>
            <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 animate-pulse">
              ☁
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.inFlight}
            </span>
            <span className="text-[11px] text-zinc-500">en route</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Arrived */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Arrived
            </span>
            <span className="p-1 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              🛬
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.arrived}
            </span>
            <span className="text-[11px] text-zinc-500">at destination</span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Gates Allocated */}
      <Card className="border-zinc-200 dark:border-zinc-800 col-span-2 sm:col-span-1">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Gates Assigned
            </span>
            <span className="p-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              🎯
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.gatesAllocated ?? 0}
            </span>
            <span className="text-[11px] text-zinc-500">confirmed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
