"use client";

import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Bot, AlertTriangle } from "lucide-react";

export default function AgentsPage() {
  const { agents, loading, error, apiAvailable, refresh } = useMandaraProduct();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading agents…
      </div>
    );
  }

  if (error && !apiAvailable) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">Mandara API unavailable</p>
            <p className="text-xs text-amber-200/70">{error}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Agents</h2>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardContent className="py-8 text-center text-sm text-neutral-500">
            No agents yet. Create one in the{" "}
            <a href="/mandara/app/onboarding" className="text-sky-400 hover:underline">
              onboarding wizard
            </a>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="border-white/[0.06] bg-white/[0.03]">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-sky-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{agent.name}</p>
                    {agent.description && (
                      <p className="text-xs text-neutral-500">{agent.description}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    agent.status === "active"
                      ? "border-emerald-500/30 text-emerald-300"
                      : "border-amber-500/30 text-amber-300"
                  }
                >
                  {agent.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
