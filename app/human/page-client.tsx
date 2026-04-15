"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  User,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  ExternalLink,
  Clock,
  Award,
  Fingerprint,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

export default function HumanDashboard() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const { profile, profilePda, loading, error, refetch, hasProfile, createProfile } = useHumanProfile();
  const [creating, setCreating] = useState(false);

  const handleCreateProfile = async () => {
    setCreating(true);
    try {
      const signature = await createProfile();
      toast.success("Profile created!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });
    } catch (err) {
      console.error("Failed to create profile:", err);
      toast.error("Failed to create profile", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  };

  const formatTimestamp = (ts: number) => (!ts ? "Never" : new Date(ts * 1000).toLocaleDateString());
  const getScoreColor = (score: number) => (score >= 80 ? "text-emerald-500" : score >= 50 ? "text-yellow-500" : "text-red-500");

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Human Dashboard</h1>
              <p className="mt-1 text-neutral-400">Manage your identity profile and attestations</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Not Connected */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <User className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to view or create your human profile</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* Connected - No Profile */}
          {connected && !hasProfile && !loading && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Fingerprint className="mb-4 h-16 w-16 text-emerald-500" />
                <h2 className="mb-2 text-xl font-semibold">Create Your Profile</h2>
                <p className="mb-2 text-neutral-400">Initialize your HumanRail identity profile on devnet</p>
                <p className="mb-6 font-mono text-xs text-neutral-500">
                  PDA: {profilePda?.toBase58().slice(0, 8)}...{profilePda?.toBase58().slice(-8)}
                </p>
                <Button onClick={handleCreateProfile} disabled={creating} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creating ? "Creating..." : "Create Profile"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full bg-neutral-800" />
              <Skeleton className="h-32 w-full bg-neutral-800" />
            </div>
          )}

          {/* Profile Exists */}
          {connected && hasProfile && profile && (
            <div className="space-y-6">
              <Card className="border-neutral-800 bg-neutral-900/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950">
                        <User className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle>Human Profile</CardTitle>
                        <CardDescription className="font-mono text-xs">{profilePda?.toBase58()}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={profile.isUnique ? "default" : "secondary"} className={profile.isUnique ? "bg-emerald-600" : ""}>
                      {profile.isUnique ? <><CheckCircle2 className="mr-1 h-3 w-3" />Unique</> : <><XCircle className="mr-1 h-3 w-3" />Not Verified</>}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Human Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(profile.humanScore)}`}>{profile.humanScore}</span>
                    </div>
                    <Progress value={profile.humanScore} className="h-2" />
                    <p className="mt-1 text-xs text-neutral-500">Score computed from {profile.activeAttestationCount} active attestation(s)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-neutral-800/50 p-4">
                      <div className="flex items-center gap-2 text-neutral-400"><Award className="h-4 w-4" /><span className="text-xs">Total Attestations</span></div>
                      <p className="mt-1 text-xl font-semibold">{profile.totalAttestationCount}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/50 p-4">
                      <div className="flex items-center gap-2 text-neutral-400"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Active</span></div>
                      <p className="mt-1 text-xl font-semibold">{profile.activeAttestationCount}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/50 p-4">
                      <div className="flex items-center gap-2 text-neutral-400"><Bot className="h-4 w-4" /><span className="text-xs">Agents</span></div>
                      <p className="mt-1 text-xl font-semibold">{profile.agentsRegistered}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/50 p-4">
                      <div className="flex items-center gap-2 text-neutral-400"><Clock className="h-4 w-4" /><span className="text-xs">Created</span></div>
                      <p className="mt-1 text-sm font-semibold">{formatTimestamp(profile.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agent Registration Status */}
              <Card className="border-neutral-800 bg-neutral-900/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Agent Registration</CardTitle>
                    <Badge variant={profile.canRegisterAgents ? "default" : "secondary"} className={profile.canRegisterAgents ? "bg-blue-600" : ""}>
                      {profile.canRegisterAgents ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => (window.location.href = "/agent")} className="bg-blue-600 hover:bg-blue-700">
                    <Bot className="mr-2 h-4 w-4" />Go to Agent Dashboard
                  </Button>
                </CardContent>
              </Card>

              {/* Attestations */}
              <Card className="border-neutral-800 bg-neutral-900/50">
                <CardHeader>
                  <CardTitle className="text-lg">Attestations</CardTitle>
                  <CardDescription>Identity proofs from trusted issuers</CardDescription>
                </CardHeader>
                <CardContent>
                  {profile.activeAttestationCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Shield className="mb-3 h-12 w-12 text-neutral-600" />
                      <p className="text-neutral-400">No attestations yet</p>
                      <p className="text-sm text-neutral-500">Request attestations from verified issuers to increase your score</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium">Identity Provider</p>
                            <p className="text-xs text-neutral-500">Weight: {profile.humanScore}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-800 text-emerald-500">Active</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => window.open(`https://explorer.solana.com/address/${profilePda?.toBase58()}?cluster=${cluster}`, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" />View on Solana Explorer
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-red-900 bg-red-950/20">
              <CardContent className="py-4"><p className="text-red-400">{error}</p></CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
