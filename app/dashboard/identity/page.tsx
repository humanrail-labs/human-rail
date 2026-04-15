import { redirect } from "next/navigation";

export default function DashboardIdentityRedirect() {
  redirect("/vault/identity");
}
