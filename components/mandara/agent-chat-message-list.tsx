"use client";

import type { AgentChatMessage } from "@/lib/mandara-api/types";
import { Bot, User, Wrench, ShieldAlert } from "lucide-react";

export function AgentChatMessageList({ messages }: { messages: AgentChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-sm text-neutral-500">
        Messages will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isTool = message.role === "tool";
        const isRefusal = message.scopeAllowed === false;
        const Icon = isUser ? User : isTool ? Wrench : isRefusal ? ShieldAlert : Bot;
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {!isUser && (
              <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isRefusal ? "bg-red-500/10 text-red-300" : "bg-[#3E877E]/20 text-[#8de7dc]"}`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-lg border px-3 py-2 text-sm leading-6 ${
                isUser
                  ? "border-[#5EBDB0]/20 bg-[#3E877E]/20 text-white"
                  : isRefusal
                  ? "border-red-500/15 bg-red-500/5 text-red-100/80"
                  : "border-white/[0.06] bg-white/[0.03] text-[#B2BDBA]"
              }`}
            >
              {message.content}
            </div>
            {isUser && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-300">
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
