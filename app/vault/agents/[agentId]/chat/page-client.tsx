"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCluster } from "@/lib/solana/cluster-context";
import { useAgent } from "@/lib/hooks/use-agent";
import { useAgentCapabilities } from "@/lib/hooks/use-agent-capabilities";
import {
  Bot, Send, AlertTriangle, Shield, Zap, Wallet, FileText,
  ExternalLink, Loader2, Pause, Snowflake, Activity,
} from "lucide-react";
import { toast } from "sonner";

const AGENT_SERVER_URL = "/api/agents"; // Proxied through Next.js API route

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown>; result?: string }[];
  signatures?: string[];
  timestamp: number;
}

function isTxSignature(str: string): boolean {
  return /^[A-Za-z0-9]{87,88}$/.test(str);
}

function AgentStatusSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-32 bg-neutral-900" />
      <Skeleton className="h-20 w-full bg-neutral-900" />
      <Skeleton className="h-20 w-full bg-neutral-900" />
    </div>
  );
}

export default function AgentChatPageClient() {
  const params = useParams();
  const agentId = Array.isArray(params.agentId) ? params.agentId[0] : params.agentId;
  const { cluster } = useCluster();
  const [agentPk, setAgentPk] = useState<any>(null);
  const { agent, loading: agentLoading } = useAgent(agentPk);
  const { capabilities, loading: capsLoading } = useAgentCapabilities(agentPk);

  useEffect(() => {
    if (!agentId) return;
    import("@solana/web3.js").then(({ PublicKey }) => {
      try {
        setAgentPk(new PublicKey(agentId));
      } catch {}
    });
  }, [agentId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const frozen = capabilities.some((c) => c.isFrozen);
  const isActive = agent?.status === "Active";

  useEffect(() => {
    if (!agentId) return;
    const wsUrl = AGENT_SERVER_URL.replace(/^http/, "ws") + `/agents/${agentId}/events`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "tool_call") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "agent" && !last.content) {
              const updated = { ...last };
              updated.toolCalls = updated.toolCalls || [];
              updated.toolCalls.push({ name: data.tool, args: data.args });
              return [...prev.slice(0, -1), updated];
            }
            return prev;
          });
        } else if (data.type === "tool_result") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "agent" && last.toolCalls) {
              const updated = { ...last };
              const tc = updated.toolCalls![updated.toolCalls!.length - 1];
              tc.result = data.result;
              try {
                const parsed = JSON.parse(data.result);
                if (parsed.signatures && Array.isArray(parsed.signatures)) {
                  updated.signatures = parsed.signatures;
                }
              } catch {}
              return [...prev.slice(0, -1), updated];
            }
            return prev;
          });
        } else if (data.type === "response") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "agent") {
              const updated = { ...last, content: data.content };
              return [...prev.slice(0, -1), updated];
            }
            return [...prev, { id: crypto.randomUUID(), role: "agent", content: data.content, timestamp: Date.now() }];
          });
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !agentId || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() }]);
    setSending(true);

    try {
      const res = await fetch(`${AGENT_SERVER_URL}/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "agent" && !last.content) {
          return [...prev.slice(0, -1), { ...last, content: data.response }];
        }
        return [...prev, { id: crypto.randomUUID(), role: "agent", content: data.response, timestamp: Date.now() }];
      });
    } catch (err: any) {
      toast.error("Failed to send message", { description: err.message });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Sorry, I couldn't process that message. Please try again.", timestamp: Date.now() }]);
    } finally {
      setSending(false);
    }
  };

  const dailyRemaining = capabilities.reduce((sum, c) => sum + (c.dailyLimit - c.dailySpent), BigInt(0));

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col gap-4 md:flex-row">
      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-neutral-950">
        {frozen && (
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            This agent is frozen. All capabilities are suspended.
          </div>
        )}
        {!isActive && (
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-red-500/10 px-4 py-2 text-xs text-red-300">
            <Pause className="h-4 w-4" />
            This agent is {agent?.status || "inactive"}. Chat is disabled.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "bg-sky-600 text-white" : "border border-white/[0.06] bg-white/[0.02] text-neutral-200"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.toolCalls.map((tc, idx) => (
                        <div key={idx} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            {tc.name === "check_capability" && <Shield className="h-3 w-3" />}
                            {tc.name === "execute_payment" && <Wallet className="h-3 w-3" />}
                            {tc.name === "store_data" && <Zap className="h-3 w-3" />}
                            {tc.name === "sign_document" && <FileText className="h-3 w-3" />}
                            {tc.name === "get_agent_status" && <Activity className="h-3 w-3" />}
                            <span className="font-medium capitalize">{tc.name.replace(/_/g, " ")}</span>
                          </div>
                          {tc.result && (
                            <div className="mt-1 text-[11px] text-neutral-500">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(tc.result);
                                  if (parsed.authorized !== undefined) {
                                    return parsed.authorized ? (
                                      <span className="text-emerald-400">✓ Authorized</span>
                                    ) : (
                                      <span className="text-red-400">✗ {parsed.reason || "Unauthorized"}</span>
                                    );
                                  }
                                  if (parsed.success !== undefined) {
                                    return parsed.success ? (
                                      <span className="text-emerald-400">✓ Success</span>
                                    ) : (
                                      <span className="text-red-400">✗ {parsed.error || "Failed"}</span>
                                    );
                                  }
                                } catch {}
                                return tc.result.slice(0, 120);
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.signatures && m.signatures.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.signatures.map((sig, idx) => (
                        isTxSignature(sig) ? (
                          <a
                            key={idx}
                            href={`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View TX {sig.slice(0, 4)}…{sig.slice(-4)}
                          </a>
                        ) : (
                          <span key={idx} className="text-[11px] text-neutral-500">{sig.slice(0, 20)}…</span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={frozen || !isActive ? "Agent is not active" : "Type a message..."}
              disabled={frozen || !isActive || sending}
              className="flex-1 border-neutral-800 bg-neutral-900"
            />
            <Button onClick={handleSend} disabled={frozen || !isActive || sending || !input.trim()} size="icon" className="bg-sky-600 hover:bg-sky-700">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-600">
            <span>{connected ? "Connected to agent server" : "Disconnected from agent server"}</span>
            <span>Agent Server: {AGENT_SERVER_URL}</span>
          </div>
        </div>
      </div>

      {/* Status sidebar */}
      <div className="w-full shrink-0 space-y-3 md:w-72">
        {agentLoading || capsLoading ? (
          <AgentStatusSkeleton />
        ) : agent ? (
          <>
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Bot className="h-4 w-4 text-sky-500" />
                  {agent.name || "Unnamed Agent"}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={agent.status === "Active" ? "border-emerald-500/20 text-emerald-400" : agent.status === "Suspended" ? "border-amber-500/20 text-amber-400" : "border-red-500/20 text-red-400"}>
                    {agent.status}
                  </Badge>
                  {frozen && (
                    <Badge variant="outline" className="border-sky-500/20 text-sky-400">
                      <Snowflake className="mr-1 h-3 w-3" /> Frozen
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-neutral-500">Daily Budget Remaining</p>
                <p className="text-lg font-semibold text-white">{(Number(dailyRemaining) / 1e9).toFixed(4)} SOL</p>
                <p className="text-[10px] text-neutral-600">Across {capabilities.length} capabilities</p>
              </CardContent>
            </Card>

            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-neutral-500">Capabilities</p>
                <div className="mt-2 space-y-2">
                  {capabilities.length === 0 && <p className="text-xs text-neutral-600">No capabilities</p>}
                  {capabilities.map((cap) => (
                    <div key={cap.pda.toBase58()} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">{cap.allowedPrograms.toString() === "18446744073709551615" ? "Full" : "Scoped"}</span>
                        <span className={cap.isFrozen ? "text-sky-400" : "text-emerald-400"}>{cap.isFrozen ? "Frozen" : cap.status}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-500">
                        Per-tx: {(Number(cap.perTxLimit) / 1e9).toFixed(3)} · Daily: {(Number(cap.dailyLimit) / 1e9).toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Link href={`/vault/agents/${agentId}`}>
              <Button variant="outline" className="w-full text-xs">
                View Agent Details
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
