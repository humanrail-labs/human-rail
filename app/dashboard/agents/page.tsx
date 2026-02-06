"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useAgents, type AgentWithPda } from "@/lib/hooks/use-agents";
import { useCluster } from "@/lib/solana/cluster-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bot, Plus, RefreshCw, ExternalLink, Key, Clock, Activity, PauseCircle,
  PlayCircle, Trash2, Copy, CheckCircle2, Wallet, Shield,
} from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (<button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
    className="text-neutral-600 transition-colors hover:text-neutral-400">
    {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
  </button>);
}

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  Active: { badge: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" },
  Suspended: { badge: "border-amber-500/20 bg-amber-500/5 text-amber-400", dot: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]" },
  Revoked: { badge: "border-red-500/20 bg-red-500/5 text-red-400", dot: "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]" },
};

export default function AgentsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { agents, loading, error, refetch, registerAgent, suspendAgent, reactivateAgent, revokeAgent } = useAgents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!agentName.trim()) { toast.error("Agent name is required"); return; }
    setRegistering(true);
    try {
      const sig = await registerAgent(agentName.trim());
      toast.success("Agent registered!", { description: `TX: ${sig.slice(0, 8)}…`,
        action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
      setDialogOpen(false); setAgentName("");
    } catch (err) { toast.error("Failed to register agent", { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setRegistering(false); }
  };

  const handleAction = async (action: "suspend" | "reactivate" | "revoke", agent: AgentWithPda) => {
    const key = `${action}-${agent.pda.toBase58()}`; setActionLoading(key);
    try {
      let sig: string;
      if (action === "suspend") sig = await suspendAgent(agent.pda);
      else if (action === "reactivate") sig = await reactivateAgent(agent.pda);
      else sig = await revokeAgent(agent.pda);
      toast.success(`Agent ${action}d!`, { description: `TX: ${sig.slice(0, 8)}…` });
    } catch (err) { toast.error(`Failed to ${action} agent`, { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setActionLoading(null); }
  };

  if (!connected) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/20"><Bot className="h-8 w-8 text-sky-500" /></div>
      <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a Solana wallet to manage your AI agents.</p>
      <Button onClick={() => setVisible(true)} className="gap-2 bg-sky-600 hover:bg-sky-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
    </motion.div>);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">AI Agents</h2><p className="text-sm text-neutral-500">Register and manage agents linked to your identity</p></div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-neutral-500"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2 bg-sky-600 hover:bg-sky-700"><Plus className="h-4 w-4" /> Register Agent</Button></DialogTrigger>
            <DialogContent className="border-neutral-800 bg-neutral-950">
              <DialogHeader><DialogTitle>Register New Agent</DialogTitle><DialogDescription>Create a new AI agent linked to your human profile. Requires a verified human identity.</DialogDescription></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input id="agent-name" placeholder="e.g. trading-bot-v1" value={agentName} onChange={(e) => setAgentName(e.target.value)} maxLength={32} className="border-neutral-800 bg-neutral-900" />
                  <p className="text-[11px] text-neutral-600">Max 32 characters. Stored on-chain.</p>
                </div>
                <Button onClick={handleRegister} disabled={registering || !agentName.trim()} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
                  {registering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} {registering ? "Registering…" : "Register Agent"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {loading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-neutral-900" />)}</div>}

      {!loading && agents.length === 0 && (
        <motion.div variants={fadeUp}><Card className="border-white/[0.04] bg-white/[0.015]"><CardContent className="flex flex-col items-center py-14 text-center">
          <Bot className="mb-4 h-12 w-12 text-neutral-700" /><p className="text-sm font-medium text-neutral-400">No agents registered</p>
          <p className="mt-1 text-xs text-neutral-600">Register your first AI agent to start delegating capabilities.</p>
        </CardContent></Card></motion.div>
      )}

      {!loading && agents.map((agent) => {
        const s = STATUS_STYLE[agent.status] ?? STATUS_STYLE.Active;
        const addr = agent.pda.toBase58();
        const sigKey = agent.signingKey.toBase58();
        const isLoading = (key: string) => actionLoading === `${key}-${addr}`;
        return (
          <motion.div key={addr} variants={fadeUp}>
            <Card className="border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20"><Bot className="h-5 w-5 text-sky-500" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{agent.name || "Unnamed Agent"}</h3>
                        <Badge variant="outline" className={s.badge}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />{agent.status}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <code className="text-[11px] text-neutral-600">{addr.slice(0, 8)}…{addr.slice(-6)}</code>
                        <CopyBtn text={addr} />
                        <a href={`https://explorer.solana.com/address/${addr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-sky-400"><ExternalLink className="h-3 w-3" /></a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600"><Key className="h-3 w-3" /> Signing Key</div>
                    <div className="mt-1 flex items-center gap-1"><code className="text-[11px] text-neutral-400">{sigKey.slice(0, 8)}…</code><CopyBtn text={sigKey} /></div>
                  </div>
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600"><Shield className="h-3 w-3" /> Capabilities</div>
                    <p className="mt-1 text-sm font-semibold text-white">{agent.capabilityCount}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600"><Activity className="h-3 w-3" /> Actions</div>
                    <p className="mt-1 text-sm font-semibold text-white">{agent.actionCount}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600"><Clock className="h-3 w-3" /> Created</div>
                    <p className="mt-1 text-[12px] font-medium text-neutral-400">{new Date(agent.createdAt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
                {agent.hasTeeMeasurement && <div className="mt-3"><Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-400">TEE Verified</Badge></div>}
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-4">
                  {agent.status === "Active" && <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => handleAction("suspend", agent)} disabled={!!actionLoading}>
                    {isLoading("suspend") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />} Suspend</Button>}
                  {agent.status === "Suspended" && <Button variant="outline" size="sm" className="gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleAction("reactivate", agent)} disabled={!!actionLoading}>
                    {isLoading("reactivate") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} Reactivate</Button>}
                  {agent.status !== "Revoked" && <Button variant="outline" size="sm" className="gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleAction("revoke", agent)} disabled={!!actionLoading}>
                    {isLoading("revoke") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revoke</Button>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
      {error && <Card className="border-red-500/20 bg-red-500/5"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p></CardContent></Card>}
    </motion.div>
  );
}
