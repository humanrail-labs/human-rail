import type { Metadata } from "next";
import NewAgentWizardPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Deploy Agent",
};

export default function NewAgentWizardPage() {
  return <NewAgentWizardPageClient />;
}
