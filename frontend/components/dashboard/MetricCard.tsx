import React from "react";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export interface MetricCardProps {
  title: string;
  value?: string | number | null;
  description?: string;
  icon?: React.ReactNode;
  statusText?: string;
  statusVariant?: "neutral" | "success" | "warning" | "danger" | "info";
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  statusText,
  statusVariant = "neutral",
  isLoading = false,
  isEmpty = false,
  emptyText = "No data available",
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-40" />
      </Card>
    );
  }

  const statusVariantStyles = {
    neutral: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
    success:
      "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
    warning:
      "text-amber-700 bg-amber-50 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
    danger:
      "text-rose-700 bg-rose-50 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60",
    info: "text-sky-700 bg-sky-50 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60",
  };

  return (
    <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
          {icon && (
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300">
              {icon}
            </div>
          )}
        </div>

        {isEmpty || value === undefined || value === null ? (
          <div className="my-2">
            <span className="text-sm italic text-zinc-400 dark:text-zinc-500">
              {emptyText}
            </span>
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 my-1 font-mono">
            {value}
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs">
        {description && (
          <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[70%]">
            {description}
          </span>
        )}
        {statusText && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ml-auto ${statusVariantStyles[statusVariant]}`}
          >
            {statusText}
          </span>
        )}
      </div>
    </Card>
  );
}
