/**
 * Flight domain types matching backend schemas
 */

export type FlightType = "DOMESTIC" | "INTERNATIONAL";

export type FlightPriority = "NORMAL" | "VIP" | "MEDICAL" | "EMERGENCY";

export type FlightStatus =
  | "SCHEDULED"
  | "BOARDING"
  | "DEPARTED"
  | "IN_AIR"
  | "APPROACHING"
  | "LANDED"
  | "AT_GATE"
  | "DELAYED"
  | "CANCELLED"
  | "COMPLETED";

export type DelayReason =
  | "WEATHER"
  | "AIR_TRAFFIC"
  | "AIRCRAFT"
  | "GATE"
  | "CREW"
  | "OPERATIONAL"
  | "UNKNOWN";

export interface Flight {
  id: number;
  flight_number: string;
  airline: string;
  origin_airport_id: number;
  destination_airport_id: number;
  aircraft_id: number | null;
  scheduled_arrival: string;
  scheduled_departure: string;
  actual_arrival: string | null;
  actual_departure: string | null;
  operational_arrival?: string | null;
  operational_departure?: string | null;
  flight_type: FlightType;
  passenger_count: number;
  priority: FlightPriority;
  turnaround_duration_minutes: number;
  delay_duration_minutes: number;
  delay_reason?: string | null;
  status: FlightStatus;
  created_at: string;
  updated_at: string;
}

export interface FlightCreatePayload {
  flight_number: string;
  airline: string;
  origin_airport_id: number;
  destination_airport_id: number;
  aircraft_id?: number | null;
  scheduled_arrival: string;
  scheduled_departure: string;
  actual_arrival?: string | null;
  actual_departure?: string | null;
  flight_type: FlightType;
  passenger_count: number;
  priority: FlightPriority;
  turnaround_duration_minutes: number;
  delay_duration_minutes?: number;
  delay_reason?: string | null;
  status: FlightStatus;
}

export interface FlightUpdatePayload {
  flight_number?: string;
  airline?: string;
  origin_airport_id?: number;
  destination_airport_id?: number;
  aircraft_id?: number | null;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  actual_arrival?: string | null;
  actual_departure?: string | null;
  flight_type?: FlightType;
  passenger_count?: number;
  priority?: FlightPriority;
  turnaround_duration_minutes?: number;
  delay_duration_minutes?: number;
  delay_reason?: string | null;
  status?: FlightStatus;
}

export interface FlightDelayPayload {
  delay_minutes: number;
  reason?: DelayReason;
  reschedule_if_conflict?: boolean;
}

export interface FlightDelayResponseData {
  success: boolean;
  flight_id: number;
  flight_number: string;
  airline: string;
  delay_minutes: number;
  delay_reason: string;
  original_arrival: string;
  original_departure: string;
  operational_arrival: string;
  operational_departure: string;
  has_conflict: boolean;
  conflict_detected?: Record<string, unknown> | null;
  rescheduled: boolean;
  status: "RETAINED" | "RESCHEDULED" | "NO_GATE_AVAILABLE" | "UNASSIGNED" | "CONFLICT_UNRESOLVED";
  previous_gate_code?: string | null;
  current_gate_code?: string | null;
  current_terminal_code?: string | null;
  solver_run_id?: number | null;
  assignment?: {
    flight_id: number;
    flight_number: string;
    gate_id: number;
    gate_code: string;
    terminal_code: string;
    start_time: string;
    end_time: string;
  } | null;
  message: string;
  events?: Array<Record<string, unknown>>;
  metrics?: Record<string, unknown>;
}

export interface FlightFilterParams {
  airport_id?: number;
  origin_airport_id?: number;
  destination_airport_id?: number;
  status?: FlightStatus;
  priority?: FlightPriority;
  flight_type?: FlightType;
  airline?: string;
  flight_number?: string;
  filter_date?: string;
  page?: number;
  page_size?: number;
}

export interface Airport {
  id: number;
  iata_code: string;
  icao_code: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Aircraft {
  id: number;
  registration: string;
  model: string;
  aircraft_type: string;
  airline: string;
  capacity: number;
  category: "REGIONAL" | "NARROW_BODY" | "WIDE_BODY" | "HEAVY";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
