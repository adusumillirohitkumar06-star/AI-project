"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Airport } from "@/types/flight";
import { Gate, GateCapability, GateCreatePayload, Terminal } from "@/types/gate";

export interface GateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: GateCreatePayload) => Promise<void>;
  gate?: Gate | null;
  airports: Airport[];
  terminals: Terminal[];
  onAirportSelect?: (airportId: number) => void;
}

export function GateFormModal({
  isOpen,
  onClose,
  onSubmit,
  gate,
  airports,
  terminals,
  onAirportSelect,
}: GateFormModalProps) {
  const isEditing = Boolean(gate);

  const [gateCode, setGateCode] = useState("");
  const [selectedAirportId, setSelectedAirportId] = useState<number | "">("");
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | "">("");
  const [gateType, setGateType] = useState("JET_BRIDGE");
  const [capability, setCapability] = useState<GateCapability>("BOTH");
  const [maxAircraftSize, setMaxAircraftSize] = useState("WIDE_BODY");
  const [supportedAircraftTypes, setSupportedAircraftTypes] = useState(
    "REGIONAL,NARROW_BODY,WIDE_BODY"
  );
  const [isActive, setIsActive] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [closureReason, setClosureReason] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filter terminals based on selected airport
  const availableTerminals = terminals.filter((t) =>
    selectedAirportId ? t.airport_id === Number(selectedAirportId) : true
  );

  useEffect(() => {
    if (gate) {
      setGateCode(gate.gate_code);
      setSelectedTerminalId(gate.terminal_id);
      const parentTerminal = terminals.find((t) => t.id === gate.terminal_id);
      if (parentTerminal) {
        setSelectedAirportId(parentTerminal.airport_id);
      }
      setGateType(gate.gate_type || "JET_BRIDGE");
      setCapability(gate.capability || "BOTH");
      setMaxAircraftSize(gate.max_aircraft_size || "WIDE_BODY");
      setSupportedAircraftTypes(gate.supported_aircraft_types || "REGIONAL,NARROW_BODY,WIDE_BODY");
      setIsActive(gate.is_active);
      setIsClosed(gate.is_closed);
      setClosureReason(gate.closure_reason || "");
    } else {
      setGateCode("");
      const initialAirport = airports[0]?.id || "";
      setSelectedAirportId(initialAirport);
      const initialTerm = terminals.find((t) => initialAirport && t.airport_id === Number(initialAirport));
      setSelectedTerminalId(initialTerm?.id || terminals[0]?.id || "");
      setGateType("JET_BRIDGE");
      setCapability("BOTH");
      setMaxAircraftSize("WIDE_BODY");
      setSupportedAircraftTypes("REGIONAL,NARROW_BODY,WIDE_BODY");
      setIsActive(true);
      setIsClosed(false);
      setClosureReason("");
    }
    setErrors({});
    setApiError(null);
  }, [gate, isOpen, airports, terminals]);

  const handleAirportChange = (airportId: number) => {
    setSelectedAirportId(airportId);
    if (onAirportSelect) {
      onAirportSelect(airportId);
    }
    const matchingTerms = terminals.filter((t) => t.airport_id === airportId);
    if (matchingTerms.length > 0) {
      setSelectedTerminalId(matchingTerms[0].id);
    } else {
      setSelectedTerminalId("");
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!gateCode.trim()) {
      errs.gateCode = "Gate code is required (e.g. A1, B22).";
    }
    if (!selectedTerminalId) {
      errs.selectedTerminalId = "A parent terminal must be selected.";
    }
    if (isClosed && !closureReason.trim()) {
      errs.closureReason = "Please specify a closure reason (e.g. Maintenance, Construction).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload: GateCreatePayload = {
        terminal_id: Number(selectedTerminalId),
        gate_code: gateCode.trim().toUpperCase(),
        gate_type: gateType,
        capability: capability,
        max_aircraft_size: maxAircraftSize,
        supported_aircraft_types: supportedAircraftTypes.trim(),
        is_active: isActive,
        is_closed: isClosed,
        closure_reason: isClosed ? closureReason.trim() : null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save gate.";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Gate ${gate?.gate_code}` : "Add New Apron Gate"}
      description="Configure terminal gate capacity, capability, aircraft compatibility, and operational status."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {apiError}
          </div>
        )}

        {/* Gate Code and Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Gate Code *"
            placeholder="e.g. A1, B12, G04"
            value={gateCode}
            onChange={(e) => setGateCode(e.target.value)}
            error={errors.gateCode}
            disabled={isSubmitting}
            required
          />

          <Select
            label="Gate Type"
            value={gateType}
            onChange={(e) => setGateType(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="JET_BRIDGE">Jet Bridge (Airbridge)</option>
            <option value="REMOTE_STAND">Remote Apron Stand</option>
            <option value="TARMAC">Tarmac Walk-on</option>
          </Select>
        </div>

        {/* Airport & Terminal Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Airport Facility *"
            value={selectedAirportId}
            onChange={(e) => handleAirportChange(Number(e.target.value))}
            disabled={isSubmitting || airports.length === 0}
            required
          >
            {airports.length === 0 && <option value="">No airports available</option>}
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata_code} - {a.name} ({a.city})
              </option>
            ))}
          </Select>

          <Select
            label="Terminal Building *"
            value={selectedTerminalId}
            onChange={(e) => setSelectedTerminalId(Number(e.target.value))}
            error={errors.selectedTerminalId}
            disabled={isSubmitting || availableTerminals.length === 0}
            required
          >
            {availableTerminals.length === 0 && (
              <option value="">No terminals found for this airport</option>
            )}
            {availableTerminals.map((t) => (
              <option key={t.id} value={t.id}>
                {t.terminal_code} - {t.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Capability & Aircraft Compatibility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Flight Capability"
            value={capability}
            onChange={(e) => setCapability(e.target.value as GateCapability)}
            disabled={isSubmitting}
          >
            <option value="BOTH">Domestic & International (Both)</option>
            <option value="DOMESTIC">Domestic Only</option>
            <option value="INTERNATIONAL">International Only</option>
          </Select>

          <Select
            label="Maximum Aircraft Category"
            value={maxAircraftSize}
            onChange={(e) => setMaxAircraftSize(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="REGIONAL">Regional (e.g. ATR, CRJ, E190)</option>
            <option value="NARROW_BODY">Narrow Body (e.g. A320, B737)</option>
            <option value="WIDE_BODY">Wide Body (e.g. B777, A350, B787)</option>
            <option value="HEAVY">Heavy / Super (e.g. A380, B747-8)</option>
          </Select>
        </div>

        {/* Supported Aircraft Types String */}
        <Input
          label="Supported Aircraft Types"
          placeholder="e.g. REGIONAL,NARROW_BODY,WIDE_BODY"
          value={supportedAircraftTypes}
          onChange={(e) => setSupportedAircraftTypes(e.target.value)}
          hint="Comma-separated categories evaluated by the CSP AI solver"
          disabled={isSubmitting}
        />

        {/* Active & Closed Operational Status */}
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                Active in System
              </span>
              <p className="text-[11px] text-zinc-500">
                Whether the gate is recognized for operational routing and CSP planning
              </p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                Mark as Closed / Unavailable
              </span>
              <p className="text-[11px] text-zinc-500">
                Temporarily remove this gate from active scheduling domains
              </p>
            </div>
            <input
              type="checkbox"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
          </div>

          {isClosed && (
            <Input
              label="Closure Reason *"
              placeholder="e.g. Scheduled apron resurfacing, Jet bridge mechanical fault"
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              error={errors.closureReason}
              disabled={isSubmitting}
              required
            />
          )}
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isEditing ? "Save Changes" : "Create Gate"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
