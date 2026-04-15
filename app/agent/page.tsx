import type { Metadata } from "next";
import AgentDashboardPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Agent Dashboard",
};

export default function AgentDashboardPage() {
  return <AgentDashboardPageClient />;
}
