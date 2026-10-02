"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "./navigationConfig";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Operations Navigation"
      >
        {/* Brand / Title Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800/80 bg-zinc-950/40">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group"
            onClick={onClose}
          >
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-xs group-hover:bg-blue-500 transition-colors">
              OPS
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">
                Airport Control
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                AI GATE SIMULATOR
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onClose}
            aria-label="Close navigation"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
          {navigationConfig.map((section, idx) => (
            <div key={section.title || idx}>
              {section.title && (
                <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase font-mono">
                  {section.title}
                </div>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" &&
                      item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs font-semibold"
                            : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isActive
                                ? "bg-blue-700 text-blue-100"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Meta / System Version */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/30 text-[11px] text-zinc-400 flex items-center justify-between">
          <span className="font-mono">CSP v3.0 / API v1</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono">
            Phase 5
          </span>
        </div>
      </aside>
    </>
  );
}
