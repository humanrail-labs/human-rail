import { redirect } from "next/navigation";

export default function DashboardAgentsRedirect() {
  redirect("/vault/agents");
}
