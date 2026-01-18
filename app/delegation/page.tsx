"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCluster } from "@/lib/solana/cluster-context";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useAgents } from "@/lib/hooks/use-agents";
import {
  Shield,
  Plus,
  RefreshCw,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  Flame,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function DelegationDashboard() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const {
    capabilities,
    loading,
    error,
    refetch,
    issueCapability,
    emergencyFreeze,
    unfreeze,
    revokeCapability,
  } = useCapabilities();
  const { agents } = useAgents();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState("");
  const [perTxLimit, setPerTxLimit] = useState("0.1");
  const [dailyLimit, setDailyLimit] = useState("1");
  const [totalBudget, setTotalBudget] = useState("10");
  const [validityDays, setValidityDays] = useState("30");

  const handleIssueCapability = async () => {
    if (!selectedAgent) return;
    setCreating(true);
    try {
      const agentPubkey = new PublicKey(selectedAgent);
      const signature = await issueCapability({
        agent: agentPubkey,
        perTxLimit: Math.floor(parseFloat(perTxLimit) * 1e9),
        dailyLimit: Math.floor(parseFloat(dailyLimit) * 1e9),
        totalLimit: Math.floor(parseFloat(totalBudget) * 1e9),
        validitySeconds: parseInt(validityDays) * 86400,
      });
      toast.success("Capability issued!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });
      setDialogOpen(false);
      setSelectedAgent("");
    } catch (err) {
      toast.error("Failed to issue capability", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreating(false);
    }
  };

  const handleFreeze = async (capPda: string, agentPda: PublicKey) => {
    setActionLoading(capPda);
    try {
      const signature = await emergencyFreeze(new PublicKey(capPda), agentPda);
      toast.success("Capability frozen!", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to freeze", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfreeze = async (agentPda: PublicKey) => {
    setActionLoading(agentPda.toBase58());
    try {
      const signature = await unfreeze(agentPda);
      toast.success("Capability unfrozen!", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to unfreeze", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (capPda: string) => {
    setActionLoading(capPda);
    try {
      const signature = await revokeCapability(new PublicKey(capPda));
      toast.success("Capability revoked!", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to revoke", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (cap: { isFrozen: boolean; expiresAt: number }) => {
    const now = Date.now() / 1000;
    if (cap.isFrozen) return <Badge className="bg-blue-600"><Snowflake className="mr-1 h-3 w-3" />Frozen</Badge>;
    if (cap.expiresAt && cap.expiresAt < now) return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Expired</Badge>;
    return <Badge className="bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>;
  };

  const formatSOL = (lamports: bigint) => (Number(lamports) / 1e9).toFixed(4);
  const getUsagePercent = (used: bigint, limit: bigint) => (limit === BigInt(0) ? 0 : Math.min(Number((used * BigInt(100)) / limit), 100));
  const formatDate = (ts: number) => (ts ? new Date(ts * 1000).toLocaleDateString() : "Never");

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Delegation Dashboard</h1>
              <p className="mt-1 text-neutral-400">Manage capability tokens for your AI agents</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={!connected || agents.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />Issue Capability
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-neutral-800 bg-neutral-900">
                  <DialogHeader>
                    <DialogTitle>Issue New Capability</DialogTitle>
                    <DialogDescription>Grant scoped permissions to an AI agent with limits</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Agent</Label>
                      <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-sm">
                        <option value="">Select an agent...</option>
                        {agents.filter((a) => a.status === "Active").map((agent) => (
                          <option key={agent.pda.toBase58()} value={agent.pda.toBase58()}>{agent.name || "Unnamed"} ({agent.pda.toBase58().slice(0, 8)}...)</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Per-TX Limit (SOL)</Label><Input type="number" step="0.01" value={perTxLimit} onChange={(e) => setPerTxLimit(e.target.value)} className="border-neutral-700 bg-neutral-800" /></div>
                      <div className="space-y-2"><Label>Daily Limit (SOL)</Label><Input type="number" step="0.1" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="border-neutral-700 bg-neutral-800" /></div>
                      <div className="space-y-2"><Label>Total Budget (SOL)</Label><Input type="number" step="1" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className="border-neutral-700 bg-neutral-800" /></div>
                      <div className="space-y-2"><Label>Validity (Days)</Label><Input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="border-neutral-700 bg-neutral-800" /></div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleIssueCapability} disabled={creating || !selectedAgent} className="bg-purple-600 hover:bg-purple-700">
                      {creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}{creating ? "Issuing..." : "Issue Capability"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Shield className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to manage delegated capabilities</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {connected && loading && <div className="space-y-4"><Skeleton className="h-48 w-full bg-neutral-800" /><Skeleton className="h-48 w-full bg-neutral-800" /></div>}
          {error && <Card className="mb-6 border-red-900 bg-red-950/20"><CardContent className="py-4"><p className="text-red-400">{error}</p></CardContent></Card>}

          {connected && !loading && capabilities.length === 0 && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Shield className="mb-4 h-16 w-16 text-purple-500" />
                <h2 className="mb-2 text-xl font-semibold">No Capabilities Issued</h2>
                <p className="mb-6 text-center text-neutral-400">
                  {agents.length === 0 ? <>Register an agent first. <a href="/agent" className="text-purple-500 underline">Go to Agent Dashboard →</a></> : "Issue capability tokens to allow your AI agents to perform actions with defined limits"}
                </p>
                {agents.length > 0 && <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" />Issue First Capability</Button>}
              </CardContent>
            </Card>
          )}

          {connected && !loading && capabilities.length > 0 && (
            <div className="space-y-4">
              {capabilities.map((cap) => {
                const pdaStr = cap.pda.toBase58();
                const isActionLoading = actionLoading === pdaStr || actionLoading === cap.agent.toBase58();
                const agentInfo = agents.find((a) => a.pda.equals(cap.agent));
                return (
                  <Card key={pdaStr} className="border-neutral-800 bg-neutral-900/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-950"><Shield className="h-6 w-6 text-purple-500" /></div>
                          <div><CardTitle className="text-lg">{agentInfo?.name || "Unknown Agent"}</CardTitle><CardDescription className="font-mono text-xs">Agent: {cap.agent.toBase58().slice(0, 16)}...</CardDescription></div>
                        </div>
                        {getStatusBadge(cap)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 space-y-3">
                        <div><div className="mb-1 flex justify-between text-sm"><span className="text-neutral-400">Daily Budget</span><span>{formatSOL(cap.dailyLimit)} / {formatSOL(cap.dailyLimit)} SOL</span></div><Progress value={100} className="h-2" /></div>
                        <div><div className="mb-1 flex justify-between text-sm"><span className="text-neutral-400">Total Budget</span><span>{formatSOL(cap.totalLimit)} / {formatSOL(cap.totalLimit)} SOL</span></div><Progress value={100} className="h-2" /></div>
                      </div>
                      <div className="mb-4 grid grid-cols-3 gap-4">
                        <div className="rounded-lg bg-neutral-800/50 p-3"><div className="flex items-center gap-2 text-neutral-400"><Wallet className="h-4 w-4" /><span className="text-xs">Per-TX Limit</span></div><p className="mt-1 font-semibold">{formatSOL(cap.perTxLimit)} SOL</p></div>
                        <div className="rounded-lg bg-neutral-800/50 p-3"><div className="flex items-center gap-2 text-neutral-400"><Clock className="h-4 w-4" /><span className="text-xs">Expires</span></div><p className="mt-1 text-sm font-semibold">{formatDate(cap.expiresAt)}</p></div>
                        <div className="rounded-lg bg-neutral-800/50 p-3"><div className="flex items-center gap-2 text-neutral-400"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Status</span></div><p className="mt-1 text-sm font-semibold">{cap.isFrozen ? "Frozen" : "Active"}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!cap.isFrozen && <Button variant="outline" size="sm" onClick={() => handleFreeze(pdaStr, cap.agent)} disabled={isActionLoading}>{isActionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Snowflake className="mr-2 h-4 w-4" />}Emergency Freeze</Button>}
                        {cap.isFrozen && <Button variant="outline" size="sm" onClick={() => handleUnfreeze(cap.agent)} disabled={isActionLoading}>{isActionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}Unfreeze</Button>}
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-400" onClick={() => handleRevoke(pdaStr)} disabled={isActionLoading}><Trash2 className="mr-2 h-4 w-4" />Revoke</Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`https://explorer.solana.com/address/${pdaStr}?cluster=${cluster}`, "_blank")}><ExternalLink className="mr-2 h-4 w-4" />Explorer</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-8 border-purple-900/50 bg-purple-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-purple-400" />
                <div className="text-sm"><p className="font-medium text-purple-400">Capability Delegation</p><p className="mt-1 text-neutral-400">Capabilities define what your AI agents can do. Set per-transaction, daily, and total limits. Use emergency freeze if an agent misbehaves.</p></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
