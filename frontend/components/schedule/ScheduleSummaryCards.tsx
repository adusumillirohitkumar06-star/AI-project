"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

export interface ScheduleSummaryCardsProps {
  totalFlights: number;
  assignedFlights: number;
  gatesUsed: number;
  totalGates: number;
  conflictsCount: number;
}

export function ScheduleSummaryCards({
  totalFlights,
  assignedFlights,
  gatesUsed,
  totalGates,
  conflictsCount,
}: ScheduleSummaryCardsProps) {
  const assignmentRate =
    totalFlights > 0 ? Math.round((assignedFlights / totalFlights) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Total Flights */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Total Flights
            </span>
            <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {totalFlights}
            </span>
            <span className="text-xs text-zinc-500">manifest</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Assigned Flights */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Allocated Gates
            </span>
            <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {assignedFlights}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              ({assignmentRate}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Gates Occupied */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Gates Occupied
            </span>
            <span className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25A2.25 2.25 0 010 18.75V5.25A2.25 2.25 0 012.25 3h13.5A2.25 2.25 0 0118 5.25v13.5A2.25 2.25 0 0115.75 21H13.5zm0 0v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {gatesUsed}
            </span>
            <span className="text-xs text-zinc-500">
              of {totalGates} available
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Active Conflicts */}
      <Card
        className={`border-zinc-200 dark:border-zinc-800 ${
          conflictsCount > 0
            ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10"
            : ""
        }`}
      >
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Active Conflicts
            </span>
            <span
              className={`p-1.5 rounded-md ${
                conflictsCount > 0
                  ? "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                conflictsCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {conflictsCount}
            </span>
            <span className="text-xs text-zinc-500">
              {conflictsCount === 0 ? "zero collisions" : "require attention"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
