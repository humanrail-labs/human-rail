import type { Metadata } from "next";
import DelegationPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Capabilities",
};

export default function CapabilitiesPage() {
  return <DelegationPageClient />;
}
