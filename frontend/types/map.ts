import { Aircraft, Airport, Flight, FlightPriority, FlightStatus } from "./flight";

export interface FlightRouteInfo {
  flight: Flight;
  originAirport: Airport;
  destinationAirport: Airport;
  aircraft?: Aircraft | null;
  assignedGateCode?: string | null;
  assignedTerminalCode?: string | null;
  pathCoordinates: [number, number][];
  distanceKm: number;
  progress: number;
  currentPosition: [number, number];
  bearing: number;
}

export interface MapFilterState {
  searchTerm: string;
  airportId: number | null;
  status: FlightStatus | "ALL";
  priority: FlightPriority | "ALL";
}

export type SelectedMapEntity =
  | {
      type: "flight";
      data: FlightRouteInfo;
    }
  | {
      type: "airport";
      data: Airport;
      departures: FlightRouteInfo[];
      arrivals: FlightRouteInfo[];
    }
  | null;
