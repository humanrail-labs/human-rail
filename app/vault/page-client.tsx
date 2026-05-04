"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { useCluster } from "@/lib/solana/cluster-context";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useAgents } from "@/lib/hooks/use-agents";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useReceipts } from "@/lib/hooks/use-receipts";
import { LiveActivityFeed } from "@/components/vault/live-activity-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Fingerprint, Bot, Shield, Zap, Receipt, ChevronRight,
  CheckCircle2, AlertTriangle, Wallet, Activity, ArrowRight,
  Clock, Copy,
} from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); toast.success("Copied!"); setTimeout(() => setOk(false), 1200); }}
      className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function formatRelativeTime(timestampSec: number): string {
  const diff = Math.floor((Date.now() - timestampSec * 1000) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function VaultHomePage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const { profile, hasProfile, loading: profileLoading } = useHumanProfile();
  const { agents, loading: agentsLoading } = useAgents();
  const { capabilities, loading: capsLoading } = useCapabilities();
  const { receipts, loading: receiptsLoading } = useReceipts();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((b) => setBalance(b / 1e9)).catch(() => {});
  }, [publicKey, connection]);

  const agentStats = useMemo(() => {
    const active = agents.filter((a) => a.status === "Active").length;
    const suspended = agents.filter((a) => a.status === "Suspended").length;
    const revoked = agents.filter((a) => a.status === "Revoked").length;
    return { active, suspended, revoked, total: agents.length };
  }, [agents]);

  const totalSpend = useMemo(() => {
    return receipts.reduce((sum, r) => sum + r.value, BigInt(0));
  }, [receipts]);

  const activeCapabilities = useMemo(() => {
    return capabilities.filter((c) => c.status === "Active" && !c.isFrozen).length;
  }, [capabilities]);

  // Last activity per agent
  const agentLastActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of receipts) {
      const key = r.agentId.toBase58();
      const existing = map.get(key) || 0;
      if (r.timestamp > existing) map.set(key, r.timestamp);
    }
    return map;
  }, [receipts]);

  // Agent warning map: budget >80% or expiring within 48h
  const agentWarnings = useMemo(() => {
    const map = new Map<string, string>();
    for (const cap of capabilities) {
      const agentId = cap.agent.toBase58();
      const totalPct = cap.totalLimit > BigInt(0) ? Number(cap.totalSpent * BigInt(100) / cap.totalLimit) : 0;
      const expiringSoon = cap.expiresAt > 0 && (cap.expiresAt * 1000 - Date.now()) < 48 * 3600 * 1000;
      if (totalPct > 80) {
        map.set(agentId, "Budget >80%");
      } else if (expiringSoon) {
        if (!map.has(agentId)) map.set(agentId, "Expiring soon");
      }
    }
    return map;
  }, [capabilities]);

  // Alerts data
  const highUtilizationCaps = useMemo(() => {
    return capabilities.filter((c) => c.totalLimit > BigInt(0) && Number(c.totalSpent * BigInt(100) / c.totalLimit) > 80);
  }, [capabilities]);

  const expiringSoonCaps = useMemo(() => {
    return capabilities.filter((c) => c.expiresAt > 0 && (c.expiresAt * 1000 - Date.now()) < 48 * 3600 * 1000);
  }, [capabilities]);

  const inactiveAgents = useMemo(() => {
    const alerts: { name: string; pda: string }[] = [];
    const now = Date.now();
    for (const agent of agents) {
      const lastActivity = agentLastActivity.get(agent.pda.toBase58());
      if (!lastActivity || (now - lastActivity * 1000) > 7 * 86400 * 1000) {
        alerts.push({ name: agent.name || "Unnamed Agent", pda: agent.pda.toBase58() });
      }
    }
    return alerts;
  }, [agents, agentLastActivity]);

  const hasAlerts = highUtilizationCaps.length > 0 || expiringSoonCaps.length > 0 || inactiveAgents.length > 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Grant Banner */}
      <motion.div variants={fadeUp}>
        <Card className="border-sky-500/15 bg-sky-500/[0.02]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-500/20">
                <Shield className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-sky-200">New: Guarded dWallets</p>
                <p className="text-xs text-sky-400/60">Cross-chain AI agent custody with Ika MPC signing and Mandara policy guardrails.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 border-sky-500/20 text-sky-400 hover:bg-sky-500/5 hover:text-sky-300" disabled>
              Coming Soon <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Identity Status */}
      <motion.div variants={fadeUp}>
        {profileLoading ? (
          <Skeleton className="h-32 rounded-xl bg-neutral-900" />
        ) : hasProfile ? (
          <Card className="border-emerald-500/15 bg-emerald-500/[0.02]">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Identity Verified</p>
                  <p className="text-lg font-semibold text-white">
                    {profile?.humanScore ?? 0} <span className="text-sm font-normal text-neutral-500">/ 100 Human Score</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                  Active Profile
                </Badge>
                <Link href="/vault/identity">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500/15 bg-amber-500/[0.02]">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-200">Verify Your Identity</p>
                  <p className="text-xs text-amber-400/60">Create an on-chain human profile to deploy agents and set capabilities.</p>
                </div>
              </div>
              <Link href="/vault/identity">
                <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700">
                  <Fingerprint className="h-4 w-4" /> Get Verified
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Quick Stats */}
      {/* TODO: add /vault/dwallets UI for dWallet management and cross-chain signing requests */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <Bot className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Agents</p>
              {agentsLoading ? <Skeleton className="mt-1 h-6 w-16 bg-neutral-800" /> : (
                <p className="text-xl font-bold text-white">
                  {agentStats.total}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    ({agentStats.active} active · {agentStats.suspended} suspended · {agentStats.revoked} revoked)
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Agent Spend</p>
              {receiptsLoading ? <Skeleton className="mt-1 h-6 w-16 bg-neutral-800" /> : (
                <p className="text-xl font-bold text-white">
                  {(Number(totalSpend) / 1e9).toFixed(4)} <span className="text-sm font-normal text-neutral-500">SOL</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Shield className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Active Capabilities</p>
              {capsLoading ? <Skeleton className="mt-1 h-6 w-16 bg-neutral-800" /> : (
                <p className="text-xl font-bold text-white">{activeCapabilities}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts Section */}
      <motion.div variants={fadeUp}>
        <Card className={hasAlerts ? "border-amber-500/15 bg-amber-500/[0.02]" : "border-emerald-500/15 bg-emerald-500/[0.02]"}>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Alerts</h2>
            {!hasAlerts ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> All agents operating normally
              </div>
            ) : (
              <div className="space-y-2">
                {highUtilizationCaps.map((cap) => {
                  const pct = Math.min(Number(cap.totalSpent * BigInt(100) / cap.totalLimit), 100);
                  return (
                    <div key={`util-${cap.pda.toBase58()}`} className="flex items-center gap-2 text-sm text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Capability <code className="text-amber-200">{cap.pda.toBase58().slice(0, 8)}…</code> is {pct}% utilized</span>
                      <Link href={`/vault/agents/${cap.agent.toBase58()}`}>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-sky-400 hover:text-sky-300">Review</Button>
                      </Link>
                    </div>
                  );
                })}
                {expiringSoonCaps.map((cap) => (
                  <div key={`exp-${cap.pda.toBase58()}`} className="flex items-center gap-2 text-sm text-amber-300">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Capability <code className="text-amber-200">{cap.pda.toBase58().slice(0, 8)}…</code> expires {new Date(cap.expiresAt * 1000).toLocaleDateString()}</span>
                    <Link href={`/vault/agents/${cap.agent.toBase58()}`}>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-sky-400 hover:text-sky-300">Review</Button>
                    </Link>
                  </div>
                ))}
                {inactiveAgents.map((agent) => (
                  <div key={`inactive-${agent.pda}`} className="flex items-center gap-2 text-sm text-neutral-300">
                    <Activity className="h-4 w-4 text-neutral-500" />
                    <span>Agent <span className="text-white">{agent.name}</span> has been inactive for more than 7 days</span>
                    <Link href={`/vault/agents/${agent.pda}`}>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-sky-400 hover:text-sky-300">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Agent Overview */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Your Agents</h2>
          <Link href="/vault/agents">
            <Button variant="ghost" size="sm" className="gap-1 text-neutral-400 hover:text-white">
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {agentsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl bg-neutral-900" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <Bot className="mb-3 h-10 w-10 text-neutral-700" />
              <p className="text-sm font-medium text-neutral-400">No agents yet</p>
              <p className="mt-1 text-xs text-neutral-600">Deploy your first AI agent to get started.</p>
              <Link href="/vault/agents/new" className="mt-4">
                <Button size="sm" className="gap-2 bg-sky-600 hover:bg-sky-700">
                  <Bot className="h-4 w-4" /> Deploy Your First Agent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const statusColor =
                agent.status === "Active"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                  : agent.status === "Suspended"
                  ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                  : "border-red-500/20 bg-red-500/5 text-red-400";
              const lastActivity = agentLastActivity.get(agent.pda.toBase58());
              const warning = agentWarnings.get(agent.pda.toBase58());
              return (
                <Link key={agent.pda.toBase58()} href={`/vault/agents/${agent.pda.toBase58()}`}>
                  <Card className="group cursor-pointer border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1] hover:bg-white/[0.03]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
                            <Bot className="h-5 w-5 text-sky-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{agent.name || "Unnamed Agent"}</p>
                            <p className="text-[11px] text-neutral-500">
                              {agent.capabilityCount} capabilities · {agent.actionCount} actions
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                            {agent.status === "Active" && (
                              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            )}
                            {agent.status}
                          </Badge>
                          {warning && (
                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {warning}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                        <span>
                          {lastActivity
                            ? `Last action: ${formatRelativeTime(lastActivity)}`
                            : "No activity yet"}
                        </span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Recent Activity</h2>
          <Link href="/vault/activity">
            <Button variant="ghost" size="sm" className="gap-1 text-neutral-400 hover:text-white">
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <LiveActivityFeed />
      </motion.div>
    </motion.div>
  );
}
