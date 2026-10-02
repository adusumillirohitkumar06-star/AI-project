"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SimulationSpeed } from "@/types/simulation";

export interface SimulationControlsProps {
  simTimeMs: number;
  startMs: number;
  endMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  speed: SimulationSpeed;
  onChangeSpeed: (speed: SimulationSpeed) => void;
  onSeek: (targetMs: number) => void;
}

const SPEED_OPTIONS: SimulationSpeed[] = [1, 2, 5, 10];

export function SimulationControls({
  simTimeMs,
  startMs,
  endMs,
  isPlaying,
  onTogglePlay,
  onReset,
  speed,
  onChangeSpeed,
  onSeek,
}: SimulationControlsProps) {
  const formatFullTime = (ms: number) => {
    try {
      const d = new Date(ms);
      return d.toUTCString().replace("GMT", "UTC");
    } catch {
      return "";
    }
  };

  const formatShortTime = (ms: number) => {
    try {
      const d = new Date(ms);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      });
    } catch {
      return "";
    }
  };

  const progressPercent =
    endMs > startMs
      ? Math.max(0, Math.min(100, ((simTimeMs - startMs) / (endMs - startMs)) * 100))
      : 0;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md p-4 space-y-4 font-mono">
      {/* 1. Header: Primary Simulation Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              Simulation Clock (UTC)
            </div>
            <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatFullTime(simTimeMs)}
            </div>
          </div>
        </div>

        {/* Play State Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPlaying
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
            />
            {isPlaying ? `RUNNING (${speed}×)` : "PAUSED"}
          </span>
        </div>
      </div>

      {/* 2. Control Actions & Speed Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Play/Pause & Reset Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? "secondary" : "primary"}
            size="md"
            onClick={onTogglePlay}
            className="w-28 font-semibold shadow-xs"
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
          >
            {isPlaying ? (
              <span className="flex items-center gap-1.5">
                <span>⏸</span> Pause
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>▶</span> Play
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={onReset}
            title="Reset simulation to initial departure time"
            aria-label="Reset simulation"
          >
            ↻ Reset
          </Button>
        </div>

        {/* Speed Selector Buttons */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold px-2">
            Speed:
          </span>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpeed(s)}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                speed === s
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200 dark:border-zinc-600"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* 3. Interactive Timeline Scrubber */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>Start: {formatShortTime(startMs)}</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {progressPercent.toFixed(1)}% complete
          </span>
          <span>End: {formatShortTime(endMs)}</span>
        </div>

        <input
          type="range"
          min={startMs}
          max={endMs}
          value={simTimeMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          aria-label="Simulation timeline scrubber"
        />
      </div>
    </div>
  );
}
