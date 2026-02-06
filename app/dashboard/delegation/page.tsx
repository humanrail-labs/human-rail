"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useCapabilities, type CapabilityWithPda } from "@/lib/hooks/use-capabilities";
import { useAgents } from "@/lib/hooks/use-agents";
import { useCluster } from "@/lib/solana/cluster-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, RefreshCw, ExternalLink, Copy, CheckCircle2, Wallet, Snowflake, Flame, Trash2, Bot } from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
function CopyBtn({ text }: { text: string }) { const [ok, setOk] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className="text-neutral-600 transition-colors hover:text-neutral-400">{ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}</button>); }
const STATUS_MAP: Record<string, { cls: string; dot: string }> = {
  Active: { cls: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400", dot: "bg-emerald-400" },
  Frozen: { cls: "border-sky-500/20 bg-sky-500/5 text-sky-400", dot: "bg-sky-400" },
  Revoked: { cls: "border-red-500/20 bg-red-500/5 text-red-400", dot: "bg-red-400" },
  Disputed: { cls: "border-amber-500/20 bg-amber-500/5 text-amber-400", dot: "bg-amber-400" },
};
function lamportsToSol(n: bigint) { return (Number(n) / 1e9).toFixed(4); }

export default function DelegationPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { capabilities, loading, error, refetch, issueCapability, emergencyFreeze, unfreeze, revokeCapability } = useCapabilities();
  const { agents } = useAgents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ agentPda: "", perTxLimit: "1000000000", dailyLimit: "5000000000", totalLimit: "10000000000", validityDays: "30" });
  const [issuing, setIssuing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleIssue = async () => {
    if (!form.agentPda.trim()) { toast.error("Agent PDA required"); return; }
    setIssuing(true);
    try {
      const sig = await issueCapability({ agent: new PublicKey(form.agentPda.trim()), perTxLimit: Number(form.perTxLimit), dailyLimit: Number(form.dailyLimit), totalLimit: Number(form.totalLimit), validitySeconds: Number(form.validityDays) * 86400 });
      toast.success("Capability issued!", { description: `TX: ${sig.slice(0, 8)}…` }); setDialogOpen(false);
    } catch (err) { toast.error("Failed to issue capability", { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setIssuing(false); }
  };

  const doAction = async (action: string, cap: CapabilityWithPda) => {
    setActionLoading(`${action}-${cap.pda.toBase58()}`);
    try {
      let sig: string;
      if (action === "freeze") sig = await emergencyFreeze(cap.pda, cap.agent);
      else if (action === "unfreeze") sig = await unfreeze(cap.agent);
      else sig = await revokeCapability(cap.pda);
      toast.success(`Capability ${action}d!`, { description: `TX: ${sig.slice(0, 8)}…` });
    } catch (err) { toast.error(`Failed to ${action}`, { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setActionLoading(null); }
  };

  if (!connected) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20"><Shield className="h-8 w-8 text-violet-500" /></div>
      <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to manage delegation capabilities.</p>
      <Button onClick={() => setVisible(true)} className="gap-2 bg-violet-600 hover:bg-violet-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
    </motion.div>);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Delegation & Capabilities</h2><p className="text-sm text-neutral-500">Issue spending limits and permissions to agents</p></div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-neutral-500"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4" /> Issue Capability</Button></DialogTrigger>
            <DialogContent className="border-neutral-800 bg-neutral-950">
              <DialogHeader><DialogTitle>Issue New Capability</DialogTitle><DialogDescription>Grant spending limits and permissions to an agent.</DialogDescription></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Agent PDA</Label>
                  {agents.length > 0 ? (
                    <select value={form.agentPda} onChange={(e) => setForm({ ...form, agentPda: e.target.value })} className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white">
                      <option value="">Select an agent…</option>
                      {agents.map((a) => <option key={a.pda.toBase58()} value={a.pda.toBase58()}>{a.name || "Unnamed"} — {a.pda.toBase58().slice(0, 12)}…</option>)}
                    </select>
                  ) : <Input placeholder="Paste agent PDA" value={form.agentPda} onChange={(e) => setForm({ ...form, agentPda: e.target.value })} className="border-neutral-800 bg-neutral-900 font-mono text-xs" />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Per-TX Limit (lamports)</Label><Input value={form.perTxLimit} onChange={(e) => setForm({ ...form, perTxLimit: e.target.value })} className="border-neutral-800 bg-neutral-900 font-mono text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Daily Limit (lamports)</Label><Input value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} className="border-neutral-800 bg-neutral-900 font-mono text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Total Limit (lamports)</Label><Input value={form.totalLimit} onChange={(e) => setForm({ ...form, totalLimit: e.target.value })} className="border-neutral-800 bg-neutral-900 font-mono text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Validity (days)</Label><Input value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className="border-neutral-800 bg-neutral-900 font-mono text-xs" /></div>
                </div>
                <Button onClick={handleIssue} disabled={issuing} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                  {issuing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} {issuing ? "Issuing…" : "Issue Capability"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {loading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-neutral-900" />)}</div>}
      {!loading && capabilities.length === 0 && (<motion.div variants={fadeUp}><Card className="border-white/[0.04] bg-white/[0.015]"><CardContent className="flex flex-col items-center py-14 text-center"><Shield className="mb-4 h-12 w-12 text-neutral-700" /><p className="text-sm font-medium text-neutral-400">No capabilities issued</p><p className="mt-1 text-xs text-neutral-600">Issue a capability to grant an agent spending limits.</p></CardContent></Card></motion.div>)}

      {!loading && capabilities.map((cap) => {
        const st = STATUS_MAP[cap.status] ?? STATUS_MAP.Active;
        const addr = cap.pda.toBase58(); const agentAddr = cap.agent.toBase58();
        const dailyPct = cap.dailyLimit > BigInt(0) ? Math.min(Number(cap.dailySpent * BigInt(100) / cap.dailyLimit), 100) : 0;
        const totalPct = cap.totalLimit > BigInt(0) ? Math.min(Number(cap.totalSpent * BigInt(100) / cap.totalLimit), 100) : 0;
        const expiresAt = new Date(cap.expiresAt * 1000); const isExpired = expiresAt.getTime() < Date.now();
        const isActLoading = (a: string) => actionLoading === `${a}-${addr}`;
        return (
          <motion.div key={addr} variants={fadeUp}>
            <Card className="border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20"><Shield className="h-5 w-5 text-violet-500" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Capability</h3>
                        <Badge variant="outline" className={st.cls}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${st.dot}`} />{cap.status}{cap.isFrozen && " (Frozen)"}</Badge>
                        {isExpired && <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-400">Expired</Badge>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2"><code className="text-[11px] text-neutral-600">{addr.slice(0, 8)}…{addr.slice(-6)}</code><CopyBtn text={addr} /></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
                  <Bot className="h-4 w-4 text-sky-500" /><span className="text-[11px] text-neutral-500">Agent:</span>
                  <code className="text-[11px] text-neutral-400">{agentAddr.slice(0, 12)}…{agentAddr.slice(-6)}</code><CopyBtn text={agentAddr} />
                  <a href={`https://explorer.solana.com/address/${agentAddr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-sky-400"><ExternalLink className="h-3 w-3" /></a>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]"><p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Per TX</p><p className="mt-1 text-sm font-bold text-white">{lamportsToSol(cap.perTxLimit)} SOL</p></div>
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]"><p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Daily ({dailyPct}%)</p><p className="mt-1 text-sm font-bold text-white">{lamportsToSol(cap.dailySpent)} / {lamportsToSol(cap.dailyLimit)}</p><Progress value={dailyPct} className="mt-2 h-1" /></div>
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]"><p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Total ({totalPct}%)</p><p className="mt-1 text-sm font-bold text-white">{lamportsToSol(cap.totalSpent)} / {lamportsToSol(cap.totalLimit)}</p><Progress value={totalPct} className="mt-2 h-1" /></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-600"><span>Uses: {cap.useCount.toString()}</span><span>·</span><span>Slippage: {cap.maxSlippageBps}bps</span><span>·</span><span>Risk: T{cap.riskTier}</span><span>·</span><span>Expires: {expiresAt.toLocaleDateString()}</span></div>
                {cap.status !== "Revoked" && (
                  <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-4">
                    {!cap.isFrozen && cap.status === "Active" && <Button variant="outline" size="sm" className="gap-1.5 border-sky-500/20 text-sky-400 hover:bg-sky-500/10" onClick={() => doAction("freeze", cap)} disabled={!!actionLoading}>{isActLoading("freeze") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Snowflake className="h-3.5 w-3.5" />} Freeze</Button>}
                    {cap.isFrozen && <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => doAction("unfreeze", cap)} disabled={!!actionLoading}>{isActLoading("unfreeze") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />} Unfreeze</Button>}
                    <Button variant="outline" size="sm" className="gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => doAction("revoke", cap)} disabled={!!actionLoading}>{isActLoading("revoke") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revoke</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
      {error && <Card className="border-red-500/20 bg-red-500/5"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p></CardContent></Card>}
    </motion.div>
  );
}
