"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId, parseAgentProfile, parseCapability, parseHumanProfile,
  deriveHumanProfilePda, AgentProfile, Capability,
} from "@/lib/programs";
import {
  Bot, Shield, Wallet, Activity, ExternalLink, Copy, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CapabilityWithPubkey extends Capability {
  pubkey: PublicKey;
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

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
  0: Wallet, 1: Activity, 2: Shield, 3: Shield, 4: Bot, 5: Wallet, 6: Wallet, 7: Activity,
};

const ACTION_COLORS: Record<number, string> = {
  0: "text-sky-400 bg-sky-500/10", 1: "text-amber-400 bg-amber-500/10", 2: "text-violet-400 bg-violet-500/10",
  3: "text-violet-400 bg-violet-500/10", 4: "text-emerald-400 bg-emerald-500/10", 5: "text-rose-400 bg-rose-500/10",
  6: "text-teal-400 bg-teal-500/10", 7: "text-neutral-400 bg-neutral-500/10",
};

const ACTION_TYPE_NAMES: Record<number, string> = {
  0: "Transfer", 1: "Swap", 2: "Stake", 3: "Unstoke", 4: "Task Response", 5: "Document Sign", 6: "Payment", 7: "Custom",
};

function getActionTypeName(actionType: number): string {
  return ACTION_TYPE_NAMES[actionType] || `Action #${actionType}`;
}

export default function PublicAgentProfilePage() {
  const params = useParams();
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

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [humanProfile, setHumanProfile] = useState<{ humanScore: number; activeAttestationCount: number } | null>(null);
  const [humanLoading, setHumanLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilityWithPubkey[]>([]);
  const [capsLoading, setCapsLoading] = useState(true);
  const [receipts, setReceipts] = useState<Array<{ actionType: number; value: bigint; timestamp: number; pda: PublicKey }>>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);

  useEffect(() => {
    if (!agentPda || !connection) return;

    const fetchAll = async () => {
      setAgentLoading(true);
      setCapsLoading(true);
      setReceiptsLoading(true);

      try {
        // Agent
        const agentAccount = await connection.getAccountInfo(agentPda);
        if (agentAccount) {
          const parsedAgent = parseAgentProfile(agentAccount.data as Buffer);
          setAgent(parsedAgent);

          // Human profile
          if (parsedAgent) {
            setHumanLoading(true);
            const [humanPda] = deriveHumanProfilePda(parsedAgent.ownerPrincipal, cluster);
            const humanAccount = await connection.getAccountInfo(humanPda);
            if (humanAccount) {
              const parsedHuman = parseHumanProfile(humanAccount.data as Buffer);
              if (parsedHuman) {
                setHumanProfile({ humanScore: parsedHuman.humanScore, activeAttestationCount: parsedHuman.activeAttestationCount });
              }
            }
            setHumanLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch agent:", err);
      } finally {
        setAgentLoading(false);
      }

      try {
        // Capabilities
        const delegationProgram = getProgramId(cluster, "delegation");
        const capAccounts = await connection.getProgramAccounts(delegationProgram, {
          filters: [{ memcmp: { offset: 40, bytes: agentPda.toBase58() } }],
        });
        const parsedCaps = capAccounts
          .map(({ pubkey, account }) => {
            const cap = parseCapability(account.data as Buffer);
            return cap ? { ...cap, pubkey } : null;
          })
          .filter((c): c is CapabilityWithPubkey => c !== null);
        setCapabilities(parsedCaps);
      } catch (err) {
        console.error("Failed to fetch capabilities:", err);
      } finally {
        setCapsLoading(false);
      }

      try {
        // Receipts
        const receiptsProgram = getProgramId(cluster, "receipts");
        const receiptAccounts = await connection.getProgramAccounts(receiptsProgram, {
          filters: [{ memcmp: { offset: 40, bytes: agentPda.toBase58() } }],
        });
        const parsedReceipts = receiptAccounts
          .map(({ pubkey, account }) => {
            const data = account.data as Buffer;
            // Skip discriminator (8) + principal (32) + agent (32) + actionHash (32) + resultHash (32) + actionType (1)
            let offset = 8 + 32 + 32 + 32 + 32 + 1;
            const value = data.readBigUInt64LE(offset);
            offset += 8 + 32; // skip value + destination
            const timestamp = Number(data.readBigInt64LE(offset));
            return { value, timestamp, pda: pubkey, actionType: data[8 + 32 + 32 + 32 + 32] };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);
        setReceipts(parsedReceipts);
      } catch (err) {
        console.error("Failed to fetch receipts:", err);
      } finally {
        setReceiptsLoading(false);
      }
    };

    fetchAll();
  }, [agentPda, connection, cluster]);

  if (!agentPda) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <Navbar />
        <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">Invalid Agent ID</h1>
          <p className="text-neutral-500">The provided agent ID is not a valid Solana address.</p>
        </main>
      </div>
    );
  }

  const addr = agentPda.toBase58();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{agentLoading ? <Skeleton className="h-8 w-48 bg-neutral-900" /> : agent?.name || "Unnamed Agent"}</h1>
                {!agentLoading && agent && (
                  <Badge variant="outline" className={
                    agent.status === "Active"
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                      : agent.status === "Suspended"
                      ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  }>
                    {agent.status}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                <code className="text-neutral-400">{addr.slice(0, 8)}…{addr.slice(-6)}</code>
                <CopyBtn text={addr} />
                <a href={`https://explorer.solana.com/address/${addr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-emerald-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {!agentLoading && !agent && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <p className="text-lg font-medium text-red-200">Agent Not Found</p>
                <p className="text-sm text-red-400/60">No on-chain agent account exists at this address.</p>
              </CardContent>
            </Card>
          )}

          {agent && (
            <>
              {/* Principal & Trust */}
              <Card className="border-white/[0.06] bg-white/[0.02]">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Principal</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Link href={`/human/${agent.ownerPrincipal.toBase58()}`}>
                          <code className="text-sm text-sky-400 hover:underline">{agent.ownerPrincipal.toBase58().slice(0, 8)}…{agent.ownerPrincipal.toBase58().slice(-6)}</code>
                        </Link>
                        <CopyBtn text={agent.ownerPrincipal.toBase58()} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Signing Key</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="text-sm text-neutral-400">{agent.signingKey.toBase58().slice(0, 8)}…{agent.signingKey.toBase58().slice(-6)}</code>
                        <CopyBtn text={agent.signingKey.toBase58()} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Registered</p>
                      <p className="mt-1 text-sm text-white">{new Date(agent.createdAt * 1000).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Human Trust Score</p>
                      <p className="mt-1 text-sm text-white">
                        {humanLoading ? "—" : humanProfile ? `${humanProfile.humanScore} / 100` : "Not available"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Capabilities */}
              <div className="space-y-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Active Capabilities</h2>
                {capsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-neutral-900" />)}
                  </div>
                ) : capabilities.length === 0 ? (
                  <Card className="border-white/[0.04] bg-white/[0.015]">
                    <CardContent className="py-8 text-center text-sm text-neutral-500">No capabilities issued to this agent</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {capabilities.map((cap) => {
                      const scopeLabel =
                        cap.allowedPrograms === BigInt("0xFFFFFFFFFFFFFFFF") ? "Full Access"
                        : cap.allowedPrograms === BigInt(1) ? "Payment"
                        : cap.allowedPrograms === BigInt(2) ? "DataAction"
                        : cap.allowedPrograms === BigInt(4) ? "DocumentSign"
                        : cap.allowedPrograms === BigInt(7) ? "Payment + Data + Document"
                        : "Custom";
                      return (
                        <Card key={cap.pubkey.toBase58()} className="border-white/[0.06] bg-white/[0.02]">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{scopeLabel}</p>
                                <p className="text-xs text-neutral-500">
                                  Per-tx: {(Number(cap.perTxLimit) / 1e9).toFixed(4)} SOL · Daily: {(Number(cap.dailyLimit) / 1e9).toFixed(4)} SOL · Total: {(Number(cap.totalLimit) / 1e9).toFixed(4)} SOL
                                </p>
                              </div>
                              <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-xs text-violet-400">
                                {cap.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-neutral-500">
                              Expires: {cap.expiresAt > 0 ? new Date(cap.expiresAt * 1000).toLocaleDateString() : "Never"} · Risk Tier: T{cap.riskTier}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="space-y-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Recent Public Activity</h2>
                {receiptsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />)}
                  </div>
                ) : receipts.length === 0 ? (
                  <Card className="border-white/[0.04] bg-white/[0.015]">
                    <CardContent className="py-8 text-center text-sm text-neutral-500">No recent activity</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => {
                      const actionLabel = getActionTypeName(receipt.actionType);
                      const ActionIcon = ACTION_ICONS[receipt.actionType] || Activity;
                      const actionColor = ACTION_COLORS[receipt.actionType] || ACTION_COLORS[7];
                      const valueSol = receipt.value ? (Number(receipt.value) / 1e9).toFixed(4) : "0";
                      return (
                        <Card key={receipt.pda.toBase58()} className="border-white/[0.04] bg-white/[0.015]">
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${actionColor}`}>
                              <ActionIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-white">{actionLabel}</span>
                                {receipt.value > BigInt(0) && (
                                  <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">{valueSol} SOL</Badge>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500">{new Date(receipt.timestamp * 1000).toLocaleString()}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <CopyBtn text={receipt.pda.toBase58()} />
                              <a href={`https://explorer.solana.com/address/${receipt.pda.toBase58()}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-emerald-500">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
