/**
 * Gate and Terminal domain types matching backend schemas
 */

export type GateCapability = "DOMESTIC" | "INTERNATIONAL" | "BOTH";

export interface Gate {
  id: number;
  terminal_id: number;
  gate_code: string;
  gate_type: string;
  capability: GateCapability;
  supported_aircraft_types: string;
  max_aircraft_size: string;
  is_active: boolean;
  is_closed: boolean;
  closure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GateCreatePayload {
  terminal_id: number;
  gate_code: string;
  gate_type?: string;
  capability?: GateCapability;
  supported_aircraft_types?: string;
  max_aircraft_size?: string;
  is_active?: boolean;
  is_closed?: boolean;
  closure_reason?: string | null;
}

export interface GateUpdatePayload {
  gate_code?: string;
  gate_type?: string;
  capability?: GateCapability;
  supported_aircraft_types?: string;
  max_aircraft_size?: string;
  is_active?: boolean;
  is_closed?: boolean;
  closure_reason?: string | null;
}

export interface GateFilterParams {
  terminal_id?: number;
  airport_id?: number;
  is_active?: boolean;
  is_closed?: boolean;
  page?: number;
  page_size?: number;
}

export interface Terminal {
  id: number;
  airport_id: number;
  terminal_code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GateAssignmentInfo {
  id: number;
  flight_id: number;
  gate_id: number;
  assignment_start_time: string;
  assignment_end_time: string;
  status: string;
  source: string;
  reason: string | null;
}
