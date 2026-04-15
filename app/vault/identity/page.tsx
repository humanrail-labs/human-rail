import type { Metadata } from "next";
import IdentityPageClient from "./page-client";

export const metadata: Metadata = {
  title: "My Identity",
};

export default function IdentityPage() {
  return <IdentityPageClient />;
}
