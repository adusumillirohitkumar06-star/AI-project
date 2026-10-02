"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CapabilityBadge, GateStatusBadge } from "./GateStatusBadge";
import { getGateAssignments } from "@/lib/api/gates";
import { Airport } from "@/types/flight";
import { Gate, GateAssignmentInfo, Terminal } from "@/types/gate";

export interface GateDetailModalProps {
  gate: Gate | null;
  terminals: Map<number, Terminal>;
  airports: Map<number, Airport>;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (gate: Gate) => void;
}

export function GateDetailModal({
  gate,
  terminals,
  airports,
  isOpen,
  onClose,
  onEdit,
}: GateDetailModalProps) {
  const [assignments, setAssignments] = useState<GateAssignmentInfo[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (gate && isOpen) {
      setLoadingAssignments(true);
      getGateAssignments(gate.id)
        .then((res) => {
          setAssignments(res.items || []);
        })
        .catch(() => {
          setAssignments([]);
        })
        .finally(() => {
          setLoadingAssignments(false);
        });
    } else {
      setAssignments([]);
    }
  }, [gate, isOpen]);

  if (!gate) return null;

  const terminal = terminals.get(gate.terminal_id);
  const airport = terminal ? airports.get(terminal.airport_id) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Gate ${gate.gate_code}`}
      description={`${airport?.name || "Airport"} • ${terminal?.name || `Terminal #${gate.terminal_id}`}`}
      maxWidth="lg"
    >
      <div className="space-y-6 text-xs">
        {/* Status and Capability Ribbon */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono mb-1">
              Gate Status & Availability
            </div>
            <GateStatusBadge isActive={gate.is_active} isClosed={gate.is_closed} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono mb-1 text-right">
              Flight Capability
            </div>
            <CapabilityBadge capability={gate.capability} />
          </div>
        </div>

        {/* Airport and Terminal Hierarchy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Airport Facility
            </div>
            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {airport ? `${airport.name} (${airport.iata_code})` : "Unassigned Airport"}
            </div>
            <div className="text-[11px] text-zinc-400">
              {airport ? `${airport.city}, ${airport.country} • Timezone: ${airport.timezone}` : ""}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Terminal Building
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {terminal?.name || `Terminal #${gate.terminal_id}`}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Code: {terminal?.terminal_code || "N/A"}
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500">
            Apron & Aircraft Specifications
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-zinc-400 text-[11px]">Gate Type:</span>
              <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {gate.gate_type}
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px]">Max Aircraft Size:</span>
              <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {gate.max_aircraft_size}
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px]">Operational Status:</span>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {gate.is_active ? "Active in CSP" : "Deactivated"}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-zinc-400 text-[11px]">Supported Aircraft Categories:</span>
            <div className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
              {gate.supported_aircraft_types}
            </div>
          </div>

          {gate.is_closed && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
              <span className="font-semibold">Closure Reason: </span>
              <span>{gate.closure_reason || "Maintenance / Operational restriction"}</span>
            </div>
          )}
        </div>

        {/* Factual Gate Occupancy (from backend assignments) */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2">
          <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500">
            Factual Gate Occupancy
          </div>
          {loadingAssignments ? (
            <div className="text-zinc-400 text-[11px] italic">Checking assignment telemetry...</div>
          ) : assignments.length === 0 ? (
            <div className="text-zinc-400 text-[11px] italic">
              No active flight assignments recorded at this gate.
            </div>
          ) : (
            <div className="space-y-1.5">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-mono"
                >
                  <div>
                    Flight #{asg.flight_id} &bull; {asg.status}
                  </div>
                  <div className="text-zinc-400">
                    {new Date(asg.assignment_start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" \u2192 "}
                    {new Date(asg.assignment_end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(gate);
            }}
          >
            Edit Gate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
