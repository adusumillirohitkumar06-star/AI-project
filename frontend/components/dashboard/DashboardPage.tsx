"use client";

import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useBackendHealth } from "@/hooks/useBackendHealth";

export default function DashboardPage() {
  const { data: healthData, loading: healthLoading, error: healthError, refetch } = useBackendHealth();

  return (
    <PageContainer
      title="Airport Operations Control"
      description="Live supervisory dashboard for airport aprons, gate occupancy, and AI constraint scheduling."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh Status
          </Button>
          <Link href="/scheduler">
            <Button variant="primary" size="sm">
              AI Scheduler
            </Button>
          </Link>
        </div>
      }
    >
      {/* 1. Live System Status Bar */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              healthLoading
                ? "bg-zinc-400 animate-pulse"
                : healthError
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
          />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
              FastAPI Core Service:{" "}
              {healthLoading
                ? "Verifying connection..."
                : healthError
                ? "Connection Offline"
                : `Active (${healthData?.service || "API v1"})`}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              Environment: {healthData?.environment || "Development"} &bull; Constraint Engine: CSP v3.0 Ready
            </div>
          </div>
        </div>

        <div>
          {healthError ? (
            <Badge variant="danger">API Offline</Badge>
          ) : (
            <Badge variant="success">All Services Operational</Badge>
          )}
        </div>
      </div>

      {/* 2. Operational Metrics Cards (Empty/Loading states without fabricated numbers) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Operational Telemetry
          </h3>
          <span className="text-[11px] text-zinc-400 italic">
            Awaiting live telemetry stream (Phase 6+)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Managed Flights"
            description="Active & scheduled flights"
            isEmpty={true}
            emptyText="Awaiting Flight Data"
            statusText="Phase 6"
            statusVariant="info"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            }
          />
          <MetricCard
            title="Gate Utilization"
            description="Apron gate capacity"
            isEmpty={true}
            emptyText="Awaiting Gate Data"
            statusText="Phase 7"
            statusVariant="info"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <MetricCard
            title="Active Assignments"
            description="Confirmed allocations"
            isEmpty={true}
            emptyText="No active assignments"
            statusText="Phase 8"
            statusVariant="neutral"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <MetricCard
            title="Detected Conflicts"
            description="Schedule overlaps"
            isEmpty={true}
            emptyText="Zero active conflicts"
            statusText="Phase 8"
            statusVariant="success"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* 3. Operational Sections Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operations Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Operations Modules</CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                Phases 6-8
              </Badge>
            </div>
            <CardDescription>
              Airport ground operations, apron gates, flight schedules, and assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Flight Management</span>
                  <p className="text-zinc-500 text-[11px]">Flight schedule arrivals, departures, airline priorities</p>
                </div>
                <Link href="/flights">
                  <Button variant="ghost" size="sm">Inspect &rarr;</Button>
                </Link>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Gate Management</span>
                  <p className="text-zinc-500 text-[11px]">Terminal gates, jet bridges, wide-body compatibility</p>
                </div>
                <Link href="/gates">
                  <Button variant="ghost" size="sm">Inspect &rarr;</Button>
                </Link>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Airport Infrastructure</span>
                  <p className="text-zinc-500 text-[11px]">Terminals, geographical coordinates, apron zones</p>
                </div>
                <Link href="/airports">
                  <Button variant="ghost" size="sm">Inspect &rarr;</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Constraint Scheduling Section */}
        <Card className="border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-white to-blue-50/20 dark:from-zinc-900 dark:to-blue-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                AI Constraint Satisfaction Engine
              </CardTitle>
              <Badge variant="info" className="font-mono text-[10px]">
                Python CSP
              </Badge>
            </div>
            <CardDescription>
              Pure Python solver with rigorous hard and soft constraint verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-zinc-400 uppercase text-[10px]">Algorithm</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Backtracking + AC-3</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-zinc-400 uppercase text-[10px]">Heuristics</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">MRV + Degree + LCV</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-zinc-400 uppercase text-[10px]">Constraints</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Overlap, Aircraft, Gate</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-zinc-400 uppercase text-[10px]">Execution Layer</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">FastAPI Service v1</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/scheduler">
                <Button variant="primary" size="sm">
                  View Scheduler Specification
                </Button>
              </Link>
              <Link href="/reasoning">
                <Button variant="outline" size="sm">
                  XAI Reasoning
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
