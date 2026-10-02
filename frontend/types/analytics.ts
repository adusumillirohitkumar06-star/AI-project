/**
 * TypeScript definitions for Phase 15: Analytics & Performance Dashboard
 */

export interface AnalyticsOverview {
  total_flights: number;
  assigned_flights: number;
  unassigned_flights: number;
  total_gates: number;
  gates_used: number;
  active_conflicts: number;
  delayed_flights: number;
  total_delay_minutes: number;
  avg_delay_minutes: number;
  max_delay_minutes: number;
  total_solver_runs: number;
  successful_solver_runs: number;
}

export interface AirportFlightCount {
  airport_id: number;
  airport_code: string;
  airport_name: string;
  city: string;
  departures: number;
  arrivals: number;
}

export interface FlightDelaySummary {
  delayed_count: number;
  total_delay_minutes: number;
  avg_delay_minutes: number;
  max_delay_minutes: number;
  by_reason: Record<string, number>;
}

export interface FlightAnalytics {
  total_flights: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_flight_type: Record<string, number>;
  by_airport: AirportFlightCount[];
  delay_summary: FlightDelaySummary;
}

export interface GateUtilizationItem {
  gate_id: number;
  gate_code: string;
  terminal_code: string;
  airport_code: string;
  max_aircraft_size: string;
  is_active: boolean;
  flight_count: number;
  occupied_minutes: number;
  utilization_percentage: number;
}

export interface GateUtilization {
  total_gates: number;
  active_gates: number;
  gates_used: number;
  total_occupied_minutes: number;
  overall_utilization_percentage: number;
  analysis_window_minutes: number;
  gates: GateUtilizationItem[];
}

export interface ConflictTimelineItem {
  date_str: string;
  count: number;
}

export interface ConflictAnalytics {
  total_conflicts: number;
  open_conflicts: number;
  resolved_conflicts: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  timeline: ConflictTimelineItem[];
}

export interface StrategyMetricSummary {
  strategy: string;
  run_count: number;
  success_count: number;
  avg_execution_time_ms: number;
  avg_nodes_explored: number;
  avg_backtracks: number;
  avg_assignments: number;
  avg_constraint_checks: number;
}

export interface SolverRunHistoryPoint {
  run_id: number;
  strategy: string;
  is_success: boolean;
  execution_time_ms: number;
  nodes_explored: number;
  backtracks_count: number;
  created_at: string;
}

export interface SolverPerformance {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_execution_time_ms: number;
  total_nodes_explored: number;
  total_backtracks: number;
  strategy_comparison: StrategyMetricSummary[];
  runs_history: SolverRunHistoryPoint[];
}

export interface ReschedulingAnalytics {
  total_reschedule_events: number;
  delays_applied: number;
  reassignments_succeeded: number;
  reassignments_failed: number;
  conflicts_resolved: number;
  affected_flights_count: number;
}

export interface AnalyticsFilterState {
  airportId: number | null;
  timeRange: "ALL" | "TODAY" | "LAST_24H" | "LAST_7D";
}
