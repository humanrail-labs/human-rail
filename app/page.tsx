import type { Metadata } from "next";
import MandaraLandingPage from "@/components/mandara/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Mandara by HumanRail — Policy-Governed AI Agent Wallets" },
  description:
    "Give AI agents signing power without giving them unlimited wallet control. Mandara is a devnet beta control plane powered by HumanRail guardrails and Ika dWallet signing.",
};

export default function LandingPage() {
  return <MandaraLandingPage />;
}
