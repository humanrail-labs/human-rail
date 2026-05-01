import { Metadata } from "next";
import DwalletGuardPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Guarded dWallets",
};

export default function DwalletGuardPage() {
  return <DwalletGuardPageClient />;
}
