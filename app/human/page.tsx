import type { Metadata } from "next";
import HumanDashboardPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Human Dashboard",
};

export default function HumanDashboardPage() {
  return <HumanDashboardPageClient />;
}
