import FlightsManager from "@/components/flights/FlightsManager";

export const metadata = {
  title: "Flight Operations | AI Airport Control",
  description: "Monitor and manage airport flight schedules, arrivals, departures, and turnaround operations.",
};

export default function FlightsPage() {
  return <FlightsManager />;
}
