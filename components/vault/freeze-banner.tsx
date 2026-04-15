"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useAgents } from "@/lib/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Snowflake, AlertTriangle } from "lucide-react";

export function FreezeBanner() {
  const { capabilities } = useCapabilities();
  const { agents } = useAgents();

  const frozenAgents = useMemo(() => {
    const frozenCaps = capabilities.filter((c) => c.isFrozen);
    const map = new Map<string, string>();
    for (const cap of frozenCaps) {
      const agent = agents.find((a) => a.pda.equals(cap.agent));
      if (agent && !map.has(agent.pda.toBase58())) {
        map.set(agent.pda.toBase58(), agent.name || "Unnamed Agent");
      }
    }
    return Array.from(map.entries()).map(([pda, name]) => ({ pda, name }));
  }, [capabilities, agents]);

  if (frozenAgents.length === 0) return null;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            {frozenAgents.length === 1 ? (
              <>
                Agent <span className="font-semibold text-white">"{frozenAgents[0].name}"</span> is frozen. All capabilities are suspended.
              </>
            ) : (
              <>
                <span className="font-semibold text-white">{frozenAgents.length} agents</span> are frozen. All capabilities are suspended.
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {frozenAgents.slice(0, 3).map((a) => (
            <Link key={a.pda} href={`/vault/agents/${a.pda}`}>
              <Button size="sm" variant="outline" className="h-7 border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 hover:bg-amber-500/20">
                <Snowflake className="mr-1 h-3 w-3" /> Review {frozenAgents.length > 1 ? `"${a.name}"` : ""}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
