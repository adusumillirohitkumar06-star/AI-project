"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { GateCapability } from "@/types/gate";

interface GateStatusBadgeProps {
  isActive: boolean;
  isClosed: boolean;
  className?: string;
}

export function GateStatusBadge({
  isActive,
  isClosed,
  className = "",
}: GateStatusBadgeProps) {
  if (!isActive) {
    return (
      <Badge variant="secondary" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5 inline-block" />
        Inactive
      </Badge>
    );
  }

  if (isClosed) {
    return (
      <Badge variant="danger" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 inline-block" />
        Closed
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
      Available
    </Badge>
  );
}

interface CapabilityBadgeProps {
  capability: GateCapability | string;
  className?: string;
}

export function CapabilityBadge({
  capability,
  className = "",
}: CapabilityBadgeProps) {
  const norm = capability.toUpperCase();
  switch (norm) {
    case "DOMESTIC":
      return (
        <Badge variant="outline" className={className}>
          Domestic
        </Badge>
      );
    case "INTERNATIONAL":
      return (
        <Badge variant="info" className={className}>
          International
        </Badge>
      );
    case "BOTH":
      return (
        <Badge variant="default" className={className}>
          Domestic & Int&apos;l
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {capability}
        </Badge>
      );
  }
}
