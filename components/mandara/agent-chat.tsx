"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Info,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import type { AgentActionProposal, AgentChatMessage } from "@/lib/mandara-api/types";
import { AgentChatMessageList } from "./agent-chat-message-list";
import { AgentActionProposalCard } from "./agent-action-proposal-card";
import { SubscriptionUsageCard } from "./subscription-usage-card";

const suggestions = [
  "Prepare a 42 USDC payout to the approved Base Sepolia recipient",
  "Can this agent request 150 USDC?",
  "Explain this agent's mandate",
  "Why was my request rejected?",
  "How do I connect a real agent using the SDK?",
  "Show me the latest signature request status",
  "What does devnet beta mean?",
];

function modelStatusLabel(provider?: string | null) {
  const p = provider ?? "unknown";
  if (p === "scope_guard" || p === "unknown") {
    return { text: "Safe local parser", sub: "No cloud model configured" };
  }
  if (p === "deterministic") {
    return { text: "Deterministic parser", sub: "No cloud model configured. Using safe local parser." };
  }
  return { text: "Natural language understanding", sub: `Powered by Mandara backend (${p})` };
}

export default function AgentChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loading,
    error,
    apiAvailable,
    agents,
    policies,
    refresh,
    createAgentChatSession,
    sendAgentChatMessage,
    approveAgentProposal,
    rejectAgentProposal,
    getSubscription,
  } = useMandaraProduct();
  const activeAgents = useMemo(() => agents.filter((agent) => agent.status === "active"), [agents]);
  const initialAgentId = searchParams.get("agentId") ?? "";
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [proposal, setProposal] = useState<AgentActionProposal | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    signingRequestId: string;
    status: string;
    enqueued: boolean;
  } | null>(null);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof getSubscription>> | null>(null);
  const [lastProvider, setLastProvider] = useState<{ provider: string } | null>(null);

  useEffect(() => {
    if (!selectedAgentId && activeAgents.length === 1) {
      setSelectedAgentId(activeAgents[0].id);
    }
  }, [activeAgents, selectedAgentId]);

  useEffect(() => {
    void getSubscription().then(setSubscription).catch(() => setSubscription(null));
  }, [getSubscription]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const session = await createAgentChatSession({
      agentId: selectedAgentId || undefined,
      title: "Agent Chat",
    });
    setSessionId(session.id);
    return session.id;
  };

  const submitMessage = async (message: string) => {
    if (!message.trim()) return;
    setBusy("send");
    setChatError(null);
    setExecutionResult(null);
    try {
      const id = await ensureSession();
      const result = await sendAgentChatMessage({
        sessionId: id,
        agentId: selectedAgentId || undefined,
        message: message.trim(),
        mode: "prepare_signature_request",
      });
      setSessionId(result.session.id);
      setMessages(result.session.messages ?? [
        ...(result.userMessage ? [result.userMessage] : []),
        result.assistantMessage,
      ]);
      setProposal(result.proposal ?? result.session.proposals?.[0] ?? null);
      setLastProvider({
        provider: result.assistantMessage.provider ?? "unknown",
      });
      void getSubscription().then(setSubscription).catch(() => undefined);
      setInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Agent Chat failed";
      // Human-friendly API error mapping
      if (msg.includes("SUBSCRIPTION_LIMIT_EXCEEDED")) {
        setChatError("You have reached your monthly Agent Chat limit. Upgrade your plan to continue.");
      } else if (msg.includes("OUT_OF_SCOPE")) {
        setChatError("That topic is outside what Agent Chat can help with. Try asking about Mandara agents, mandates, or signature requests.");
      } else {
        setChatError(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const approve = async (enqueue: boolean) => {
    if (!proposal) return;
    setBusy(enqueue ? "approve_enqueue" : "approve");
    setChatError(null);
    try {
      const result = await approveAgentProposal(proposal.id, { enqueue });
      setProposal(result.proposal);
      setExecutionResult({
        signingRequestId: result.signingRequest.id,
        status: result.signingRequest.status,
        enqueued: !!result.execution,
      });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!proposal) return;
    setBusy("reject");
    setChatError(null);
    try {
      const result = await rejectAgentProposal(proposal.id, { reason: "Rejected from Agent Chat" });
      setProposal(result.proposal);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading Agent Chat…
      </div>
    );
  }

  if (error && !apiAvailable) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-200">Mandara API is not running</p>
            <p className="mt-1 text-xs text-amber-200/70">{error}</p>
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-neutral-400">
          <p className="font-medium text-white">Local setup commands</p>
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

  const status = modelStatusLabel(lastProvider?.provider);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agent Chat</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Talk to your Mandara agent in plain English. The agent prepares signature requests and explains mandate results. Only you can approve or reject them.
          </p>
          <p className="mt-2 text-xs text-amber-300">
            Devnet beta · Ika pre-alpha mock signer · Not production custody
          </p>
        </div>
      </div>

      {activeAgents.length === 0 ? (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-[#8de7dc]" />
              <div>
                <p className="text-sm font-medium text-white">No agents yet</p>
                <p className="text-xs text-neutral-500">Create your first agent to start chatting.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/mandara/app/onboarding")} className="bg-[#3E877E] text-xs">
              Create your first agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Select
          label="Agent"
          value={selectedAgentId}
          onChange={(event) => setSelectedAgentId(event.target.value)}
          options={activeAgents.map((agent) => ({ value: agent.id, label: agent.name }))}
          className="max-w-md"
        />
      )}

      {policies.length === 0 && activeAgents.length > 0 && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">No mandate available for this agent</p>
                <p className="text-xs text-neutral-500">A mandate defines what the agent is allowed to request.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/mandara/app/onboarding")} className="bg-sky-600 text-xs hover:bg-sky-700">
              Create mandate
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardContent className="space-y-4 p-4">
            <AgentChatMessageList messages={messages} />

            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#5EBDB0]/15 bg-[#21342F]/45 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-[#8de7dc]" />
                    Talk to your Mandara Agent
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-neutral-400">
                    Your agent can help prepare signature requests, check them against mandates, and explain approvals or rejections. It cannot sign, enqueue, or bypass policy unless you explicitly approve the proposal.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-neutral-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      Ask in plain English.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      Mandara turns your message into a structured request.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      Mandara previews the request against the mandate.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      You approve or reject before anything is created.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      Signing execution is handled by Mandara’s worker and policy system.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {chatError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {chatError}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(input);
                  }
                }}
                placeholder="Ask the agent to prepare a 42 USDC request to the approved Base Sepolia recipient…"
                className="min-h-20 flex-1 resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#5EBDB0]/40"
                disabled={!selectedAgentId || !!busy}
              />
              <Button
                onClick={() => void submitMessage(input)}
                disabled={!selectedAgentId || !!busy || !input.trim()}
                className="self-end bg-[#3E877E] hover:bg-[#326d66]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SubscriptionUsageCard subscription={subscription} />

          {lastProvider && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" />
                <p className="text-sm font-medium text-white">Assistant mode</p>
              </div>
              <p className="mt-1 text-xs text-neutral-400">{status.text}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{status.sub}</p>
            </div>
          )}

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">What can I ask?</p>
            <div className="mt-3 space-y-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => void submitMessage(suggestion)}
                  disabled={!selectedAgentId || !!busy}
                  className="h-auto w-full justify-start whitespace-normal py-2 text-left text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {proposal && (
            <AgentActionProposalCard
              proposal={proposal}
              busy={busy}
              executionResult={executionResult}
              onApprove={(enqueue) => void approve(enqueue)}
              onReject={() => void reject()}
            />
          )}

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              What this assistant cannot do
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-neutral-500">
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Access private keys.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Sign directly.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Bypass mandates.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Answer unrelated general questions.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Execute on mainnet.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                Provide financial advice.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-5 text-neutral-500">
            <MessageSquare className="mb-1 h-4 w-4 text-neutral-400" />
            The chat assistant can prepare requests and explain policy results. It cannot sign, enqueue, or bypass mandates without your explicit approval.
          </div>
        </div>
      </div>
    </div>
  );
}
