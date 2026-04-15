import { redirect } from "next/navigation";

export default function DashboardDelegationRedirect() {
  redirect("/vault/capabilities");
}
