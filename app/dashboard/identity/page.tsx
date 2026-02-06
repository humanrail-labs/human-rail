"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useCluster } from "@/lib/solana/cluster-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Fingerprint, Shield, CheckCircle2, XCircle, RefreshCw, Plus,
  ExternalLink, Clock, Award, Bot, Copy, Wallet,
} from "lucide-react";
import { toast } from "sonner";

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

export default function IdentityPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { profile, profilePda, loading, error, refetch, hasProfile, createProfile } = useHumanProfile();
  const [creating, setCreating] = useState(false);

  const handleCreateProfile = async () => {
    setCreating(true);
    try {
      const signature = await createProfile();
      toast.success("Profile created!", {
        description: `TX: ${signature.slice(0, 8)}…`,
        action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank") },
      });
    } catch (err) {
      console.error("Failed to create profile:", err);
      toast.error("Failed to create profile", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreating(false);
    }
  };

  const formatTimestamp = (ts: number) => !ts ? "Never" : new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const scoreColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = (s: number) => s >= 80 ? "from-emerald-600 to-emerald-400" : s >= 50 ? "from-amber-600 to-amber-400" : "from-red-600 to-red-400";

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Fingerprint className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a Solana wallet to view or create your human identity profile.</p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 w-full rounded-xl bg-neutral-900" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-neutral-900" />)}</div>
        <Skeleton className="h-40 w-full rounded-xl bg-neutral-900" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex flex-col items-center px-8 py-14 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Fingerprint className="h-9 w-9 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">Create Your Profile</h2>
            <p className="mb-2 text-sm text-neutral-500">Initialize your HumanRail identity on {cluster}. This creates a PDA account tied to your wallet.</p>
            {profilePda && (
              <div className="mb-6 flex items-center gap-2">
                <code className="text-[11px] text-neutral-600">PDA: {profilePda.toBase58().slice(0, 8)}…{profilePda.toBase58().slice(-6)}</code>
                <CopyBtn text={profilePda.toBase58()} />
              </div>
            )}
            <Button onClick={handleCreateProfile} disabled={creating} className="gap-2 bg-emerald-600 px-8 hover:bg-emerald-700" size="lg">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "Creating…" : "Create Human Profile"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}>
        <Card className="relative overflow-hidden border-white/[0.06] bg-white/[0.02]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/5 blur-3xl" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">Human Profile</h3>
                    <Badge variant={profile!.isUnique ? "default" : "secondary"}
                      className={profile!.isUnique ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" : ""}>
                      {profile!.isUnique ? <><CheckCircle2 className="mr-1 h-3 w-3" />Verified Unique</> : <><XCircle className="mr-1 h-3 w-3" />Not Verified</>}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-[11px] text-neutral-500">{profilePda?.toBase58()}</code>
                    {profilePda && <CopyBtn text={profilePda.toBase58()} />}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-neutral-500 hover:text-white">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="mt-6 rounded-xl bg-neutral-900/60 p-5 ring-1 ring-white/[0.04]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Human Score</span>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(profile!.humanScore)}`}>
                  {profile!.humanScore}<span className="text-sm font-normal text-neutral-600"> / 100</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${scoreBg(profile!.humanScore)}`}
                  style={{ width: `${Math.min(profile!.humanScore, 100)}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-neutral-600">Computed from {profile!.activeAttestationCount} active attestation{profile!.activeAttestationCount !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Award, label: "Total Attestations", value: profile!.totalAttestationCount, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: CheckCircle2, label: "Active", value: profile!.activeAttestationCount, color: "text-sky-500", bg: "bg-sky-500/10" },
          { icon: Bot, label: "Agents Registered", value: profile!.agentsRegistered, color: "text-violet-500", bg: "bg-violet-500/10" },
          { icon: Clock, label: "Created", value: formatTimestamp(profile!.createdAt), color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}><stat.icon className={`h-3.5 w-3.5 ${stat.color}`} /></div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Agent Registration</CardTitle>
              <Badge variant="outline" className={profile!.canRegisterAgents ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-red-500/20 bg-red-500/5 text-red-400"}>
                {profile!.canRegisterAgents ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <CardDescription className="text-xs">{profile!.canRegisterAgents ? "You can register AI agents and delegate capabilities." : "Reach a higher trust score to enable agent registration."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/dashboard/agents")} variant="outline" size="sm" className="gap-2"><Bot className="h-4 w-4" /> Go to Agent Dashboard</Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader><CardTitle className="text-sm">Attestations</CardTitle><CardDescription className="text-xs">Identity proofs from trusted issuers</CardDescription></CardHeader>
          <CardContent>
            {profile!.activeAttestationCount === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Shield className="mb-3 h-10 w-10 text-neutral-700" />
                <p className="text-sm text-neutral-500">No attestations yet</p>
                <p className="mt-1 text-xs text-neutral-600">Request attestations from verified issuers to increase your score.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: profile!.activeAttestationCount }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-900/50 p-4 ring-1 ring-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                      <div><p className="text-sm font-medium text-neutral-300">Identity Attestation #{i + 1}</p><p className="text-[11px] text-neutral-600">Trusted issuer</p></div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/20 text-emerald-500">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-center">
        <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-neutral-300"
          onClick={() => window.open(`https://explorer.solana.com/address/${profilePda?.toBase58()}?cluster=${cluster}`, "_blank")}>
          <ExternalLink className="h-3.5 w-3.5" /> View on Solana Explorer
        </Button>
      </motion.div>

      {error && <Card className="border-red-500/20 bg-red-500/5"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p></CardContent></Card>}
    </motion.div>
  );
}
