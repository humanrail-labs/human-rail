import type { Metadata } from "next";
import MandaraLandingPage from "@/components/mandara/landing-page";

export const metadata: Metadata = {
  title: "Mandara — Policy-Governed AI Agent Wallets",
  description:
    "Give AI agents signing power without giving them unlimited wallet control. Mandara is a devnet beta control plane for policy-governed AI agent wallets.",
};

export default function MandaraPage() {
  return <MandaraLandingPage />;
}
