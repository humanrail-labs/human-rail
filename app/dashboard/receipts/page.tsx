import { redirect } from "next/navigation";

export default function DashboardReceiptsRedirect() {
  redirect("/vault/activity");
}
