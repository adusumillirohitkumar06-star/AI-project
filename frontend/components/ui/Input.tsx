"use client";

import React, { useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id: explicitId,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-md border text-xs px-3 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${
          error
            ? "border-rose-500 focus-visible:ring-rose-500"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({
  label,
  error,
  hint,
  id: explicitId,
  className = "",
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full rounded-md border text-xs px-3 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${
          error
            ? "border-rose-500 focus-visible:ring-rose-500"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
