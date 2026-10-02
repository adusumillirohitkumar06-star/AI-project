import { FlightRouteInfo } from "./map";

export type SimulationSpeed = 1 | 2 | 5 | 10;

export type SimulationPlayState = "PAUSED" | "RUNNING";

export type FlightSimStatus = "BEFORE_DEPARTURE" | "IN_FLIGHT" | "ARRIVED";

export type GateAllocationStatus = "UNASSIGNED" | "REQUESTING" | "ASSIGNED" | "FAILED";

export interface SimulatedFlightRoute extends FlightRouteInfo {
  simStatus: FlightSimStatus;
  simProgress: number; // 0.0 to 1.0
  simCurrentPosition: [number, number];
  simBearing: number;
  gateAllocationStatus?: GateAllocationStatus;
  gateAllocationError?: string | null;
}

export type SimulationEventType =
  | "FLIGHT_DEPARTED"
  | "FLIGHT_ARRIVED"
  | "GATE_ALLOCATION_REQUESTED"
  | "GATE_ASSIGNED"
  | "GATE_ALLOCATION_FAILED"
  | "DELAY_APPLIED"
  | "GATE_CONFLICT_DETECTED"
  | "RESCHEDULING_REQUESTED"
  | "GATE_REASSIGNED"
  | "RESCHEDULING_FAILED"
  | "CONFLICT_RESOLVED";

export interface SimulationEvent {
  id: string;
  simTimeIso: string;
  simTimeFormatted: string;
  simTimeMs: number;
  flightId: number;
  flightNumber: string;
  airline: string;
  eventType: SimulationEventType;
  description: string;
}

export interface SimulationMetrics {
  totalFlights: number;
  notDeparted: number;
  inFlight: number;
  arrived: number;
  gatesAllocated?: number;
}

export interface SimulationGateAllocationRequestPayload {
  flight_id: number;
  simulation_time?: string;
  inter_flight_buffer_minutes?: number;
  strategy?: string;
}

export interface SimulationGateAllocationResponseData {
  success: boolean;
  status: "RETAINED" | "ALLOCATED" | "NO_GATE_AVAILABLE";
  flight_id: number;
  gate_id?: number | null;
  gate_code?: string | null;
  terminal_code?: string | null;
  solver_run_id?: number | null;
  message: string;
  assignment?: {
    flight_id: number;
    flight_number: string;
    gate_id: number;
    gate_code: string;
    terminal_code: string;
    start_time: string;
    end_time: string;
  } | null;
  conflicts?: Array<Record<string, unknown>>;
  metrics?: Record<string, unknown>;
}
