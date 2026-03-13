"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useKyc } from "@/lib/hooks/use-kyc";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId,
  deriveHumanProfilePda,
  parseSignedAttestation,
  attestationTypeName,
  type SignedAttestation,
} from "@/lib/programs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Fingerprint, Shield, CheckCircle2, XCircle, RefreshCw, Plus,
  ExternalLink, Clock, Award, Bot, Copy, Wallet, ShieldCheck, Loader2,
  AlertTriangle, ArrowRight, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { TrustTierBadge, TrustTierProgress } from "@/components/ui/trust-tier-badge";
import { IssuersSection } from "@/components/issuer/issuers-section";

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

function ExplorerBtn({ address, type = "address" }: { address: string; type?: "address" | "tx" }) {
  const { cluster } = useCluster();
  return (
    <button
      onClick={() => window.open(`https://explorer.solana.com/${type}/${address}?cluster=${cluster}`, "_blank")}
      className="text-neutral-600 transition-colors hover:text-neutral-400"
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Attestation fetcher (reads all attestation PDAs for this profile) ──
interface AttestationWithPda extends SignedAttestation {
  pda: PublicKey;
}

function useAttestations(profilePda: PublicKey | null) {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const [attestations, setAttestations] = useState<AttestationWithPda[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!profilePda || !connection) return;

    setLoading(true);
    try {
      const programId = getProgramId(cluster, "humanRegistry");

      // Find all attestation accounts that reference this profile PDA
      // Attestation layout: disc(8) + profile(32) — so profile starts at offset 8
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: profilePda.toBase58(),
            },
          },
        ],
      });

      const parsed: AttestationWithPda[] = [];
      for (const { pubkey, account } of accounts) {
        // Skip HumanProfile accounts (they also have the wallet at offset 8)
        // Attestations are smaller and have a different structure
        // HumanProfile: disc(8) + wallet(32) + score(2) ...
        // SignedAttestation: disc(8) + profile(32) + issuer(32) + issuerAuthority(32) ...
        // We can distinguish by checking if byte 72 onward looks like a pubkey (issuerAuthority)
        // Or more reliably: attestations have data.length in a specific range
        if (account.data.length < 165 || account.data.length > 500) continue;

        const att = parseSignedAttestation(account.data as Buffer);
        if (att && att.profile.equals(profilePda)) {
          parsed.push({ ...att, pda: pubkey });
        }
      }

      parsed.sort((a, b) => b.issuedAt - a.issuedAt);
      setAttestations(parsed);
    } catch (err) {
      console.error("Failed to fetch attestations:", err);
    } finally {
      setLoading(false);
    }
  }, [profilePda, connection, cluster]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { attestations, loading, refetch: fetch };
}

// ── KYC Section Component ──
function KycSection({ walletPubkey, onAttested }: { walletPubkey: string; onAttested: () => void }) {
  const kyc = useKyc(walletPubkey);
  const { cluster } = useCluster();

  // When attestation lands, refresh parent
  useEffect(() => {
    if (kyc.status === "attested") {
      onAttested();
    }
  }, [kyc.status, onAttested]);

  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-sky-500" />
            Identity Verification (KYC)
          </CardTitle>
          {kyc.status === "attested" && (
            <Badge className="bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Verify your identity through Veriff to receive an on-chain attestation. No personal data is stored on-chain — only a SHA256 hash of the verification decision.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* idle */}
        {kyc.status === "idle" && (
          <Button
            onClick={async () => {
              const url = await kyc.startKyc();
              if (url) {
                window.open(url, "_blank");
                toast.info("Veriff opened in new tab", { description: "Complete verification there, this page will auto-update." });
              }
            }}
            className="gap-2 bg-sky-600 hover:bg-sky-700"
          >
            <ShieldCheck className="h-4 w-4" /> Start Identity Verification
          </Button>
        )}

        {/* creating session */}
        {kyc.status === "creating_session" && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            <span className="text-sm text-neutral-400">Creating verification session...</span>
          </div>
        )}

        {/* pending — user needs to complete Veriff */}
        {kyc.status === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 p-4 ring-1 ring-amber-500/15">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">Verification Pending</p>
                <p className="text-xs text-amber-400/60">Complete the identity check in the Veriff tab. This page polls automatically.</p>
              </div>
            </div>
            {kyc.verificationUrl && (
              <Button
                onClick={() => window.open(kyc.verificationUrl!, "_blank")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ArrowRight className="h-3.5 w-3.5" /> Re-open Veriff
              </Button>
            )}
            <p className="text-[10px] text-neutral-600 animate-pulse">Polling every 5 seconds...</p>
          </div>
        )}

        {/* approved — issuing on-chain */}
        {kyc.status === "approved" && (
          <div className="flex items-center gap-3 rounded-lg bg-sky-500/5 p-4 ring-1 ring-sky-500/15">
            <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
            <div>
              <p className="text-sm font-medium text-sky-200">Approved — Issuing Attestation</p>
              <p className="text-xs text-sky-400/60">Submitting on-chain attestation transaction...</p>
            </div>
          </div>
        )}

        {/* attested */}
        {kyc.status === "attested" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 p-4 ring-1 ring-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-200">On-Chain Attestation Issued</p>
                <p className="text-xs text-emerald-400/60">Your humanity score has been updated.</p>
              </div>
            </div>
            {kyc.txSignature && (
              <div className="flex items-center justify-between rounded-lg bg-neutral-900/50 p-3 ring-1 ring-white/[0.04]">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Transaction</p>
                  <code className="text-[11px] text-neutral-400">{kyc.txSignature.slice(0, 16)}...{kyc.txSignature.slice(-8)}</code>
                </div>
                <div className="flex items-center gap-2">
                  <CopyBtn text={kyc.txSignature} />
                  <ExplorerBtn address={kyc.txSignature} type="tx" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* declined */}
        {kyc.status === "declined" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-red-500/5 p-4 ring-1 ring-red-500/15">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-200">Verification Declined</p>
                <p className="text-xs text-red-400/60">The identity check was not approved. You may try again.</p>
              </div>
            </div>
            <Button onClick={kyc.reset} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        )}

        {/* chain error */}
        {kyc.status === "chain_error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-red-500/5 p-4 ring-1 ring-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-200">On-Chain Transaction Failed</p>
                <p className="text-xs text-red-400/60">Verification was approved but the attestation TX failed. Contact support or try again.</p>
              </div>
            </div>
            <Button onClick={kyc.reset} variant="outline" size="sm">Try Again</Button>
          </div>
        )}

        {/* generic error */}
        {kyc.status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-red-500/5 p-4 ring-1 ring-red-500/15">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-200">Error</p>
                <p className="text-xs text-red-400/60">{kyc.error}</p>
              </div>
            </div>
            <Button onClick={kyc.reset} variant="outline" size="sm">Retry</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Attestation Card ──
function AttestationCard({ att }: { att: AttestationWithPda }) {
  const { cluster } = useCluster();
  const isExpired = att.expiresAt > 0 && att.expiresAt * 1000 < Date.now();
  const formatTs = (ts: number) => !ts ? "Never" : new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-lg bg-neutral-900/50 p-4 ring-1 ring-white/[0.04] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${att.isActive && !isExpired ? "bg-emerald-500/10" : "bg-neutral-800"}`}>
            {att.isActive && !isExpired
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <XCircle className="h-4 w-4 text-neutral-600" />}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">
              {attestationTypeName(att.attestationType)} Attestation
            </p>
            <p className="text-[10px] text-neutral-600">
              Weight: {att.weight} · Nonce: {att.nonce.toString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {att.isActive && !isExpired ? (
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-[10px]">Active</Badge>
          ) : isExpired ? (
            <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[10px]">Expired</Badge>
          ) : (
            <Badge variant="outline" className="border-red-500/20 text-red-500 text-[10px]">Revoked</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-neutral-600">Issued</span>
          <p className="text-neutral-400">{formatTs(att.issuedAt)}</p>
        </div>
        <div>
          <span className="text-neutral-600">Expires</span>
          <p className="text-neutral-400">{att.expiresAt === 0 ? "Never" : formatTs(att.expiresAt)}</p>
        </div>
        <div>
          <span className="text-neutral-600">Issuer</span>
          <div className="flex items-center gap-1">
            <code className="text-neutral-500">{att.issuerAuthority.toBase58().slice(0, 6)}...{att.issuerAuthority.toBase58().slice(-4)}</code>
            <CopyBtn text={att.issuerAuthority.toBase58()} />
          </div>
        </div>
        <div>
          <span className="text-neutral-600">Attestation PDA</span>
          <div className="flex items-center gap-1">
            <code className="text-neutral-500">{att.pda.toBase58().slice(0, 6)}...{att.pda.toBase58().slice(-4)}</code>
            <ExplorerBtn address={att.pda.toBase58()} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function IdentityPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { profile, profilePda, loading, error, refetch, hasProfile, createProfile } = useHumanProfile();
  const { attestations, loading: attestLoading, refetch: refetchAttestations } = useAttestations(profilePda);
  const [creating, setCreating] = useState(false);

  const handleCreateProfile = async () => {
    setCreating(true);
    try {
      const signature = await createProfile();
      toast.success("Profile created!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: { label: "View", onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank") },
      });
    } catch (err) {
      console.error("Failed to create profile:", err);
      toast.error("Failed to create profile", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshAll = useCallback(() => {
    refetch();
    refetchAttestations();
  }, [refetch, refetchAttestations]);

  const formatTimestamp = (ts: number) => !ts ? "Never" : new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const scoreColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = (s: number) => s >= 80 ? "from-emerald-600 to-emerald-400" : s >= 50 ? "from-amber-600 to-amber-400" : "from-red-600 to-red-400";

  // Task 2: Authoritative verification check — on-chain attestations only
  const hasActiveKycAttestation = attestations.some(
    (att) => att.isActive && att.attestationType === 0 && (att.expiresAt === 0 || att.expiresAt * 1000 > Date.now())
  );
  const isVerified = hasActiveKycAttestation;

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
                <code className="text-[11px] text-neutral-600">PDA: {profilePda.toBase58().slice(0, 8)}...{profilePda.toBase58().slice(-6)}</code>
                <CopyBtn text={profilePda.toBase58()} />
              </div>
            )}
            <Button onClick={handleCreateProfile} disabled={creating} className="gap-2 bg-emerald-600 px-8 hover:bg-emerald-700" size="lg">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "Creating..." : "Create Human Profile"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Profile exists ──
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Profile Card */}
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
                    <Badge variant={isVerified ? "default" : "secondary"}
                      className={isVerified ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" : ""}>
                      {isVerified ? <><CheckCircle2 className="mr-1 h-3 w-3" />Verified (On-Chain)</> : <><XCircle className="mr-1 h-3 w-3" />Not Verified</>}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-[11px] text-neutral-500">{profilePda?.toBase58()}</code>
                    {profilePda && <CopyBtn text={profilePda.toBase58()} />}
                    {profilePda && <ExplorerBtn address={profilePda.toBase58()} />}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={loading} className="text-neutral-500 hover:text-white">
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
              <p className="mt-2 text-[11px] text-neutral-600">
                Computed from {profile!.activeAttestationCount} active attestation{profile!.activeAttestationCount !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
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

      {/* KYC Section */}
      <motion.div variants={fadeUp}>
        <KycSection
          walletPubkey={publicKey!.toBase58()}
          onAttested={handleRefreshAll}
        />
      </motion.div>

      {/* Trust Tier Card */}
      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Trust Tier
              </CardTitle>
              {(() => {
                const hasKyc = attestations.some(a => a.attestationType === 0 && a.isActive);
                const activeAttestations = attestations.filter(a => a.isActive);
                const uniqueIssuers = new Set(activeAttestations.map(a => a.issuer.toBase58())).size;
                
                let tier: 0 | 1 | 2 = 0;
                if (hasKyc && uniqueIssuers >= 3) tier = 2;
                else if (hasKyc || activeAttestations.length >= 2) tier = 1;
                
                return <TrustTierBadge tier={tier} />;
              })()}
            </div>
            <CardDescription className="text-xs">
              Your trust level is determined by attestations and verification status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const hasKyc = attestations.some(a => a.attestationType === 0 && a.isActive);
              const activeAttestations = attestations.filter(a => a.isActive);
              const uniqueIssuers = new Set(activeAttestations.map(a => a.issuer.toBase58())).size;
              
              let tier: 0 | 1 | 2 = 0;
              if (hasKyc && uniqueIssuers >= 3) tier = 2;
              else if (hasKyc || activeAttestations.length >= 2) tier = 1;
              
              return (
                <TrustTierProgress
                  currentTier={tier}
                  progress={{
                    hasProfile: true,
                    hasKyc,
                    attestationCount: activeAttestations.length,
                    uniqueIssuers,
                  }}
                />
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Trust Tier Card */}
      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Trust Tier
              </CardTitle>
              {(() => {
                const hasKyc = attestations.some(a => a.attestationType === 0 && a.isActive);
                const activeAttestations = attestations.filter(a => a.isActive);
                const uniqueIssuers = new Set(activeAttestations.map(a => a.issuer.toBase58())).size;
                
                let tier: 0 | 1 | 2 = 0;
                if (hasKyc && uniqueIssuers >= 3) tier = 2;
                else if (hasKyc || activeAttestations.length >= 2) tier = 1;
                
                return <TrustTierBadge tier={tier} />;
              })()}
            </div>
            <CardDescription className="text-xs">
              Your trust level is determined by attestations and verification status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const hasKyc = attestations.some(a => a.attestationType === 0 && a.isActive);
              const activeAttestations = attestations.filter(a => a.isActive);
              const uniqueIssuers = new Set(activeAttestations.map(a => a.issuer.toBase58())).size;
              
              let tier: 0 | 1 | 2 = 0;
              if (hasKyc && uniqueIssuers >= 3) tier = 2;
              else if (hasKyc || activeAttestations.length >= 2) tier = 1;
              
              return (
                <TrustTierProgress
                  currentTier={tier}
                  progress={{
                    hasProfile: true,
                    hasKyc,
                    attestationCount: activeAttestations.length,
                    uniqueIssuers,
                  }}
                />
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Trusted Issuers Section */}
      <IssuersSection />

      {/* Agent Registration Card */}
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

      {/* Real Attestations */}
      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Attestations</CardTitle>
              <div className="flex items-center gap-2">
                {attestations.length > 0 && (
                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 text-[10px]">
                    {attestations.filter(a => a.isActive).length} active
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={refetchAttestations} disabled={attestLoading} className="h-7 w-7 p-0 text-neutral-500 hover:text-white">
                  <RefreshCw className={`h-3.5 w-3.5 ${attestLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">Identity proofs from trusted issuers, fetched from on-chain accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {attestLoading && attestations.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-lg bg-neutral-900" />
                <Skeleton className="h-24 rounded-lg bg-neutral-900" />
              </div>
            ) : attestations.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Shield className="mb-3 h-10 w-10 text-neutral-700" />
                <p className="text-sm text-neutral-500">No attestations yet</p>
                <p className="mt-1 text-xs text-neutral-600">Complete KYC verification above to receive your first on-chain attestation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attestations.map((att) => (
                  <AttestationCard key={att.pda.toBase58()} att={att} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Explorer link */}
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
