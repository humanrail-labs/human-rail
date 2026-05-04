"use client";

import { useState } from "react";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileKey, AlertTriangle, Clock } from "lucide-react";

const statusHuman: Record<string, { label: string; color: string }> = {
  requested: { label: "Waiting", color: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  queued: { label: "Queued", color: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
  worker_processing: { label: "Processing", color: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  policy_rejected: { label: "Rejected by mandate", color: "bg-red-500/10 text-red-300 border-red-500/20" },
  guard_approved: { label: "Guard approved", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  ika_pending: { label: "Signing pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  signed: { label: "Signed", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-300 border-red-500/20" },
};

function truncate(str: string, len = 10) {
  if (!str || str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}…${str.slice(-len)}`;
}

export default function RequestsPage() {
  const {
    signingRequests,
    loading,
    error,
    apiAvailable,
    refresh,
    fetchExecution,
    startPollingExecution,
    stopPolling,
  } = useMandaraProduct();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [execution, setExecution] = useState<Awaited<ReturnType<typeof fetchExecution>> | null>(null);
  const [polling, setPolling] = useState(false);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setPolling(false);
    stopPolling();
    try {
      const ex = await fetchExecution(id);
      setExecution(ex);
    } catch {
      setExecution(null);
    }
  };

  const handlePoll = () => {
    if (!selectedId) return;
    setPolling(true);
    const cleanup = startPollingExecution(selectedId, (result) => {
      setExecution(result);
    });
    return () => {
      cleanup();
      setPolling(false);
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading requests…
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
        <h2 className="text-lg font-semibold text-white">Signature Requests</h2>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {signingRequests.length === 0 ? (
        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardContent className="py-8 text-center text-sm text-neutral-500">
            No signature requests yet. Create one in the{" "}
            <a href="/mandara/app/onboarding" className="text-sky-400 hover:underline">
              onboarding wizard
            </a>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signingRequests.map((sr) => {
            const human = statusHuman[sr.status] ?? {
              label: sr.status,
              color: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
            };
            return (
              <div key={sr.id}>
                <div
                  onClick={() => handleSelect(sr.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedId === sr.id
                      ? "border-sky-500/30 bg-sky-500/5"
                      : "border-white/[0.06] bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={human.color}>
                        {human.label}
                      </Badge>
                      <span className="text-xs text-neutral-400">
                        {truncate(sr.id, 6)}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(sr.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-neutral-400">
                    <span>Amount: {sr.amount}</span>
                    <span>Chain: {sr.destinationChainId}</span>
                    {sr.agent?.name && <span>Agent: {sr.agent.name}</span>}
                  </div>
                </div>

                {selectedId === sr.id && execution && (
                  <Card className="mt-2 border-white/[0.06] bg-neutral-900/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-white">
                        <FileKey className="h-4 w-4 text-purple-400" />
                        Execution Detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={human.color}>
                          {execution.signingRequest.status}
                        </Badge>
                        {!polling ? (
                          <Button variant="outline" size="sm" onClick={handlePoll} className="text-xs">
                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                            Poll status
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              stopPolling();
                              setPolling(false);
                            }}
                            className="text-xs"
                          >
                            <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Polling…
                          </Button>
                        )}
                      </div>
                      {execution.signingRequest.signatureHex && (
                        <div className="space-y-1">
                          <span className="text-xs text-neutral-500">Signature</span>
                          <code className="block truncate rounded bg-black/30 px-2 py-1 text-[10px] text-neutral-300">
                            {execution.signingRequest.signatureHex}
                          </code>
                        </div>
                      )}
                      {execution.auditEvents.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-neutral-400">Audit Events</p>
                          {execution.auditEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-center justify-between rounded bg-black/20 px-2 py-1 text-[11px]"
                            >
                              <span className="text-neutral-400">{ev.eventType}</span>
                              <span className="text-neutral-500">
                                {new Date(ev.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
