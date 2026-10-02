"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { listSolverRuns, getSolverRunReasoning } from "@/lib/api/scheduling";
import {
  SolverRunSummary,
  SolverRunReasoningResponse,
  ReasoningEventData,
} from "@/types/scheduling";
import { SolverRunSelector } from "@/components/reasoning/SolverRunSelector";
import { MetricsPanel } from "@/components/reasoning/MetricsPanel";
import { StrategyComparison } from "@/components/reasoning/StrategyComparison";
import { ReasoningTimeline } from "@/components/reasoning/ReasoningTimeline";
import { BacktrackingTree } from "@/components/reasoning/BacktrackingTree";
import { EventDetailModal } from "@/components/reasoning/EventDetailModal";
import { AssignmentSummary } from "@/components/reasoning/AssignmentSummary";

function ReasoningDashboard() {
  const searchParams = useSearchParams();
  const initialRunIdParam = searchParams.get("runId");
  const initialFlightIdParam = searchParams.get("flightId");

  const [runs, setRuns] = useState<SolverRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(
    initialRunIdParam ? parseInt(initialRunIdParam, 10) : null
  );
  const [compareRunId, setCompareRunId] = useState<number | null>(null);

  const [reasoningData, setReasoningData] =
    useState<SolverRunReasoningResponse | null>(null);
  const [compareReasoningData, setCompareReasoningData] =
    useState<SolverRunReasoningResponse | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<ReasoningEventData | null>(
    null
  );
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(true);
  const [isLoadingReasoning, setIsLoadingReasoning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "TIMELINE" | "TREE" | "OUTCOMES"
  >("TIMELINE");

  // Load runs list
  const loadRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    setError(null);
    try {
      const res = await listSolverRuns(1, 50);
      const items = res.items || [];
      setRuns(items);

      if (items.length > 0) {
        if (!selectedRunId) {
          // If no specific run requested, default to most recent run
          setSelectedRunId(items[0].id);
        } else {
          // Verify if requested run exists, if not, pick first
          const exists = items.some((r) => r.id === selectedRunId);
          if (!exists) {
            setSelectedRunId(items[0].id);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load solver runs:", err);
      setError("Failed to load solver runs from the backend.");
    } finally {
      setIsLoadingRuns(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Load reasoning data for selected run
  useEffect(() => {
    if (!selectedRunId) return;

    let isMounted = true;
    setIsLoadingReasoning(true);

    getSolverRunReasoning(selectedRunId)
      .then((data) => {
        if (isMounted) {
          setReasoningData(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch solver reasoning:", err);
          setError(`Unable to load reasoning events for Run #${selectedRunId}`);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingReasoning(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  // Load comparison reasoning data when compareRunId changes
  useEffect(() => {
    if (!compareRunId) {
      setCompareReasoningData(null);
      return;
    }

    let isMounted = true;
    getSolverRunReasoning(compareRunId)
      .then((data) => {
        if (isMounted) {
          setCompareReasoningData(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch compare run reasoning:", err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [compareRunId]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Explainable AI (XAI) & Solver Reasoning Interface</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
              CSP Telemetry
            </span>
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Deterministic inspection of pure Python CSP decision steps, MRV heuristic selections, constraint evaluations, and backtrack justifications.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRuns}
          className="self-start sm:self-auto px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition"
        >
          ↻ Refresh Solver Runs
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Solver Runs Table / Selector */}
      <SolverRunSelector
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={(id) => setSelectedRunId(id)}
        compareRunId={compareRunId}
        onSelectCompareRun={(id) => setCompareRunId(id)}
        isLoading={isLoadingRuns}
      />

      {/* When a run is selected and data is loaded */}
      {isLoadingReasoning ? (
        <div className="py-12 text-center text-xs text-zinc-400 font-mono animate-pulse">
          Loading algorithmic reasoning trace for Run #{selectedRunId}...
        </div>
      ) : reasoningData ? (
        <div className="space-y-6">
          {/* Key Metrics Panel */}
          <MetricsPanel reasoningData={reasoningData} />

          {/* Side-by-Side Comparison if compare run is selected */}
          {compareReasoningData && (
            <StrategyComparison
              runA={reasoningData}
              runB={compareReasoningData}
              onClose={() => setCompareRunId(null)}
            />
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("TIMELINE")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
                activeTab === "TIMELINE"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Reasoning Feed ({reasoningData.reasoning_events.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TREE")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
                activeTab === "TREE"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Search Tree & Backtracks ({reasoningData.backtracks_count})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("OUTCOMES")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
                activeTab === "OUTCOMES"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Flight Allocation Outcomes ({reasoningData.assignments_produced} / {reasoningData.flights_considered})
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === "TIMELINE" && (
            <ReasoningTimeline
              events={reasoningData.reasoning_events}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              initialFlightFilter={initialFlightIdParam}
            />
          )}

          {activeTab === "TREE" && (
            <BacktrackingTree
              events={reasoningData.reasoning_events}
              backtracksCount={reasoningData.backtracks_count}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
            />
          )}

          {activeTab === "OUTCOMES" && (
            <AssignmentSummary
              events={reasoningData.reasoning_events}
              onFilterFlight={() => {
                setActiveTab("TIMELINE");
              }}
            />
          )}
        </div>
      ) : null}

      {/* Modal for Deep Event Inspection */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export default function ReasoningPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center font-mono text-xs text-zinc-400 animate-pulse">
          Loading Explainable AI Reasoning interface...
        </div>
      }
    >
      <ReasoningDashboard />
    </Suspense>
  );
}
