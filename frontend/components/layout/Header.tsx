"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { data, loading, error, refetch } = useBackendHealth();
  const { user, logout } = useAuth();

  // Compute a readable title from pathname
  const getPageTitle = (path: string) => {
    if (path === "/" || path === "/dashboard") return "Operations Control Dashboard";
    const segment = path.replace(/^\//, "").split("/")[0];
    switch (segment) {
      case "flights":
        return "Flight Operations";
      case "gates":
        return "Gate Allocation & Status";
      case "airports":
        return "Airport Terminals & Infrastructure";
      case "scheduler":
        return "AI Constraint Satisfaction Scheduler";
      case "schedule":
        return "Gantt Timeline Schedule";
      case "map":
        return "Airspace & Apron Surface Map";
      case "simulation":
        return "Real-time Operations Simulation";
      case "reasoning":
        return "Explainable AI (XAI) Reasoning Inspector";
      case "conflicts":
        return "Conflict Diagnostics & Resolution";
      case "analytics":
        return "Performance Metrics & Analytics";
      case "settings":
        return "System Settings & Configuration";
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Page Title & Context */}
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {getPageTitle(pathname)}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span>Terminal Control</span>
            <span>&bull;</span>
            <span>Automated Gate Allocation</span>
          </div>
        </div>
      </div>

      {/* Right controls: Real backend health status & System actions */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status Indicator */}
        <div
          onClick={() => refetch()}
          title="Click to re-verify backend connectivity"
          className="cursor-pointer group flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-mono transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              <span className="text-[11px]">Connecting...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold">Backend Offline</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold">Backend Online ({data?.service || "API"})</span>
            </div>
          )}
        </div>

        {/* Docs Link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          API Docs
        </a>

        {/* User Menu */}
        {user && (
          <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium">{user.name}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
