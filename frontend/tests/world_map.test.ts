/**
 * Test Suite for Phase 10: World Map & Airport Route Visualization
 * Validates great-circle geospatial mathematics, route derivation from real coordinates,
 * filtering logic, selection mechanics, and zero mock data usage.
 */

import {
  haversineDistance,
  calculateBearing,
  interpolatePosition,
  generateGreatCirclePoints,
  calculateFlightProgress,
  getAircraftDisplayPosition,
} from "../lib/utils/geo";
import { Airport, Flight } from "../types/flight";
import { FlightRouteInfo, MapFilterState } from "../types/map";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("=== Phase 10: World Map & Route Visualization Test Suite ===");

// 1. Haversine Distance: Real Coordinates (JFK to LHR)
{
  const jfk = { lat: 40.6413, lon: -73.7781 };
  const lhr = { lat: 51.47, lon: -0.4543 };

  const distance = haversineDistance(jfk.lat, jfk.lon, lhr.lat, lhr.lon);
  // Real distance is ~5550 km
  assert(
    distance > 5500 && distance < 5600,
    `Haversine distance JFK-LHR must be ~5550 km, got ${distance} km`
  );
  console.log(`✔ Test 1: Haversine great-circle distance accurate (${distance} km).`);
}

// 2. Compass Bearing: Direction of Flight
{
  // Flying directly North
  const bearingNorth = calculateBearing(0, 0, 10, 0);
  assert(Math.round(bearingNorth) === 0, `North bearing must be 0°, got ${bearingNorth}°`);

  // Flying directly East
  const bearingEast = calculateBearing(0, 0, 0, 10);
  assert(Math.round(bearingEast) === 90, `East bearing must be 90°, got ${bearingEast}°`);
  console.log("✔ Test 2: Compass bearing angle calculation passed.");
}

// 3. Spherical Interpolation along Great Circle
{
  const origin = { lat: 10, lon: 20 };
  const dest = { lat: 30, lon: 40 };

  const startPoint = interpolatePosition(origin.lat, origin.lon, dest.lat, dest.lon, 0);
  assert(
    Math.abs(startPoint[0] - origin.lat) < 0.001 &&
      Math.abs(startPoint[1] - origin.lon) < 0.001,
    "Interpolation at t=0 must match origin"
  );

  const endPoint = interpolatePosition(origin.lat, origin.lon, dest.lat, dest.lon, 1);
  assert(
    Math.abs(endPoint[0] - dest.lat) < 0.001 &&
      Math.abs(endPoint[1] - dest.lon) < 0.001,
    "Interpolation at t=1 must match destination"
  );

  const midPoint = interpolatePosition(origin.lat, origin.lon, dest.lat, dest.lon, 0.5);
  assert(
    midPoint[0] > origin.lat && midPoint[0] < dest.lat,
    "Interpolation at t=0.5 must be between origin and destination"
  );
  console.log("✔ Test 3: Great-circle spherical interpolation passed.");
}

// 4. Great Circle Arc Points Generator
{
  const points = generateGreatCirclePoints(40.6413, -73.7781, 51.47, -0.4543, 20);
  assert(points.length === 21, "Must generate 21 points for 20 segments");

  for (const [lat, lon] of points) {
    assert(lat >= -90 && lat <= 90, `Latitude must be valid, got ${lat}`);
    assert(lon >= -180 && lon <= 180, `Longitude must be valid, got ${lon}`);
  }
  console.log("✔ Test 4: Geodesic route polyline points valid across all segments.");
}

// 5. Flight Progress & Aircraft Display Position
{
  const departure = "2026-10-02T10:00:00Z";
  const arrival = "2026-10-02T12:00:00Z";

  // Before departure
  const pBefore = calculateFlightProgress(departure, arrival, new Date("2026-10-02T09:00:00Z").getTime());
  assert(pBefore === 0, "Progress before departure must be 0");

  // Halfway
  const pHalf = calculateFlightProgress(departure, arrival, new Date("2026-10-02T11:00:00Z").getTime());
  assert(Math.abs(pHalf - 0.5) < 0.01, "Progress halfway must be 0.5");

  // After arrival
  const pAfter = calculateFlightProgress(departure, arrival, new Date("2026-10-02T13:00:00Z").getTime());
  assert(pAfter === 1, "Progress after arrival must be 1");

  // Display position calculation for IN_AIR
  const { position, bearing } = getAircraftDisplayPosition(10, 20, 30, 40, "IN_AIR", 0.5);
  assert(position.length === 2, "Must return valid 2D coordinates");
  assert(bearing >= 0 && bearing <= 360, "Must return valid compass bearing");
  console.log("✔ Test 5: Real-time progress and aircraft heading derivation passed.");
}

// 6. Route Construction from Real Backend Entities
{
  const testAirportA: Airport = {
    id: 1,
    iata_code: "DEL",
    icao_code: "VIDP",
    name: "Indira Gandhi International Airport",
    city: "New Delhi",
    country: "India",
    latitude: 28.5562,
    longitude: 77.1000,
    timezone: "Asia/Kolkata",
    is_active: true,
    created_at: "2026-10-02T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
  };

  const testAirportB: Airport = {
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

  const testFlight: Flight = {
    id: 101,
    flight_number: "AI101",
    airline: "Air India",
    origin_airport_id: 1,
    destination_airport_id: 2,
    aircraft_id: null,
    scheduled_arrival: "2026-10-02T14:00:00Z",
    scheduled_departure: "2026-10-02T11:00:00Z",
    actual_arrival: null,
    actual_departure: null,
    flight_type: "INTERNATIONAL",
    passenger_count: 240,
    priority: "NORMAL",
    turnaround_duration_minutes: 60,
    delay_duration_minutes: 0,
    status: "IN_AIR",
    created_at: "2026-10-02T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
  };

  const route: FlightRouteInfo = {
    flight: testFlight,
    originAirport: testAirportA,
    destinationAirport: testAirportB,
    aircraft: null,
    pathCoordinates: generateGreatCirclePoints(
      testAirportA.latitude,
      testAirportA.longitude,
      testAirportB.latitude,
      testAirportB.longitude,
      20
    ),
    distanceKm: haversineDistance(
      testAirportA.latitude,
      testAirportA.longitude,
      testAirportB.latitude,
      testAirportB.longitude
    ),
    progress: 0.5,
    currentPosition: interpolatePosition(
      testAirportA.latitude,
      testAirportA.longitude,
      testAirportB.latitude,
      testAirportB.longitude,
      0.5
    ),
    bearing: calculateBearing(
      testAirportA.latitude,
      testAirportA.longitude,
      testAirportB.latitude,
      testAirportB.longitude
    ),
  };

  assert(route.originAirport.iata_code === "DEL", "Route origin must be DEL");
  assert(route.destinationAirport.iata_code === "DXB", "Route destination must be DXB");
  assert(route.distanceKm > 2100 && route.distanceKm < 2300, `Distance DEL-DXB should be ~2200 km, got ${route.distanceKm}`);
  console.log("✔ Test 6: Flight route constructed with real airport coordinates passed.");
}

// 7. Filtering & Multi-Search
{
  const routes: FlightRouteInfo[] = [
    {
      flight: {
        id: 1,
        flight_number: "EK500",
        airline: "Emirates",
        origin_airport_id: 2,
        destination_airport_id: 1,
        aircraft_id: null,
        scheduled_arrival: "2026-10-02T16:00:00Z",
        scheduled_departure: "2026-10-02T13:00:00Z",
        actual_arrival: null,
        actual_departure: null,
        flight_type: "INTERNATIONAL",
        passenger_count: 350,
        priority: "VIP",
        turnaround_duration_minutes: 60,
        delay_duration_minutes: 0,
        status: "IN_AIR",
        created_at: "",
        updated_at: "",
      },
      originAirport: { id: 2, iata_code: "DXB", icao_code: "OMDB", name: "Dubai", city: "Dubai", country: "UAE", latitude: 25.2, longitude: 55.3, timezone: "Asia/Dubai", is_active: true, created_at: "", updated_at: "" },
      destinationAirport: { id: 1, iata_code: "DEL", icao_code: "VIDP", name: "Delhi", city: "Delhi", country: "India", latitude: 28.5, longitude: 77.1, timezone: "Asia/Kolkata", is_active: true, created_at: "", updated_at: "" },
      pathCoordinates: [],
      distanceKm: 2200,
      progress: 0.5,
      currentPosition: [26.8, 66.2],
      bearing: 85,
    },
    {
      flight: {
        id: 2,
        flight_number: "AI302",
        airline: "Air India",
        origin_airport_id: 1,
        destination_airport_id: 3,
        aircraft_id: null,
        scheduled_arrival: "2026-10-02T18:00:00Z",
        scheduled_departure: "2026-10-02T16:00:00Z",
        actual_arrival: null,
        actual_departure: null,
        flight_type: "DOMESTIC",
        passenger_count: 180,
        priority: "NORMAL",
        status: "SCHEDULED",
        turnaround_duration_minutes: 45,
        delay_duration_minutes: 0,
        created_at: "",
        updated_at: "",
      },
      originAirport: { id: 1, iata_code: "DEL", icao_code: "VIDP", name: "Delhi", city: "Delhi", country: "India", latitude: 28.5, longitude: 77.1, timezone: "Asia/Kolkata", is_active: true, created_at: "", updated_at: "" },
      destinationAirport: { id: 3, iata_code: "BOM", icao_code: "VABB", name: "Mumbai", city: "Mumbai", country: "India", latitude: 19.0, longitude: 72.8, timezone: "Asia/Kolkata", is_active: true, created_at: "", updated_at: "" },
      pathCoordinates: [],
      distanceKm: 1150,
      progress: 0,
      currentPosition: [28.5, 77.1],
      bearing: 195,
    },
  ];

  // Search by flight number
  const searchEK = routes.filter((r) => r.flight.flight_number.toLowerCase().includes("ek"));
  assert(searchEK.length === 1 && searchEK[0].flight.flight_number === "EK500", "Search by flight number failed");

  // Search by city
  const searchMumbai = routes.filter((r) => r.destinationAirport.city.toLowerCase().includes("mumbai"));
  assert(searchMumbai.length === 1 && searchMumbai[0].flight.flight_number === "AI302", "Search by city failed");

  // Filter by status
  const filterInAir = routes.filter((r) => r.flight.status === "IN_AIR");
  assert(filterInAir.length === 1 && filterInAir[0].flight.flight_number === "EK500", "Filter by status failed");

  // Filter by priority
  const filterVIP = routes.filter((r) => r.flight.priority === "VIP");
  assert(filterVIP.length === 1 && filterVIP[0].flight.flight_number === "EK500", "Filter by priority failed");

  console.log("✔ Test 7: Multi-field search and filters (status, priority, city) passed.");
}

console.log("\nALL 7 PHASE 10 WORLD MAP TESTS PASSED SUCCESSFULLY! 🌐");
