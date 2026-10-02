/**
 * Schedule & Gantt chart domain types matching backend schemas
 */

export type AssignmentStatus =
  | "TENTATIVE"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "REVOKED";

export interface Assignment {
  id: number;
  flight_id: number;
  gate_id: number;
  solver_run_id?: number | null;
  assignment_start_time: string;
  assignment_end_time: string;
  status: AssignmentStatus;
  source: string;
  reason?: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  flight_number?: string | null;
  airline?: string | null;
  gate_code?: string | null;
  terminal_code?: string | null;
}

export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ConflictType =
  | "GATE_COLLISION"
  | "TIME_OVERLAP"
  | "AIRCRAFT_INCOMPATIBLE"
  | "TERMINAL_MISMATCH"
  | "INTERNATIONAL_RESTRICTION"
  | "CURFEW_VIOLATION"
  | "UNASSIGNED_FLIGHT";

export interface Conflict {
  id: number;
  flight_id?: number | null;
  gate_id?: number | null;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  is_resolved: boolean;
  resolution_info?: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentFilterParams {
  flight_id?: number;
  gate_id?: number;
  airport_id?: number;
  status?: AssignmentStatus;
  solver_run_id?: number;
  start_time_after?: string;
  end_time_before?: string;
  page?: number;
  page_size?: number;
}

export interface ConflictFilterParams {
  airport_id?: number;
  flight_id?: number;
  gate_id?: number;
  conflict_type?: ConflictType;
  severity?: ConflictSeverity;
  is_resolved?: boolean;
  page?: number;
  page_size?: number;
}

export type GanttZoomLevel = "1h" | "3h" | "6h" | "12h" | "24h";

export interface ScheduleFilters {
  date: string;
  airportId: number | null;
  terminalId: number | null;
  gateId: number | null;
  status: string;
  searchTerm: string;
  zoom: GanttZoomLevel;
}
