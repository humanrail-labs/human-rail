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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId, parseHumanProfile, parseAgentProfile, deriveHumanProfilePda, HumanProfile,
} from "@/lib/programs";
import {
  User, Bot, Copy, CheckCircle2, AlertTriangle, ExternalLink, Award, Fingerprint,
} from "lucide-react";
import { toast } from "sonner";

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

export default function PublicHumanProfilePage() {
  const params = useParams();
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const humanIdParam = Array.isArray(params.humanId) ? params.humanId[0] : params.humanId;

  const humanWallet = useMemo(() => {
    try {
      return humanIdParam ? new PublicKey(humanIdParam) : null;
    } catch {
      return null;
    }
  }, [humanIdParam]);

  const [profile, setProfile] = useState<HumanProfile | null>(null);
  const [profilePda, setProfilePda] = useState<PublicKey | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [agents, setAgents] = useState<Array<{ pda: PublicKey; name: string; status: string }>>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    if (!humanWallet || !connection) return;

    const fetchAll = async () => {
      setProfileLoading(true);
      setAgentsLoading(true);

      try {
        const [pda] = deriveHumanProfilePda(humanWallet, cluster);
        setProfilePda(pda);
        const account = await connection.getAccountInfo(pda);
        if (account) {
          const parsed = parseHumanProfile(account.data as Buffer);
          setProfile(parsed);
        }
      } catch (err) {
        console.error("Failed to fetch human profile:", err);
      } finally {
        setProfileLoading(false);
      }

      try {
        const programId = getProgramId(cluster, "agentRegistry");
        const accounts = await connection.getProgramAccounts(programId, {
          filters: [{ memcmp: { offset: 8, bytes: humanWallet.toBase58() } }],
        });
        const parsedAgents = accounts
          .map(({ pubkey, account }) => {
            const parsed = parseAgentProfile(account.data as Buffer);
            if (!parsed) return null;
            return { pda: pubkey, name: parsed.name, status: parsed.status };
          })
          .filter((a): a is NonNullable<typeof a> => a !== null)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setAgents(parsedAgents);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAll();
  }, [humanWallet, connection, cluster]);

  if (!humanWallet) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <Navbar />
        <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">Invalid Human ID</h1>
          <p className="text-neutral-500">The provided human ID is not a valid Solana address.</p>
        </main>
      </div>
    );
  }

  const addr = humanWallet.toBase58();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <User className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profileLoading ? <Skeleton className="h-8 w-40 bg-neutral-900" /> : profile ? "Verified Human" : "Unverified Wallet"}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                <code className="text-neutral-400">{addr.slice(0, 8)}…{addr.slice(-6)}</code>
                <CopyBtn text={addr} />
                <a href={`https://explorer.solana.com/address/${addr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-emerald-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {!profileLoading && !profile && (
            <Card className="border-amber-500/15 bg-amber-500/[0.02]">
              <CardContent className="flex items-center gap-3 p-5">
                <Fingerprint className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-200">This wallet has not created a HumanRail profile yet.</p>
              </CardContent>
            </Card>
          )}

          {profile && (
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Trust Score</p>
                    <p className="mt-1 text-xl font-bold text-white">{profile.humanScore}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Attestations</p>
                    <p className="mt-1 text-xl font-bold text-white">{profile.activeAttestationCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Agents Registered</p>
                    <p className="mt-1 text-xl font-bold text-white">{profile.agentsRegistered}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Member Since</p>
                    <p className="mt-1 text-sm font-semibold text-white">{new Date(profile.createdAt * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.isUnique && (
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Unique
                    </Badge>
                  )}
                  {profile.canRegisterAgents && (
                    <Badge variant="outline" className="border-sky-500/20 bg-sky-500/5 text-sky-400">
                      <Award className="mr-1 h-3 w-3" /> Can Register Agents
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agents */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Registered Agents</h2>
            {agentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />)}
              </div>
            ) : agents.length === 0 ? (
              <Card className="border-white/[0.04] bg-white/[0.015]">
                <CardContent className="py-8 text-center text-sm text-neutral-500">No agents registered yet</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {agents.map((agent) => (
                  <Link key={agent.pda.toBase58()} href={`/agent/${agent.pda.toBase58()}`}>
                    <Card className="group cursor-pointer border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1] hover:bg-white/[0.03]">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
                            <Bot className="h-5 w-5 text-sky-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{agent.name || "Unnamed Agent"}</p>
                            <p className="text-[11px] text-neutral-500">{agent.pda.toBase58().slice(0, 8)}…</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={
                          agent.status === "Active"
                            ? "border-emerald-500/20 bg-emerald-500/5 text-[10px] text-emerald-400"
                            : agent.status === "Suspended"
                            ? "border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400"
                            : "border-red-500/20 bg-red-500/5 text-[10px] text-red-400"
                        }>
                          {agent.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {profilePda && (
            <div className="flex justify-center">
              <a href={`https://explorer.solana.com/address/${profilePda.toBase58()}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5 text-neutral-500 hover:text-white">
                  <ExternalLink className="h-4 w-4" /> View Profile on Explorer
                </Button>
              </a>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
