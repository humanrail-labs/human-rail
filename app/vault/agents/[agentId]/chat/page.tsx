import { Metadata } from "next";
import AgentChatPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Agent Chat | HumanRail",
};

export default function AgentChatPage() {
  return <AgentChatPageClient />;
}
