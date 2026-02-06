"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useCluster } from "@/lib/solana/cluster-context";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useAgents } from "@/lib/hooks/use-agents";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { getProgramId, type ProgramName } from "@/lib/programs";
import {
  Fingerprint, Bot, Shield, Zap, FileText, Receipt, ChevronRight,
  ExternalLink, Wallet, Activity, Layers, Copy, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PROGRAMS: { key: ProgramName; label: string; icon: typeof Fingerprint }[] = [
  { key: "humanRegistry", label: "Human Registry", icon: Fingerprint },
  { key: "agentRegistry", label: "Agent Registry", icon: Bot },
  { key: "delegation", label: "Delegation", icon: Shield },
  { key: "humanPay", label: "HumanPay", icon: Zap },
  { key: "dataBlink", label: "DataBlink", icon: Activity },
  { key: "documentRegistry", label: "Document Registry", icon: FileText },
  { key: "receipts", label: "Receipts", icon: Receipt },
];

const ACTIONS = [
  { href: "/dashboard/identity", icon: Fingerprint, title: "Human Identity", desc: "Create or manage your on-chain identity profile", color: "emerald" as const },
  { href: "/dashboard/agents", icon: Bot, title: "Register Agent", desc: "KYA — register and manage AI agents", color: "sky" as const },
  { href: "/dashboard/delegation", icon: Shield, title: "Delegation", desc: "Issue capabilities and spending limits", color: "violet" as const },
  { href: "/dashboard/payments", icon: Zap, title: "HumanPay", desc: "Escrow invoices and agent payments", color: "amber" as const },
  { href: "/dashboard/documents", icon: FileText, title: "Documents", desc: "On-chain document signing and attestation", color: "rose" as const },
  { href: "/dashboard/receipts", icon: Receipt, title: "Receipts", desc: "Audit trail for all protocol actions", color: "teal" as const },
];

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string; icon: string }> = {
  emerald: { bg: "bg-emerald-500/8", ring: "ring-emerald-500/15", text: "text-emerald-400", icon: "text-emerald-500" },
  sky:     { bg: "bg-sky-500/8",     ring: "ring-sky-500/15",     text: "text-sky-400",     icon: "text-sky-500" },
  violet:  { bg: "bg-violet-500/8",  ring: "ring-violet-500/15",  text: "text-violet-400",  icon: "text-violet-500" },
  amber:   { bg: "bg-amber-500/8",   ring: "ring-amber-500/15",   text: "text-amber-400",   icon: "text-amber-500" },
  rose:    { bg: "bg-rose-500/8",    ring: "ring-rose-500/15",    text: "text-rose-400",    icon: "text-rose-500" },
  teal:    { bg: "bg-teal-500/8",    ring: "ring-teal-500/15",    text: "text-teal-400",    icon: "text-teal-500" },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } };

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
      className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function DashboardOverview() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const { profile, hasProfile, loading: profileLoading } = useHumanProfile();
  const { agents, loading: agentsLoading } = useAgents();
  const { capabilities, loading: capsLoading } = useCapabilities();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((b) => setBalance(b / 1e9)).catch(() => {});
  }, [publicKey, connection]);

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Wallet className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-8 max-w-sm text-sm text-neutral-500">
          Connect a Solana wallet to access HumanRail protocol — identity, delegation, payments, and audit on devnet.
        </p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-emerald-600 px-6 hover:bg-emerald-700">
          <Wallet className="h-4 w-4" /> Connect Wallet
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Fingerprint className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Identity</p>
              {profileLoading ? <Skeleton className="mt-1 h-6 w-16 bg-neutral-800" /> :
                <p className="text-xl font-bold text-white">{hasProfile ? <span className="text-emerald-400">Active</span> : <span className="text-neutral-500">None</span>}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <Bot className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Agents</p>
              {agentsLoading ? <Skeleton className="mt-1 h-6 w-10 bg-neutral-800" /> :
                <p className="text-xl font-bold text-white">{agents.length}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Shield className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Capabilities</p>
              {capsLoading ? <Skeleton className="mt-1 h-6 w-10 bg-neutral-800" /> :
                <p className="text-xl font-bold text-white">{capabilities.length}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Balance</p>
              {balance === null ? <Skeleton className="mt-1 h-6 w-20 bg-neutral-800" /> :
                <p className="text-xl font-bold text-white">{balance.toFixed(3)} <span className="text-sm font-normal text-neutral-500">SOL</span></p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* No profile banner */}
      {!profileLoading && !hasProfile && (
        <motion.div variants={fadeUp}>
          <Card className="border-amber-500/15 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">No Human Profile Found</p>
                <p className="text-xs text-amber-400/60">Create your identity to register agents, delegate capabilities, and use rails.</p>
              </div>
              <Link href="/dashboard/identity">
                <Button size="sm" className="gap-1.5 bg-amber-600 text-xs hover:bg-amber-700">
                  <Fingerprint className="h-3.5 w-3.5" /> Create Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((action) => {
            const c = COLOR_MAP[action.color];
            return (
              <Link key={action.href} href={action.href}>
                <Card className="group cursor-pointer border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08] hover:bg-white/[0.03]">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${c.bg} ${c.ring}`}>
                      <action.icon className={`h-[18px] w-[18px] ${c.icon}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-neutral-200 group-hover:text-white">{action.title}</p>
                      <p className="truncate text-[11px] text-neutral-600">{action.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-700 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Programs */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Deployed Programs</h2>
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-[10px] text-emerald-400">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> 7 / 7 Live
          </Badge>
        </div>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="divide-y divide-white/[0.04] p-0">
            {PROGRAMS.map((prog) => {
              let addr: string;
              try { addr = getProgramId(cluster, prog.key).toBase58(); } catch { addr = "—"; }
              return (
                <div key={prog.key} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                    <span className="text-[13px] font-medium text-neutral-300">{prog.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="hidden text-[11px] text-neutral-600 sm:block">{addr.slice(0, 8)}…{addr.slice(-6)}</code>
                    <CopyBtn text={addr} />
                    <a href={`https://explorer.solana.com/address/${addr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer"
                      className="text-neutral-700 transition-colors hover:text-emerald-500">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Architecture */}
      <motion.div variants={fadeUp}>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Protocol Architecture</h2>
        <Card className="border-emerald-500/10 bg-emerald-500/[0.02]">
          <CardContent className="space-y-4 p-5">
            {[
              { layer: "Identity Layer", items: "Human Registry · Agent Registry", color: "bg-emerald-400" },
              { layer: "Authorization Layer", items: "Delegation · Capabilities · Freeze", color: "bg-sky-400" },
              { layer: "Rails Layer", items: "HumanPay · DataBlink · Documents", color: "bg-violet-400" },
              { layer: "Audit Layer", items: "Receipts · Compliance Trail", color: "bg-amber-400" },
            ].map((l) => (
              <div key={l.layer} className="flex items-center gap-4">
                <div className={`h-8 w-[3px] rounded-full ${l.color}`} />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">{l.layer}</p>
                  <p className="text-[12px] text-neutral-600">{l.items}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
