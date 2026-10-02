"use client";

import React, { useState } from "react";

export function MapLegend() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-md text-xs font-mono overflow-hidden transition-all">
      <div
        className="px-3 py-1.5 flex items-center justify-between cursor-pointer select-none bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Map Legend
        </span>
        <button
          type="button"
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs px-1"
          aria-label={isCollapsed ? "Expand legend" : "Collapse legend"}
        >
          {isCollapsed ? "▲" : "▼"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-2 text-[11px]">
          {/* Node Types */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white dark:border-zinc-900 shadow-xs inline-block shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300">Airport Hub (IATA)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm shrink-0">✈</span>
            <span className="text-zinc-700 dark:text-zinc-300">En Route / In Air</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-sm shrink-0">✈</span>
            <span className="text-zinc-700 dark:text-zinc-300">Scheduled Flight</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-sm shrink-0">✈</span>
            <span className="text-zinc-700 dark:text-zinc-300">Delayed Flight</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-rose-500 font-bold text-sm shrink-0">✈</span>
            <span className="text-zinc-700 dark:text-zinc-300">Cancelled / Diverted</span>
          </div>

          <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <span className="w-5 h-0.5 bg-blue-500 inline-block shrink-0" />
            <span className="text-zinc-500 text-[10px]">Great-Circle Geodesic Route</span>
          </div>
        </div>
      )}
    </div>
  );
}
