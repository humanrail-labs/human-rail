import type { Metadata } from "next";
import AgentProfilePageClient from "./page-client";

export const metadata: Metadata = {
  title: "Agent Profile",
};

export const dynamic = "force-dynamic";

export default function AgentProfilePage() {
  return <AgentProfilePageClient />;
}
