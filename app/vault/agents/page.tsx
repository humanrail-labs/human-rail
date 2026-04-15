import type { Metadata } from "next";
import AgentsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "My Agents",
};

export default function AgentsPage() {
  return <AgentsPageClient />;
}
