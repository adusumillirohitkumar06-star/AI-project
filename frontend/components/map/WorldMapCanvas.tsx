"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Airport } from "@/types/flight";
import { FlightRouteInfo, SelectedMapEntity } from "@/types/map";

export interface WorldMapCanvasProps {
  airports: Airport[];
  routes: FlightRouteInfo[];
  selectedEntity: SelectedMapEntity;
  onSelectFlight: (route: FlightRouteInfo) => void;
  onSelectAirport: (airport: Airport) => void;
  onRegisterMapActions?: (actions: {
    resetView: () => void;
    fitFlights: () => void;
    focusAirport: (airport: Airport) => void;
  }) => void;
}

export function WorldMapCanvas({
  airports,
  routes,
  selectedEntity,
  onSelectFlight,
  onSelectAirport,
  onRegisterMapActions,
}: WorldMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const aircraftLayerRef = useRef<L.LayerGroup | null>(null);
  const airportsLayerRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [25, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false,
    });

    // Add crisp aviation basemap tile layer (CartoDB Voyager)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Zoom control at top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Create layer groups
    routesLayerRef.current = L.layerGroup().addTo(map);
    aircraftLayerRef.current = L.layerGroup().addTo(map);
    airportsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Register external map controls
    if (onRegisterMapActions) {
      onRegisterMapActions({
        resetView: () => {
          map.setView([25, 10], 3);
        },
        fitFlights: () => {
          const latLngs: L.LatLngExpression[] = [];
          routes.forEach((r) => {
            r.pathCoordinates.forEach((coord) => latLngs.push(coord));
          });
          if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
          }
        },
        focusAirport: (airport: Airport) => {
          map.flyTo([airport.latitude, airport.longitude], 6, {
            duration: 1.2,
          });
        },
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [routes, onRegisterMapActions]);

  // 2. Render Flight Routes Layer
  useEffect(() => {
    const layer = routesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    routes.forEach((route) => {
      const isSelected =
        selectedEntity?.type === "flight" &&
        selectedEntity.data.flight.id === route.flight.id;

      // Color coding based on status
      let color = "#3b82f6"; // blue default
      let dashArray: string | undefined = undefined;

      switch (route.flight.status) {
        case "IN_AIR":
        case "DEPARTED":
          color = "#10b981"; // emerald
          break;
        case "DELAYED":
          color = "#f59e0b"; // amber
          dashArray = "5, 5";
          break;
        case "CANCELLED":
          color = "#ef4444"; // rose
          dashArray = "4, 6";
          break;
        case "COMPLETED":
          color = "#64748b"; // slate
          break;
        case "SCHEDULED":
        default:
          color = "#3b82f6"; // blue
      }

      if (isSelected) {
        color = "#2563eb";
      }

      const polyline = L.polyline(route.pathCoordinates, {
        color,
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray,
      });

      polyline.bindTooltip(
        `<div class="font-mono text-xs">
          <strong>${route.flight.flight_number}</strong> (${route.flight.airline})<br/>
          ${route.originAirport.iata_code} → ${route.destinationAirport.iata_code} • ${route.flight.status}
        </div>`,
        { sticky: true }
      );

      polyline.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectFlight(route);
      });

      polyline.addTo(layer);
    });
  }, [routes, selectedEntity, onSelectFlight]);

  // 3. Render Aircraft Position Markers Layer
  useEffect(() => {
    const layer = aircraftLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    routes.forEach((route) => {
      const isSelected =
        selectedEntity?.type === "flight" &&
        selectedEntity.data.flight.id === route.flight.id;

      let colorStyle = "text-blue-600";
      if (route.flight.status === "IN_AIR") colorStyle = "text-emerald-600";
      if (route.flight.status === "DELAYED") colorStyle = "text-amber-600";
      if (route.flight.status === "CANCELLED") colorStyle = "text-rose-600";

      const icon = L.divIcon({
        className: "aircraft-marker-container",
        html: `<div style="transform: rotate(${route.bearing}deg); font-size: ${
          isSelected ? "20px" : "16px"
        }; line-height: 1; text-shadow: 0 0 3px rgba(255,255,255,0.9);" class="${colorStyle} font-bold transition-transform cursor-pointer select-none">
          ✈
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker(route.currentPosition, { icon });

      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <strong>✈ ${route.flight.flight_number}</strong><br/>
          Status: ${route.flight.status}<br/>
          Heading: ${Math.round(route.bearing)}°
        </div>`,
        { direction: "top", offset: [0, -10] }
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectFlight(route);
      });

      marker.addTo(layer);
    });
  }, [routes, selectedEntity, onSelectFlight]);

  // 4. Render Airport Node Markers Layer
  useEffect(() => {
    const layer = airportsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    airports.forEach((airport) => {
      const isSelected =
        selectedEntity?.type === "airport" &&
        selectedEntity.data.id === airport.id;

      const icon = L.divIcon({
        className: "airport-marker-container",
        html: `<div class="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 border ${
          isSelected
            ? "border-blue-600 ring-2 ring-blue-400"
            : "border-zinc-300 dark:border-zinc-700 hover:border-blue-500"
        } rounded-full px-1.5 py-0.5 shadow-sm text-[10px] font-mono font-bold text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer select-none">
          <span class="w-2 h-2 rounded-full ${
            isSelected ? "bg-blue-600 animate-ping" : "bg-blue-600"
          }"></span>
          ${airport.iata_code}
        </div>`,
        iconSize: [52, 22],
        iconAnchor: [26, 11],
      });

      const marker = L.marker([airport.latitude, airport.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : 500,
      });

      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <strong>${airport.name} (${airport.iata_code}/${airport.icao_code})</strong><br/>
          ${airport.city}, ${airport.country}<br/>
          Lat: ${airport.latitude.toFixed(3)}°, Lon: ${airport.longitude.toFixed(3)}°
        </div>`,
        { direction: "top", offset: [0, -12] }
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectAirport(airport);
      });

      marker.addTo(layer);
    });
  }, [airports, selectedEntity, onSelectAirport]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
