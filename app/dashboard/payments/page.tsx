import { redirect } from "next/navigation";

export default function DashboardPaymentsRedirect() {
  redirect("/vault/payments");
}
