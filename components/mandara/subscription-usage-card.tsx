"use client";

import type { SubscriptionSummary } from "@/lib/mandara-api/types";

export function SubscriptionUsageCard({ subscription }: { subscription: SubscriptionSummary | null }) {
  const used = subscription?.usage.agentChatMessages ?? 0;
  const limit = subscription?.limits.monthlyChatLimit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Plan usage</p>
          <p className="mt-1 text-xs text-neutral-500">
            {subscription ? `${subscription.plan} · ${subscription.status}` : "Loading plan..."}
          </p>
        </div>
        <span className="text-xs text-neutral-400">
          {used} / {limit || "-"}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-black/30">
        <div className="h-full bg-[#5EBDB0]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Solana-native subscription activation is planned for P13. No wallet charging is implemented in this phase.
      </p>
    </div>
  );
}
