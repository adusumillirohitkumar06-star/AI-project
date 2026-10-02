export interface NavItem {
  name: string;
  href: string;
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Operations",
    items: [
      { name: "Flights", href: "/flights" },
      { name: "Gates", href: "/gates" },
      { name: "Airports", href: "/airports" },
    ],
  },
  {
    title: "AI Scheduler",
    items: [
      { name: "Gantt Schedule", href: "/schedule" },
      { name: "AI Scheduler", href: "/scheduler" },
    ],
  },
  {
    title: "Simulation",
    items: [
      { name: "World Map", href: "/map" },
      { name: "Flight Simulation", href: "/simulation" },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      { name: "AI Reasoning", href: "/reasoning" },
      { name: "Conflicts", href: "/conflicts" },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Analytics", href: "/analytics" },
      { name: "Settings", href: "/settings" },
    ],
  },
];
