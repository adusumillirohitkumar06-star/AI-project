import GatesManager from "@/components/gates/GatesManager";

export const metadata = {
  title: "Gate Management | AI Airport Control",
  description: "Monitor and configure airport apron gates, terminal jet bridges, aircraft compatibility, and availability.",
};

export default function GatesPage() {
  return <GatesManager />;
}
