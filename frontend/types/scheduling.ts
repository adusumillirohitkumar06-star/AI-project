/**
 * TypeScript interfaces matching the backend CSP solver schemas
 */

export type SolverStrategyOption =
  | "BACKTRACKING"
  | "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION";

export interface ScheduleSolveRequestPayload {
  airport_id: number;
  flight_ids?: number[];
  strategy?: SolverStrategyOption;
  inter_flight_buffer_minutes?: number;
}

export interface ScheduledAssignment {
  flight_id: number;
  flight_number: string;
  gate_id: number;
  gate_code: string;
  terminal_code: string;
  start_time: string;
  end_time: string;
}

export interface SolverMetricsData {
  execution_time_ms: number;
  nodes_explored: number;
  assignments_attempted: number;
  backtracks: number;
  constraint_checks: number;
  conflicts_detected: number;
  flights_total: number;
  flights_assigned: number;
  domain_reductions?: number;
  propagation_steps?: number;
  maximum_search_depth?: number;
  success: boolean;
  message?: string;
}

export interface SolverConflictData {
  conflict_type: string;
  description: string;
  severity: string;
  flight_id?: number | string | null;
  gate_id?: number | string | null;
}

export interface UnassignedFlightData {
  flight_id: number | string;
  flight_number: string;
  arrival_time: string;
  departure_time: string;
  priority: string;
  flight_type: string;
}

export interface ReasoningEventData {
  step_index: number;
  event_type: string;
  message: string;
  timestamp: string;
  flight_id?: number | string | null;
  gate_id?: number | string | null;
  constraint?: string | null;
  details?: Record<string, unknown>;
}

export interface ScheduleSolveResponseData {
  success: boolean;
  solver_run_id?: number | null;
  strategy: string;
  assignments: ScheduledAssignment[];
  unassigned_flights: UnassignedFlightData[];
  conflicts: SolverConflictData[];
  metrics: SolverMetricsData;
  reasoning_events: ReasoningEventData[];
}

export interface SolverRunSummary {
  id: number;
  strategy: SolverStrategyOption;
  started_at: string;
  completed_at?: string | null;
  execution_time_ms?: number | null;
  flights_considered: number;
  assignments_produced: number;
  nodes_explored: number;
  backtracks_count: number;
  conflicts_count: number;
  is_success: boolean;
  solver_configuration?: Record<string, unknown> | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
}

export interface SolverRunReasoningResponse {
  solver_run_id: number;
  strategy: string;
  is_success: boolean;
  execution_time_ms: number;
  nodes_explored: number;
  backtracks_count: number;
  conflicts_count: number;
  flights_considered: number;
  assignments_produced: number;
  reasoning_events: ReasoningEventData[];
}
