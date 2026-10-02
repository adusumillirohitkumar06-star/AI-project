"use client";

import React from "react";
import { CapabilityBadge, GateStatusBadge } from "./GateStatusBadge";
import { Button } from "@/components/ui/Button";
import { Airport } from "@/types/flight";
import { Gate, Terminal } from "@/types/gate";

export interface GateTableProps {
  gates: Gate[];
  terminals: Map<number, Terminal>;
  airports: Map<number, Airport>;
  onView: (gate: Gate) => void;
  onEdit: (gate: Gate) => void;
  onDelete: (gate: Gate) => void;
  onToggleClosure: (gate: Gate) => void;
}

export function GateTable({
  gates,
  terminals,
  airports,
  onView,
  onEdit,
  onDelete,
  onToggleClosure,
}: GateTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-mono">
          <tr>
            <th scope="col" className="px-4 py-3.5">
              Gate
            </th>
            <th scope="col" className="px-4 py-3.5">
              Airport & Terminal
            </th>
            <th scope="col" className="px-4 py-3.5">
              Type
            </th>
            <th scope="col" className="px-4 py-3.5">
              Capability
            </th>
            <th scope="col" className="px-4 py-3.5">
              Aircraft Compatibility
            </th>
            <th scope="col" className="px-4 py-3.5">
              Status & Availability
            </th>
            <th scope="col" className="px-4 py-3.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
          {gates.map((gate) => {
            const terminal = terminals.get(gate.terminal_id);
            const airport = terminal ? airports.get(terminal.airport_id) : null;

            return (
              <tr
                key={gate.id}
                className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {/* Gate Code */}
                <td className="px-4 py-3">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                    {gate.gate_code}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    ID #{gate.id}
                  </div>
                </td>

                {/* Airport & Terminal */}
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {airport?.iata_code ? (
                      <span className="font-mono font-bold mr-1.5">{airport.iata_code}</span>
                    ) : null}
                    <span>{terminal?.name || `Terminal #${gate.terminal_id}`}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {airport?.name || "Unknown Airport"}
                  </div>
                </td>

                {/* Gate Type */}
                <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                  {gate.gate_type}
                </td>

                {/* Capability */}
                <td className="px-4 py-3">
                  <CapabilityBadge capability={gate.capability} />
                </td>

                {/* Aircraft Compatibility */}
                <td className="px-4 py-3">
                  <div className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                    Max: <span className="font-bold">{gate.max_aircraft_size}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate max-w-[180px]" title={gate.supported_aircraft_types}>
                    {gate.supported_aircraft_types}
                  </div>
                </td>

                {/* Status & Availability */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <GateStatusBadge
                      isActive={gate.is_active}
                      isClosed={gate.is_closed}
                    />
                    {gate.is_closed && gate.closure_reason && (
                      <span
                        className="text-[10px] text-rose-600 dark:text-rose-400 truncate max-w-[140px]"
                        title={gate.closure_reason}
                      >
                        {gate.closure_reason}
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(gate)}
                      aria-label={`View gate ${gate.gate_code}`}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleClosure(gate)}
                      aria-label={gate.is_closed ? "Reopen gate" : "Close gate"}
                      className={gate.is_closed ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"}
                    >
                      {gate.is_closed ? "Reopen" : "Close"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(gate)}
                      aria-label={`Edit gate ${gate.gate_code}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(gate)}
                      aria-label={`Delete gate ${gate.gate_code}`}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
