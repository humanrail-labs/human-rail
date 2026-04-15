import type { Metadata } from "next";
import VaultHomePageClient from "./page-client";

export const metadata: Metadata = {
  title: "Home",
};

export default function VaultHomePage() {
  return <VaultHomePageClient />;
}
