import type { Metadata } from "next";
import HumanProfilePageClient from "./page-client";

export const metadata: Metadata = {
  title: "Human Profile",
};

export const dynamic = "force-dynamic";

export default function HumanProfilePage() {
  return <HumanProfilePageClient />;
}
