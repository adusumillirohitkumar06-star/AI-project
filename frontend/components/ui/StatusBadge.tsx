import React from "react";
import { Badge } from "./Badge";

export type FlightStatusType =
  | "SCHEDULED"
  | "BOARDING"
  | "IN_AIR"
  | "APPROACHING"
  | "LANDED"
  | "AT_GATE"
  | "DELAYED"
  | "CANCELLED"
  | "COMPLETED";

export type FlightPriorityType = "NORMAL" | "VIP" | "MEDICAL" | "EMERGENCY";

interface StatusBadgeProps {
  status: FlightStatusType | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "SCHEDULED":
      return (
        <Badge variant="default" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5 inline-block" />
          Scheduled
        </Badge>
      );
    case "BOARDING":
      return (
        <Badge variant="info" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 inline-block animate-pulse" />
          Boarding
        </Badge>
      );
    case "IN_AIR":
      return (
        <Badge variant="info" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 inline-block" />
          In Air
        </Badge>
      );
    case "APPROACHING":
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 inline-block animate-pulse" />
          Approaching
        </Badge>
      );
    case "LANDED":
      return (
        <Badge variant="success" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
          Landed
        </Badge>
      );
    case "AT_GATE":
      return (
        <Badge variant="success" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 inline-block" />
          At Gate
        </Badge>
      );
    case "DELAYED":
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5 inline-block" />
          Delayed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="danger" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 inline-block" />
          Cancelled
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="secondary" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mr-1.5 inline-block" />
          Completed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}

interface PriorityBadgeProps {
  priority: FlightPriorityType | string;
  className?: string;
}

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const normalized = priority.toUpperCase();

  switch (normalized) {
    case "NORMAL":
      return (
        <Badge variant="outline" className={className}>
          Normal
        </Badge>
      );
    case "VIP":
      return (
        <Badge variant="info" className={className}>
          VIP
        </Badge>
      );
    case "MEDICAL":
      return (
        <Badge variant="warning" className={className}>
          Medical Priority
        </Badge>
      );
    case "EMERGENCY":
      return (
        <Badge variant="danger" className={className}>
          EMERGENCY
        </Badge>
      );
    default:
      return (
        <Badge variant="default" className={className}>
          {priority}
        </Badge>
      );
  }
}
