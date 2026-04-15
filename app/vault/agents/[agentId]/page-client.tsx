"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useAgent } from "@/lib/hooks/use-agent";
import { useAgentCapabilities } from "@/lib/hooks/use-agent-capabilities";
import { useAgentReceipts } from "@/lib/hooks/use-agent-receipts";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId, DISCRIMINATORS } from "@/lib/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Bot, ArrowLeft, Copy, CheckCircle2, ExternalLink, RefreshCw, PauseCircle, PlayCircle, Trash2, Snowflake, Flame,
  Shield, Receipt, Activity, AlertTriangle, Clock, Wallet, Zap, FileText, StickyNote, ChevronDown, ChevronUp,
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); toast.success("Copied!"); setTimeout(() => setOk(false), 1200); }}
      className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const ACTION_ICONS: Record<number, typeof Activity> = {
  0: Wallet, 1: Zap, 2: Shield, 3: Shield, 4: Bot, 5: FileText, 6: Receipt, 7: StickyNote,
};

const ACTION_COLORS: Record<number, string> = {
  0: "text-sky-400 bg-sky-500/10", 1: "text-amber-400 bg-amber-500/10", 2: "text-violet-400 bg-violet-500/10",
  3: "text-violet-400 bg-violet-500/10", 4: "text-emerald-400 bg-emerald-500/10", 5: "text-rose-400 bg-rose-500/10",
  6: "text-teal-400 bg-teal-500/10", 7: "text-neutral-400 bg-neutral-500/10",
};

const SCOPE_LABELS: Record<string, string> = {
  payment: "Payment", data: "DataAction", document: "DocumentSign", custom: "Custom",
};

const SCOPE_BITMASK: Record<string, bigint> = {
  payment: BigInt(1),      // bit 0 -> HumanPay
  data: BigInt(2),         // bit 1 -> DataBlink
  document: BigInt(4),     // bit 2 -> Document Registry
  custom: BigInt("0xFFFFFFFFFFFFFFFF"),
};

function buildScopeBitmask(programIds: string[]): bigint {
  let mask = BigInt(0);
  for (const id of programIds) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    // Known program mapping
    if (trimmed === "HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9") mask |= BigInt(1);
    else if (trimmed === "GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX") mask |= BigInt(2);
    else if (trimmed === "8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28") mask |= BigInt(4);
    else {
      // Unknown program - we can't encode it precisely in the u64 bitmask,
      // but we set the highest bit as a catch-all for custom programs
      mask |= BigInt("0x8000000000000000");
    }
  }
  return mask === BigInt(0) ? BigInt("0xFFFFFFFFFFFFFFFF") : mask;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const agentIdParam = Array.isArray(params.agentId) ? params.agentId[0] : params.agentId;

  const agentPda = useMemo(() => {
    try {
      return agentIdParam ? new PublicKey(agentIdParam) : null;
    } catch {
      return null;
    }
  }, [agentIdParam]);

  const { agent, loading: agentLoading, error: agentError, refetch: refetchAgent } = useAgent(agentPda);
  const {
    capabilities, loading: capsLoading, error: capsError, refetch: refetchCaps,
    issueCapability, emergencyFreeze, unfreeze, revokeCapability,
  } = useAgentCapabilities(agentPda);
  const { receipts, loading: receiptsLoading, error: receiptsError, refetch: refetchReceipts, getActionTypeName } = useAgentReceipts(agentPda);

  const isPrincipal = !!publicKey && !!agent && agent.ownerPrincipal.equals(publicKey);
  const isFrozen = capabilities.some((c) => c.isFrozen);

  // Action handlers
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const runAgentTx = async (discriminator: Buffer, label: string) => {
    if (!publicKey || !agentPda || !connection) throw new Error("Wallet not connected");
    const programId = getProgramId(cluster, "agentRegistry");
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
        ],
        programId,
        data: discriminator,
      })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, "confirmed");
    await refetchAgent();
    return sig;
  };

  const handleSuspend = async () => {
    setActionLoading("suspend");
    try {
      const sig = await runAgentTx(DISCRIMINATORS.suspendAgent, "suspend");
      toast.success("Agent suspended", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
    } catch (err) {
      toast.error("Failed to suspend agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      const sig = await runAgentTx(DISCRIMINATORS.reactivateAgent, "reactivate");
      toast.success("Agent reactivated", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
    } catch (err) {
      toast.error("Failed to reactivate agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    setActionLoading("revoke");
    try {
      const sig = await runAgentTx(DISCRIMINATORS.revokeAgent, "revoke");
      toast.success("Agent revoked", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
      setRevokeDialogOpen(false);
    } catch (err) {
      toast.error("Failed to revoke agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreezeToggle = async () => {
    if (!isPrincipal || !agentPda) return;
    const firstCap = capabilities.find((c) => c.status === "Active" || c.status === "Frozen");
    if (!firstCap) {
      toast.error("No capabilities available", { description: "Emergency freeze requires at least one capability." });
      return;
    }
    setActionLoading("freeze-toggle");
    try {
      let sig: string;
      if (isFrozen) {
        sig = await unfreeze(firstCap.pda);
        toast.success("Agent unfrozen", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
      } else {
        sig = await emergencyFreeze(firstCap.pda);
        toast.success("Agent frozen", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
      }
    } catch (err) {
      toast.error(isFrozen ? "Failed to unfreeze agent" : "Failed to freeze agent", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(null);
    }
  };

  // Issue capability form state
  const [issueForm, setIssueForm] = useState({
    scope: "custom",
    perTxLimit: "0.1",
    dailyLimit: "1",
    totalLimit: "10",
    expiryDays: "30",
    noExpiry: false,
    allowedPrograms: "",
  });
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    if (!isPrincipal) return;
    const perTx = Math.floor(Number(issueForm.perTxLimit) * 1e9);
    const daily = Math.floor(Number(issueForm.dailyLimit) * 1e9);
    const total = Math.floor(Number(issueForm.totalLimit) * 1e9);
    if (isNaN(perTx) || isNaN(daily) || isNaN(total)) {
      toast.error("Invalid amounts");
      return;
    }

    let allowedProgramsMask: bigint;
    if (issueForm.allowedPrograms.trim()) {
      allowedProgramsMask = buildScopeBitmask(issueForm.allowedPrograms.split(/[\n,]+/));
    } else {
      allowedProgramsMask = SCOPE_BITMASK[issueForm.scope] || BigInt("0xFFFFFFFFFFFFFFFF");
    }

    const validitySeconds = issueForm.noExpiry ? BigInt(365 * 86400 * 10) : Number(issueForm.expiryDays) * 86400;

    setIssuing(true);
    try {
      // Custom issue that allows setting allowedProgramsMask
      if (!publicKey || !connection || !agentPda) throw new Error("Not ready");
      const programId = getProgramId(cluster, "delegation");
      const nonce = BigInt(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      nonceBuffer.writeBigUInt64LE(nonce);

      const { deriveCapabilityPda } = await import("@/lib/programs");
      const [capabilityPda] = deriveCapabilityPda(publicKey, agentPda, nonce, cluster);

      const allowedProgramsBuf = Buffer.alloc(8);
      allowedProgramsBuf.writeBigUInt64LE(allowedProgramsMask);

      const allowedAssetsBuf = Buffer.alloc(8);
      allowedAssetsBuf.fill(0xFF);

      const perTxLimitBuf = Buffer.alloc(8);
      perTxLimitBuf.writeBigUInt64LE(BigInt(perTx));

      const dailyLimitBuf = Buffer.alloc(8);
      dailyLimitBuf.writeBigUInt64LE(BigInt(daily));

      const totalLimitBuf = Buffer.alloc(8);
      totalLimitBuf.writeBigUInt64LE(BigInt(total));

      const maxSlippageBuf = Buffer.alloc(2);
      maxSlippageBuf.writeUInt16LE(500);

      const maxFeeBuf = Buffer.alloc(8);
      maxFeeBuf.writeBigUInt64LE(BigInt(10000000));

      const validityBuf = Buffer.alloc(8);
      validityBuf.writeBigInt64LE(BigInt(validitySeconds));

      const cooldownBuf = Buffer.alloc(4);
      cooldownBuf.writeUInt32LE(0);

      const riskTierBuf = Buffer.from([1]);
      const enforceAllowlistBuf = Buffer.from([0]);
      const allowlistBuf = Buffer.alloc(4);

      const paramsData = Buffer.concat([
        allowedProgramsBuf, allowedAssetsBuf, perTxLimitBuf, dailyLimitBuf, totalLimitBuf,
        maxSlippageBuf, maxFeeBuf, validityBuf, cooldownBuf, riskTierBuf, enforceAllowlistBuf, allowlistBuf, nonceBuffer,
      ]);

      const tx = new Transaction().add(
        new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: agentPda, isSigner: false, isWritable: false },
            { pubkey: capabilityPda, isSigner: false, isWritable: true },
            { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
          ],
          programId,
          data: Buffer.concat([DISCRIMINATORS.issueCapability, paramsData]),
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      await refetchCaps();
      toast.success("Capability issued", { action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=${cluster}`, "_blank") } });
      setIssueDialogOpen(false);
    } catch (err) {
      toast.error("Failed to issue capability", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIssuing(false);
    }
  };

  // Analytics data
  const spendOverTime = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
    }
    for (const r of receipts) {
      const d = new Date(r.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (days[d] !== undefined) {
        days[d] += Number(r.value) / 1e9;
      }
    }
    let cumulative = 0;
    return Object.entries(days).map(([date, value]) => {
      cumulative += value;
      return { date, value: cumulative };
    });
  }, [receipts]);

  const spendByCapability = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of receipts) {
      const cap = r.capabilityId.toBase58();
      map[cap] = (map[cap] || 0) + Number(r.value) / 1e9;
    }
    return Object.entries(map).map(([cap, value]) => ({
      name: capabilities.find((c) => c.pda.toBase58() === cap)?.pda.toBase58().slice(0, 8) + "…" || "Unknown",
      value,
    }));
  }, [receipts, capabilities]);

  if (!agentPda) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-10 w-10 text-red-500" />
        <h2 className="text-xl font-bold text-white">Invalid Agent ID</h2>
        <p className="text-sm text-neutral-500">The provided agent ID is not a valid Solana address.</p>
        <Button onClick={() => router.push("/vault/agents")} className="mt-4">Back to Agents</Button>
      </div>
    );
  }

  const addr = agentPda.toBase58();
  const principalAddr = agent?.ownerPrincipal.toBase58() || "";

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Back + Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vault/agents")} className="text-neutral-500 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </motion.div>

      {/* Agent Header Card */}
      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="p-5">
            {agentLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48 bg-neutral-900" />
                <Skeleton className="h-4 w-32 bg-neutral-900" />
              </div>
            ) : agentError || !agent ? (
              <div className="text-center">
                <p className="text-red-400">{agentError || "Agent not found"}</p>
                <Button onClick={refetchAgent} className="mt-4">Retry</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
                    <Bot className="h-7 w-7 text-sky-500" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-white">{agent.name || "Unnamed Agent"}</h1>
                      <Badge variant="outline" className={
                        agent.status === "Active"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : agent.status === "Suspended"
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                          : "border-red-500/20 bg-red-500/5 text-red-400"
                      }>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          agent.status === "Active" ? "bg-emerald-400" : agent.status === "Suspended" ? "bg-amber-400" : "bg-red-400"
                        }`} />
                        {agent.status}
                      </Badge>
                      {isFrozen && (
                        <Badge variant="outline" className="border-sky-500/20 bg-sky-500/5 text-sky-400">
                          <Snowflake className="mr-1 h-3 w-3" /> Frozen
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1"><code className="text-neutral-400">{addr.slice(0, 8)}…{addr.slice(-6)}</code><CopyBtn text={addr} /></span>
                      <span>·</span>
                      <span>Created {new Date(agent.createdAt * 1000).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>Principal: <code className="text-neutral-400">{principalAddr.slice(0, 6)}…{principalAddr.slice(-4)}</code></span>
                    </div>
                  </div>
                </div>

                {isPrincipal && (
                  <div className="flex flex-wrap gap-2">
                    {agent.status === "Active" && (
                      <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                        onClick={handleSuspend} disabled={!!actionLoading}>
                        {actionLoading === "suspend" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />} Suspend
                      </Button>
                    )}
                    {agent.status === "Suspended" && (
                      <Button variant="outline" size="sm" className="gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={handleReactivate} disabled={!!actionLoading}>
                        {actionLoading === "reactivate" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} Reactivate
                      </Button>
                    )}
                    {agent.status !== "Revoked" && (
                      <Button variant="outline" size="sm" className="gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => setRevokeDialogOpen(true)} disabled={!!actionLoading}>
                        {actionLoading === "revoke" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revoke
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className={`gap-1.5 ${isFrozen ? "border-sky-500/20 text-sky-400 hover:bg-sky-500/10" : "bg-red-600 hover:bg-red-700 text-white"}`}
                      variant={isFrozen ? "outline" : "default"}
                      onClick={handleFreezeToggle}
                      disabled={!!actionLoading || capabilities.length === 0}
                    >
                      {actionLoading === "freeze-toggle" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isFrozen ? <Flame className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                      {isFrozen ? "Unfreeze Agent" : "Emergency Freeze"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {!isPrincipal && agent && (
        <motion.div variants={fadeUp}>
          <Card className="border-amber-500/15 bg-amber-500/[0.02]">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-200">You are not the principal of this agent. Management actions are disabled.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="capabilities" className="w-full">
          <TabsList className="bg-neutral-900 text-neutral-500">
            <TabsTrigger value="capabilities" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white"><Shield className="mr-1.5 h-4 w-4" /> Capabilities</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white"><Receipt className="mr-1.5 h-4 w-4" /> Activity</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white"><Activity className="mr-1.5 h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Capabilities</h2>
              {isPrincipal && (
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setIssueDialogOpen(true)}>
                  <Shield className="h-4 w-4" /> Issue New Capability
                </Button>
              )}
            </div>

            {capsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-neutral-900" />)}</div>
            ) : capabilities.length === 0 ? (
              <Card className="border-white/[0.04] bg-white/[0.015]">
                <CardContent className="flex flex-col items-center py-14 text-center">
                  <Shield className="mb-4 h-12 w-12 text-neutral-700" />
                  <p className="text-sm font-medium text-neutral-400">No capabilities issued</p>
                  <p className="mt-1 text-xs text-neutral-600">Issue a capability to grant this agent spending limits.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {capabilities.map((cap) => (
                  <CapabilityCard key={cap.pda.toBase58()} cap={cap} cluster={cluster} isPrincipal={isPrincipal}
                    onFreeze={async () => { setActionLoading(`freeze-${cap.pda.toBase58()}`); try { await emergencyFreeze(cap.pda); toast.success("Frozen"); } catch (err) { toast.error("Freeze failed", { description: err instanceof Error ? err.message : "" }); } finally { setActionLoading(null); } }}
                    onUnfreeze={async () => { setActionLoading(`unfreeze-${cap.pda.toBase58()}`); try { await unfreeze(cap.pda); toast.success("Unfrozen"); } catch (err) { toast.error("Unfreeze failed", { description: err instanceof Error ? err.message : "" }); } finally { setActionLoading(null); } }}
                    onRevoke={async () => { setActionLoading(`revoke-${cap.pda.toBase58()}`); try { await revokeCapability(cap.pda); toast.success("Revoked"); } catch (err) { toast.error("Revoke failed", { description: err instanceof Error ? err.message : "" }); } finally { setActionLoading(null); } }}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Activity Timeline</h2>
              <Button variant="ghost" size="sm" onClick={refetchReceipts} disabled={receiptsLoading} className="text-neutral-500">
                <RefreshCw className={`h-4 w-4 ${receiptsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {receiptsLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-neutral-900" />)}</div>
            ) : receipts.length === 0 ? (
              <Card className="border-white/[0.04] bg-white/[0.015]">
                <CardContent className="flex flex-col items-center py-14 text-center">
                  <Receipt className="mb-4 h-12 w-12 text-neutral-700" />
                  <p className="text-sm text-neutral-500">No activity yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {receipts.map((receipt) => {
                  const actionLabel = getActionTypeName(receipt.actionType);
                  const ActionIcon = ACTION_ICONS[receipt.actionType] || Activity;
                  const actionColor = ACTION_COLORS[receipt.actionType] || ACTION_COLORS[7];
                  const valueSol = receipt.value ? (Number(receipt.value) / 1e9).toFixed(4) : "0";
                  const pdaAddr = receipt.pda.toBase58();
                  return (
                    <Card key={pdaAddr} className="border-white/[0.04] bg-white/[0.015]">
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${actionColor}`}>
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{actionLabel}</span>
                            {receipt.value > BigInt(0) && (
                              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">{valueSol} SOL</Badge>
                            )}
                          </div>
                          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
                            <div><span className="text-neutral-500">Capability:</span> <code className="text-neutral-400">{receipt.capabilityId.toBase58().slice(0, 8)}…</code></div>
                            <div><span className="text-neutral-500">Time:</span> <span className="text-neutral-400">{new Date(receipt.timestamp * 1000).toLocaleString()}</span></div>
                            <div><span className="text-neutral-500">Destination:</span> <code className="text-neutral-400">{receipt.destination.toBase58().slice(0, 8)}…</code></div>
                            <div><span className="text-neutral-500">Slot:</span> <span className="text-neutral-400">{receipt.slot.toString()}</span></div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <CopyBtn text={pdaAddr} />
                          <a href={`https://explorer.solana.com/address/${pdaAddr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-emerald-500"><ExternalLink className="h-4 w-4" /></a>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4 space-y-6">
            {/* Spend over time */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Spend Over Time (30 days)</h3>
                <div className="h-64 w-full">
                  {spendOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spendOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#171717", border: "1px solid #333" }} itemStyle={{ color: "#fff" }} />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-500">No spend data in the last 30 days</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Spend by capability */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Spend by Capability</h3>
                <div className="h-56 w-full">
                  {spendByCapability.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendByCapability}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#171717", border: "1px solid #333" }} itemStyle={{ color: "#fff" }} />
                        <Bar dataKey="value">
                          {spendByCapability.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e"][i % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-500">No capability spend data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Limit utilization */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Limit Utilization</h3>
                <div className="space-y-4">
                  {capabilities.length === 0 && <p className="text-sm text-neutral-500">No capabilities to display.</p>}
                  {capabilities.filter((c) => c.status === "Active").map((cap) => {
                    const totalPct = cap.totalLimit > BigInt(0) ? Math.min(Number(cap.totalSpent * BigInt(100) / cap.totalLimit), 100) : 0;
                    const color = totalPct < 50 ? "bg-emerald-500" : totalPct < 80 ? "bg-amber-500" : "bg-red-500";
                    const warn = totalPct > 90 || (cap.expiresAt * 1000 - Date.now() < 86400000 && cap.expiresAt > 0);
                    return (
                      <div key={cap.pda.toBase58()} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-300">{cap.pda.toBase58().slice(0, 8)}…</span>
                          <span className="text-neutral-500">{(Number(cap.totalSpent) / 1e9).toFixed(4)} / {(Number(cap.totalLimit) / 1e9).toFixed(4)} SOL</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-800">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${totalPct}%` }} />
                        </div>
                        {warn && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {totalPct > 90 ? "Budget nearly exhausted" : "Expiring within 24 hours"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="border-neutral-800 bg-neutral-950">
          <DialogHeader>
            <DialogTitle>Revoke Agent</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone. The agent will no longer be able to perform any actions.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
            <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={handleRevoke} disabled={actionLoading === "revoke"}>
              {actionLoading === "revoke" ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Revoke Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Capability Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="border-neutral-800 bg-neutral-950 max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue New Capability</DialogTitle>
            <DialogDescription>Grant spending limits and permissions to this agent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Scope</Label>
              <select value={issueForm.scope} onChange={(e) => setIssueForm({ ...issueForm, scope: e.target.value })}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white">
                <option value="payment">Payment</option>
                <option value="data">DataAction</option>
                <option value="document">DocumentSign</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Per-TX Limit (SOL)</Label>
                <Input type="number" min={0} step={0.01} value={issueForm.perTxLimit} onChange={(e) => setIssueForm({ ...issueForm, perTxLimit: e.target.value })} className="border-neutral-800 bg-neutral-900" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Daily Limit (SOL)</Label>
                <Input type="number" min={0} step={0.01} value={issueForm.dailyLimit} onChange={(e) => setIssueForm({ ...issueForm, dailyLimit: e.target.value })} className="border-neutral-800 bg-neutral-900" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Limit (SOL)</Label>
                <Input type="number" min={0} step={0.01} value={issueForm.totalLimit} onChange={(e) => setIssueForm({ ...issueForm, totalLimit: e.target.value })} className="border-neutral-800 bg-neutral-900" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Expiry</Label>
                <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <input type="checkbox" checked={issueForm.noExpiry} onChange={(e) => setIssueForm({ ...issueForm, noExpiry: e.target.checked })} className="rounded border-neutral-700 bg-neutral-900" />
                  No expiry
                </label>
              </div>
              {!issueForm.noExpiry && (
                <Input type="date" value={issueForm.expiryDays} onChange={(e) => setIssueForm({ ...issueForm, expiryDays: e.target.value })} className="border-neutral-800 bg-neutral-900" />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Allowed Programs (optional)</Label>
              <textarea value={issueForm.allowedPrograms} onChange={(e) => setIssueForm({ ...issueForm, allowedPrograms: e.target.value })}
                placeholder="Paste program pubkeys, one per line or comma-separated"
                className="min-h-[80px] w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-700" />
              <p className="text-[10px] text-neutral-500">Leave empty to allow all HumanRail programs. Unknown programs will be mapped to a custom bit.</p>
            </div>
            <Button onClick={handleIssue} disabled={issuing} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
              {issuing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} {issuing ? "Issuing…" : "Issue Capability"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function CapabilityCard({
  cap, cluster, isPrincipal, onFreeze, onUnfreeze, onRevoke, actionLoading,
}: {
  cap: import("@/lib/hooks/use-agent-capabilities").CapabilityWithPda;
  cluster: string;
  isPrincipal: boolean;
  onFreeze: () => Promise<void>;
  onUnfreeze: () => Promise<void>;
  onRevoke: () => Promise<void>;
  actionLoading: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const addr = cap.pda.toBase58();
  const dailyPct = cap.dailyLimit > BigInt(0) ? Math.min(Number(cap.dailySpent * BigInt(100) / cap.dailyLimit), 100) : 0;
  const totalPct = cap.totalLimit > BigInt(0) ? Math.min(Number(cap.totalSpent * BigInt(100) / cap.totalLimit), 100) : 0;
  const expiresAt = new Date(cap.expiresAt * 1000);
  const isExpired = cap.expiresAt > 0 && expiresAt.getTime() < Date.now();
  const isLoading = (k: string) => actionLoading === `${k}-${addr}`;

  const scopeLabel =
    cap.allowedPrograms === BigInt("0xFFFFFFFFFFFFFFFF") ? "Full Access"
    : cap.allowedPrograms === BigInt(1) ? "Payment"
    : cap.allowedPrograms === BigInt(2) ? "DataAction"
    : cap.allowedPrograms === BigInt(4) ? "DocumentSign"
    : cap.allowedPrograms === BigInt(7) ? "Payment + Data + Document"
    : "Custom";

  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Shield className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{scopeLabel}</span>
                <Badge variant="outline" className={
                  cap.status === "Active" && !cap.isFrozen
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                    : cap.isFrozen
                    ? "border-sky-500/20 bg-sky-500/5 text-sky-400"
                    : "border-red-500/20 bg-red-500/5 text-red-400"
                }>
                  {cap.isFrozen ? "Frozen" : cap.status}
                </Badge>
                {isExpired && <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-400">Expired</Badge>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                <code className="text-neutral-400">{addr.slice(0, 8)}…{addr.slice(-6)}</code>
                <CopyBtn text={addr} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-white" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Details
            </Button>
            {isPrincipal && cap.status !== "Revoked" && (
              <>
                {!cap.isFrozen && cap.status === "Active" && (
                  <Button variant="outline" size="sm" className="h-8 gap-1 border-sky-500/20 text-sky-400 hover:bg-sky-500/10" onClick={onFreeze} disabled={!!actionLoading}>
                    {isLoading("freeze") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Snowflake className="h-3.5 w-3.5" />} Freeze
                  </Button>
                )}
                {cap.isFrozen && (
                  <Button variant="outline" size="sm" className="h-8 gap-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={onUnfreeze} disabled={!!actionLoading}>
                    {isLoading("unfreeze") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />} Unfreeze
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 gap-1 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={onRevoke} disabled={!!actionLoading}>
                  {isLoading("revoke") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revoke
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Per TX</p>
            <p className="mt-1 text-sm font-bold text-white">{(Number(cap.perTxLimit) / 1e9).toFixed(4)} SOL</p>
          </div>
          <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Daily ({dailyPct}%)</p>
            <p className="mt-1 text-sm font-bold text-white">{(Number(cap.dailySpent) / 1e9).toFixed(4)} / {(Number(cap.dailyLimit) / 1e9).toFixed(4)}</p>
            <Progress value={dailyPct} className="mt-2 h-1" />
          </div>
          <div className="rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Total ({totalPct}%)</p>
            <p className="mt-1 text-sm font-bold text-white">{(Number(cap.totalSpent) / 1e9).toFixed(4)} / {(Number(cap.totalLimit) / 1e9).toFixed(4)}</p>
            <Progress value={totalPct} className="mt-2 h-1" />
          </div>
        </div>

        {expanded && (
          <div className="mt-3 rounded-lg bg-neutral-900/30 p-3 text-[11px] text-neutral-400 ring-1 ring-white/[0.03]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><span className="text-neutral-500">Allowed Programs Mask:</span> {cap.allowedPrograms.toString(16)}</div>
              <div><span className="text-neutral-500">Allowed Assets Mask:</span> {cap.allowedAssets.toString(16)}</div>
              <div><span className="text-neutral-500">Max Slippage:</span> {cap.maxSlippageBps} bps</div>
              <div><span className="text-neutral-500">Max Fee:</span> {(Number(cap.maxFee) / 1e9).toFixed(4)} SOL</div>
              <div><span className="text-neutral-500">Risk Tier:</span> T{cap.riskTier}</div>
              <div><span className="text-neutral-500">Cooldown:</span> {cap.cooldownSeconds}s</div>
              <div><span className="text-neutral-500">Use Count:</span> {cap.useCount.toString()}</div>
              <div><span className="text-neutral-500">Expires:</span> {cap.expiresAt > 0 ? expiresAt.toLocaleString() : "Never"}</div>
              <div><span className="text-neutral-500">Enforce Allowlist:</span> {cap.enforceAllowlist ? "Yes" : "No"}</div>
              <div><span className="text-neutral-500">Issued:</span> {new Date(cap.issuedAt * 1000).toLocaleString()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
