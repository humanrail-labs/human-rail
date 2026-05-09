import AgentChat from "@/components/mandara/agent-chat";
import { Suspense } from "react";

export default function AgentChatPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-neutral-400">Loading Agent Chat...</div>}>
      <AgentChat />
    </Suspense>
  );
}
