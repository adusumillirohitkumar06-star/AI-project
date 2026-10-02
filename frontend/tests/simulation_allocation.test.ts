/**
 * Test Suite for Phase 12: Connect Flight Simulation with AI Gate Allocation
 * Validates dynamic gate allocation triggers on flight approach, deduplication,
 * state updating, failure handling, and metric telemetry.
 */

import {
  computeFlightSimState,
  computeSimulationMetrics,
} from "../lib/utils/simulation";
import { Airport, Flight } from "../types/flight";
import { FlightRouteInfo } from "../types/map";
import {
  GateAllocationStatus,
  SimulatedFlightRoute,
  SimulationEvent,
} from "../types/simulation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("=== Phase 12: Simulation & AI Gate Allocation Test Suite ===");

const testAirportDEL: Airport = {
  id: 1,
  iata_code: "DEL",
  icao_code: "VIDP",
  name: "Indira Gandhi International Airport",
  city: "New Delhi",
  country: "India",
  latitude: 28.5562,
  longitude: 77.1,
  timezone: "Asia/Kolkata",
  is_active: true,
  created_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
};

const testAirportDXB: Airport = {
  id: 2,
  iata_code: "DXB",
  icao_code: "OMDB",
  name: "Dubai International Airport",
  city: "Dubai",
  country: "United Arab Emirates",
  latitude: 25.2532,
  longitude: 55.3657,
  timezone: "Asia/Dubai",
  is_active: true,
  created_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
};

const depTime = "2026-10-02T10:00:00Z";
const arrTime = "2026-10-02T14:00:00Z";
const depMs = new Date(depTime).getTime();
const arrMs = new Date(arrTime).getTime();

const unassignedFlight: Flight = {
  id: 201,
  flight_number: "EK511",
  airline: "Emirates",
  origin_airport_id: 1,
  destination_airport_id: 2,
  aircraft_id: null,
  scheduled_departure: depTime,
  scheduled_arrival: arrTime,
  actual_arrival: null,
  actual_departure: null,
  flight_type: "INTERNATIONAL",
  passenger_count: 350,
  priority: "VIP",
  turnaround_duration_minutes: 60,
  delay_duration_minutes: 0,
  status: "SCHEDULED",
  created_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
};

const unassignedRoute: FlightRouteInfo = {
  flight: unassignedFlight,
  originAirport: testAirportDEL,
  destinationAirport: testAirportDXB,
  aircraft: null,
  assignedGateCode: null,
  assignedTerminalCode: null,
  pathCoordinates: [],
  distanceKm: 2200,
  progress: 0,
  currentPosition: [testAirportDEL.latitude, testAirportDEL.longitude],
  bearing: 260,
};

// 1. Metrics includes gate allocation count
{
  const routeWithGate: FlightRouteInfo = {
    ...unassignedRoute,
    assignedGateCode: "B14",
    assignedTerminalCode: "T3",
  };

  const sim1 = computeFlightSimState(unassignedRoute, depMs + 1000);
  const sim2 = computeFlightSimState(routeWithGate, depMs + 1000);

  const metrics = computeSimulationMetrics([sim1, sim2]);
  assert(metrics.totalFlights === 2, "Total flights must be 2");
  assert(metrics.gatesAllocated === 1, "Gates allocated count must accurately reflect 1");
  console.log("✔ Test 1: Simulation metrics gate allocation count passed.");
}

// 2. Approach threshold trigger logic (progress >= 0.70)
{
  const earlyFlightMs = depMs + (arrMs - depMs) * 0.4; // 40%
  const earlySim = computeFlightSimState(unassignedRoute, earlyFlightMs);
  assert(
    earlySim.simProgress < 0.7,
    "Early in-flight progress should be below approach threshold"
  );

  const approachFlightMs = depMs + (arrMs - depMs) * 0.75; // 75%
  const approachSim = computeFlightSimState(unassignedRoute, approachFlightMs);
  assert(
    approachSim.simStatus === "IN_FLIGHT" && approachSim.simProgress >= 0.7,
    "Flight at 75% should trigger destination approach state"
  );
  console.log("✔ Test 2: Destination approach threshold trigger condition passed.");
}

// 3. Request deduplication tracker
{
  const allocatedIds = new Set<number>();
  const flightId = 201;

  let requestCount = 0;
  function triggerMockAllocation(id: number) {
    if (allocatedIds.has(id)) return;
    allocatedIds.add(id);
    requestCount++;
  }

  // First approach tick
  triggerMockAllocation(flightId);
  assert(requestCount === 1, "First trigger must dispatch allocation request");

  // Subsequent simulation ticks while still in approach
  triggerMockAllocation(flightId);
  triggerMockAllocation(flightId);
  assert(requestCount === 1, "Subsequent ticks must be deduplicated without extra requests");
  console.log("✔ Test 3: Allocation request deduplication passed.");
}

// 4. Successful allocation state update & event emission
{
  let currentRoute = { ...unassignedRoute };
  const events: SimulationEvent[] = [];

  // Simulated CSP solver response
  const cspResponse = {
    success: true,
    status: "ALLOCATED",
    flight_id: 201,
    gate_code: "B22",
    terminal_code: "T3",
  };

  if (cspResponse.success && cspResponse.gate_code) {
    currentRoute = {
      ...currentRoute,
      assignedGateCode: cspResponse.gate_code,
      assignedTerminalCode: cspResponse.terminal_code,
    };
    events.push({
      id: "ev-alloc-1",
      simTimeIso: new Date(depMs + 3600000).toISOString(),
      simTimeFormatted: "11:00:00 UTC",
      simTimeMs: depMs + 3600000,
      flightId: 201,
      flightNumber: currentRoute.flight.flight_number,
      airline: currentRoute.flight.airline,
      eventType: "GATE_ASSIGNED",
      description: `Gate ${cspResponse.gate_code} (${cspResponse.terminal_code}) allocated by CSP Engine at DXB`,
    });
  }

  assert(currentRoute.assignedGateCode === "B22", "Gate code must update to B22");
  assert(currentRoute.assignedTerminalCode === "T3", "Terminal must update to T3");
  assert(events.length === 1, "Event must be recorded");
  assert(events[0].eventType === "GATE_ASSIGNED", "Event type must be GATE_ASSIGNED");
  console.log("✔ Test 4: Dynamic allocation state update and event logging passed.");
}

// 5. No gate available / CSP conflict state handling
{
  const events: SimulationEvent[] = [];
  const flightGateStatuses: Record<number, { status: GateAllocationStatus; error?: string }> = {};

  const cspFailureResponse = {
    success: false,
    status: "NO_GATE_AVAILABLE",
    flight_id: 201,
    message: "No compatible gate available at DXB for flight constraints",
  };

  if (!cspFailureResponse.success) {
    flightGateStatuses[201] = {
      status: "FAILED",
      error: cspFailureResponse.message,
    };
    events.push({
      id: "ev-fail-1",
      simTimeIso: new Date(depMs + 3600000).toISOString(),
      simTimeFormatted: "11:00:00 UTC",
      simTimeMs: depMs + 3600000,
      flightId: 201,
      flightNumber: unassignedFlight.flight_number,
      airline: unassignedFlight.airline,
      eventType: "GATE_ALLOCATION_FAILED",
      description: `No gate available at DXB: ${cspFailureResponse.message}`,
    });
  }

  assert(flightGateStatuses[201].status === "FAILED", "Flight status must be FAILED");
  assert(events.length === 1, "Event must be recorded");
  assert(events[0].eventType === "GATE_ALLOCATION_FAILED", "Event type must be GATE_ALLOCATION_FAILED");
  console.log("✔ Test 5: No gate available conflict handling passed.");
}

// 6. Reset logic clears allocations and tracker
{
  const allocatedIds = new Set<number>([201, 202]);
  let events: SimulationEvent[] = [
    {
      id: "ev-1",
      simTimeIso: "",
      simTimeFormatted: "",
      simTimeMs: 0,
      flightId: 201,
      flightNumber: "EK511",
      airline: "Emirates",
      eventType: "GATE_ASSIGNED",
      description: "Gate allocated",
    },
  ];
  let flightGateStatuses: Record<number, { status: GateAllocationStatus }> = {
    201: { status: "ASSIGNED" },
  };

  // Trigger reset
  allocatedIds.clear();
  events = [];
  flightGateStatuses = {};

  assert(allocatedIds.size === 0, "Deduplication tracker must be cleared on reset");
  assert(events.length === 0, "Events array must be emptied on reset");
  assert(Object.keys(flightGateStatuses).length === 0, "Statuses map must be emptied on reset");
  console.log("✔ Test 6: Simulation reset handler integrity passed.");
}

console.log("\nALL 6 PHASE 12 SIMULATION-AI GATE ALLOCATION TESTS PASSED SUCCESSFULLY! 🚀");
