"use client";

import { useRouter } from "next/navigation";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Wallet,
  Lock,
  FileKey,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Activity,
  Compass,
  FlaskConical,
  Send,
  MessageSquareText,
} from "lucide-react";

const statusHuman: Record<string, { label: string; color: string }> = {
  requested: { label: "Waiting", color: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  queued: { label: "Queued", color: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
  worker_processing: { label: "Processing", color: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  policy_rejected: { label: "Rejected by mandate", color: "bg-red-500/10 text-red-300 border-red-500/20" },
  guard_approved: { label: "Approved by mandate", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  ika_pending: { label: "Waiting for Ika signature", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  signed: { label: "Signed", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-300 border-red-500/20" },
};

function truncate(str: string, len = 10) {
  if (!str || str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}…${str.slice(-len)}`;
}

export default function ConsoleDashboard() {
  const router = useRouter();
  const {
    loading,
    error,
    apiAvailable,
    agents,
    wallets,
    policies,
    signingRequests,
    auditEvents,
    refresh,
  } = useMandaraProduct();

  const signedCount = signingRequests.filter((s) => s.status === "signed").length;
  const rejectedCount = signingRequests.filter((s) => s.status === "policy_rejected").length;

  const hasAgent = agents.length > 0;
  const hasWallet = wallets.length > 0;
  const hasPolicy = policies.length > 0;
  const hasRequest = signingRequests.length > 0;

  const setupSteps = [
    { label: "Agent", done: hasAgent, icon: Bot },
    { label: "Wallet", done: hasWallet, icon: Wallet },
    { label: "Mandate", done: hasPolicy, icon: Lock },
    { label: "Connection Key", done: false, icon: FileKey },
    { label: "Test Request", done: hasRequest, icon: Send },
  ];
  const completedSteps = setupSteps.filter((s) => s.done).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading console…
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
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-neutral-400">
          <p className="font-medium text-white">To start the API locally:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li>npm run product:docker:up</li>
            <li>npm run product:db:push</li>
            <li>npm run product:import-devnet-artifacts</li>
            <li>npm run product:api:dev</li>
          </ol>
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
      {/* Getting Started card */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Compass className="h-4 w-4 text-sky-400" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">
              {completedSteps} of {setupSteps.length} steps completed
            </span>
            <span className="text-xs text-neutral-500">
              {Math.round((completedSteps / setupSteps.length) * 100)}%
            </span>
          </div>
          <Progress
            value={(completedSteps / setupSteps.length) * 100}
            className="h-2 bg-neutral-800"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {setupSteps.map((step) => (
              <div
                key={step.label}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  step.done
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.06] bg-white/[0.02] text-neutral-500"
                }`}
              >
                <step.icon className="h-3.5 w-3.5" />
                {step.label}
                {step.done && <CheckCircle2 className="ml-auto h-3 w-3" />}
              </div>
            ))}
          </div>
          {completedSteps < setupSteps.length && (
            <Button
              size="sm"
              onClick={() => router.push("/mandara/app/onboarding")}
              className="bg-sky-600 text-xs hover:bg-sky-700"
            >
              <Compass className="mr-1.5 h-3.5 w-3.5" />
              Continue Setup
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Agents", value: agents.length, icon: Bot, color: "text-sky-400" },
          { label: "Mandates", value: policies.length, icon: Lock, color: "text-amber-400" },
          { label: "Requests", value: signingRequests.length, icon: FileKey, color: "text-purple-400" },
          { label: "Signed", value: signedCount, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Rejections", value: rejectedCount, icon: XCircle, color: "text-red-400" },
        ].map((item) => (
          <Card key={item.label} className="border-white/[0.06] bg-white/[0.03]">
            <CardContent className="flex flex-col items-center justify-center py-4">
              <item.icon className={`mb-1 h-5 w-5 ${item.color}`} />
              <p className="text-xl font-semibold text-white">{item.value}</p>
              <p className="text-xs text-neutral-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#5EBDB0]/15 bg-[#21342F]/45">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-[#8de7dc]" />
            <div>
              <p className="text-sm font-medium text-white">Talk to your agent</p>
              <p className="text-xs text-neutral-500">Prepare signature requests in natural language.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/mandara/app/agent-chat")}
            className="bg-[#3E877E] text-xs hover:bg-[#326d66]"
          >
            Open Agent Chat
          </Button>
        </CardContent>
      </Card>

      {/* Recent Signature Requests */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileKey className="h-4 w-4 text-purple-400" />
            Recent Signature Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signingRequests.length === 0 ? (
            <div className="text-sm text-neutral-500">
              No signature requests yet.{" "}
              <button
                onClick={() => router.push("/mandara/app/onboarding")}
                className="text-sky-400 hover:underline"
              >
                Run onboarding
              </button>{" "}
              to create your first request.
            </div>
          ) : (
            <div className="space-y-2">
              {signingRequests.slice(0, 5).map((sr) => {
                const human = statusHuman[sr.status] ?? {
                  label: sr.status,
                  color: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
                };
                return (
                  <div
                    key={sr.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={human.color}>
                          {human.label}
                        </Badge>
                        <span className="text-xs text-neutral-500">
                          {truncate(sr.id, 6)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-neutral-400">
                        <span>Amount: {sr.amount}</span>
                        <span>Chain: {sr.destinationChainId}</span>
                        {sr.agent?.name && (
                          <span>Agent: {sr.agent.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="ml-3 text-xs text-neutral-500">
                      {new Date(sr.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Activity className="h-4 w-4 text-emerald-400" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditEvents.length === 0 ? (
            <p className="text-sm text-neutral-500">No activity yet.</p>
          ) : (
            auditEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5 text-xs"
              >
                <span className="text-neutral-400">{ev.summary ?? ev.eventType}</span>
                <span className="text-xs text-neutral-500">
                  {new Date(ev.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Advanced link */}
      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-white">Advanced Technical Proof</p>
              <p className="text-xs text-neutral-500">
                On-chain PDAs, Ika program details, transaction signatures
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/advanced")}
            className="text-xs"
          >
            Open Advanced Hub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
