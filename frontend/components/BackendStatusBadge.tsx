"use client";

import { useBackendHealth } from "@/hooks/useBackendHealth";

export function BackendStatusBadge() {
  const { data, loading, error, refetch } = useBackendHealth();

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            loading
              ? "bg-amber-400 animate-pulse"
              : data?.status === "ok"
              ? "bg-emerald-500"
              : "bg-rose-500"
          }`}
        />
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          FastAPI Backend:
        </span>
      </div>

      <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
        {loading && "Checking connection..."}
        {!loading && data && (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            Online ({data.service} - {data.environment})
          </span>
        )}
        {!loading && error && (
          <span className="text-rose-600 dark:text-rose-400">
            Offline ({error})
          </span>
        )}
      </div>

      <button
        onClick={refetch}
        type="button"
        className="ml-auto text-xs px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
      >
        Retry
      </button>
    </div>
  );
}
