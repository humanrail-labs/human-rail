"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCluster } from "@/lib/solana/cluster-context";
import { useAgents } from "@/lib/hooks/use-agents";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { Bot, Plus, RefreshCw, Key, Shield, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AgentDashboard() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const { hasProfile } = useHumanProfile();
  const { agents, loading, error, refetch, registerAgent, suspendAgent, reactivateAgent, revokeAgent } = useAgents();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");

  const handleCreateAgent = async () => {
    if (!agentName) return;
    setCreating(true);
    try {
      const signingKeypair = Keypair.generate();
      const signature = await registerAgent(agentName, signingKeypair.publicKey);
      toast.success("Agent registered!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank") },
      });
      toast.info("Agent Signing Key", { description: `Save this key: ${signingKeypair.publicKey.toBase58().slice(0, 20)}...`, duration: 10000 });
      setDialogOpen(false);
      setAgentName("");
    } catch (err) {
      console.error("Failed to register agent:", err);
      toast.error("Failed to register agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (pdaStr: string) => {
    setActionLoading(pdaStr);
    try {
      const agent = agents.find((a) => a.pda.toBase58() === pdaStr);
      if (!agent) return;
      const signature = await suspendAgent(agent.pda);
      toast.success("Agent suspended", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to suspend agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (pdaStr: string) => {
    setActionLoading(pdaStr);
    try {
      const agent = agents.find((a) => a.pda.toBase58() === pdaStr);
      if (!agent) return;
      const signature = await reactivateAgent(agent.pda);
      toast.success("Agent reactivated", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to reactivate agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (pdaStr: string) => {
    setActionLoading(pdaStr);
    try {
      const agent = agents.find((a) => a.pda.toBase58() === pdaStr);
      if (!agent) return;
      const signature = await revokeAgent(agent.pda);
      toast.success("Agent revoked", { description: `TX: ${signature.slice(0, 8)}...` });
    } catch (err) {
      toast.error("Failed to revoke agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: "Active" | "Suspended" | "Revoked") => {
    switch (status) {
      case "Active": return <Badge className="bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>;
      case "Suspended": return <Badge variant="secondary" className="bg-yellow-600"><Pause className="mr-1 h-3 w-3" />Suspended</Badge>;
      case "Revoked": return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Revoked</Badge>;
    }
  };

  const formatDate = (ts: number) => (!ts ? "Never" : new Date(ts * 1000).toLocaleDateString());

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Agent Dashboard</h1>
              <p className="mt-1 text-neutral-400">Register and manage AI agents (KYA - Know Your Agent)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={!connected || !hasProfile}>
                    <Plus className="mr-2 h-4 w-4" />Register Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-neutral-800 bg-neutral-900">
                  <DialogHeader>
                    <DialogTitle>Register New Agent</DialogTitle>
                    <DialogDescription>Create a new AI agent profile linked to your identity</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name</Label>
                      <Input id="name" placeholder="My AI Assistant" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="border-neutral-700 bg-neutral-800" maxLength={32} />
                      <p className="text-xs text-neutral-500">Max 32 characters</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateAgent} disabled={creating || !agentName} className="bg-blue-600 hover:bg-blue-700">
                      {creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                      {creating ? "Registering..." : "Register"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Not Connected */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bot className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to register and manage AI agents</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* No Profile Warning */}
          {connected && !hasProfile && (
            <Card className="mb-6 border-yellow-900/50 bg-yellow-950/20">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Human Profile Required</p>
                    <p className="mt-1 text-neutral-400">You need to create a human profile before registering agents. <a href="/human" className="text-yellow-500 underline">Go to Human Dashboard →</a></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {connected && loading && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full bg-neutral-800" />
              <Skeleton className="h-32 w-full bg-neutral-800" />
            </div>
          )}

          {error && (
            <Card className="mb-6 border-red-900 bg-red-950/20">
              <CardContent className="py-4"><p className="text-red-400">{error}</p></CardContent>
            </Card>
          )}

          {/* No Agents */}
          {connected && !loading && agents.length === 0 && hasProfile && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bot className="mb-4 h-16 w-16 text-blue-500" />
                <h2 className="mb-2 text-xl font-semibold">No Agents Registered</h2>
                <p className="mb-6 text-center text-neutral-400">Register your first AI agent to enable delegated operations<br />with accountability and key rotation support</p>
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />Register Your First Agent
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Agents List */}
          {connected && !loading && agents.length > 0 && (
            <div className="space-y-4">
              {agents.map((agent) => {
                const pdaStr = agent.pda.toBase58();
                const isActionLoading = actionLoading === pdaStr;
                return (
                  <Card key={pdaStr} className="border-neutral-800 bg-neutral-900/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-950">
                            <Bot className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{agent.name || "Unnamed Agent"}</CardTitle>
                            <CardDescription className="font-mono text-xs">{pdaStr.slice(0, 16)}...{pdaStr.slice(-8)}</CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(agent.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-neutral-800/50 p-3">
                          <div className="flex items-center gap-2 text-neutral-400"><Key className="h-4 w-4" /><span className="text-xs">Signing Key</span></div>
                          <p className="mt-1 truncate font-mono text-xs">{agent.signingKey.toBase58().slice(0, 12)}...</p>
                        </div>
                        <div className="rounded-lg bg-neutral-800/50 p-3">
                          <div className="flex items-center gap-2 text-neutral-400"><Shield className="h-4 w-4" /><span className="text-xs">Capabilities</span></div>
                          <p className="mt-1 text-lg font-semibold">{agent.capabilityCount}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-800/50 p-3">
                          <div className="flex items-center gap-2 text-neutral-400"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Actions</span></div>
                          <p className="mt-1 text-lg font-semibold">{agent.actionCount}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-800/50 p-3">
                          <div className="flex items-center gap-2 text-neutral-400"><Key className="h-4 w-4" /><span className="text-xs">Created</span></div>
                          <p className="mt-1 text-sm font-semibold">{formatDate(agent.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {agent.status === "Active" && (
                          <Button variant="outline" size="sm" onClick={() => handleSuspend(pdaStr)} disabled={isActionLoading}>
                            {isActionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}Suspend
                          </Button>
                        )}
                        {agent.status === "Suspended" && (
                          <Button variant="outline" size="sm" onClick={() => handleReactivate(pdaStr)} disabled={isActionLoading}>
                            {isActionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Reactivate
                          </Button>
                        )}
                        {agent.status !== "Revoked" && (
                          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-400" onClick={() => handleRevoke(pdaStr)} disabled={isActionLoading}>
                            <Trash2 className="mr-2 h-4 w-4" />Revoke
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => window.open(`https://explorer.solana.com/address/${pdaStr}?cluster=${cluster}`, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" />Explorer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info Card */}
          <Card className="mt-8 border-blue-900/50 bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 shrink-0 text-blue-400" />
                <div className="text-sm">
                  <p className="font-medium text-blue-400">KYA - Know Your Agent</p>
                  <p className="mt-1 text-neutral-400">Every agent registered on HumanRail is linked to a verified human principal, enabling accountability for AI actions. Agents support key rotation and can be suspended or revoked by their principal.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
