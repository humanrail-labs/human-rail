import type { Metadata } from "next";
import ReceiptsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Activity Log",
};

export default function ActivityPage() {
  return <ReceiptsPageClient />;
}
