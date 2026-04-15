import type { Metadata } from "next";
import LandingPageClient from "./page-client";

export const metadata: Metadata = {
  title: { absolute: "Agent Vault — AI Agents with Guardrails" },
  description: "Deploy, monitor, and control your AI agents on Solana. Set spending limits, define capabilities, and maintain full oversight — all on-chain.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
