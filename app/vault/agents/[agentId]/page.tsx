import type { Metadata } from "next";
import AgentDetailPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Agent Details",
};

export const dynamic = "force-dynamic";

export default function AgentDetailPage() {
  return <AgentDetailPageClient />;
}
