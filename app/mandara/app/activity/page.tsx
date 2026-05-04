"use client";

import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle } from "lucide-react";

const eventTypeHuman: Record<string, string> = {
  agent_created: "Agent created",
  ika_dwallet_imported: "Wallet imported",
  policy_created: "Mandate created",
  signing_request_created: "Signature request created",
  signing_request_enqueued: "Request queued",
  signing_request_executed: "Request executed",
  api_key_created: "API key created",
  api_key_revoked: "API key revoked",
  webhook_created: "Webhook created",
  webhook_deleted: "Webhook deleted",
  organization_created: "Organization created",
};

export default function ActivityPage() {
  const { auditEvents, loading, error, apiAvailable, refresh } = useMandaraProduct();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading activity…
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
        <h2 className="text-lg font-semibold text-white">Activity Log</h2>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {auditEvents.length === 0 ? (
        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardContent className="py-8 text-center text-sm text-neutral-500">
            No activity yet. Complete the{" "}
            <a href="/mandara/app/onboarding" className="text-sky-400 hover:underline">
              onboarding
            </a>{" "}
            to generate events.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {auditEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-sm text-neutral-300">
                    {ev.summary ?? eventTypeHuman[ev.eventType] ?? ev.eventType}
                  </p>
                  {ev.resourceType && (
                    <p className="text-[11px] text-neutral-500">
                      {ev.resourceType}
                      {ev.resourceId ? ` · ${ev.resourceId.slice(0, 8)}…` : ""}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-neutral-500">
                {new Date(ev.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
