"use client";

import { useState, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDwalletGuard } from "@/lib/hooks/use-dwallet-guard";
import { useAgents } from "@/lib/hooks/use-agents";
import {
  keccak256,
  hashPolicyInput,
  IkaSignatureScheme,
  signatureSchemeName,
} from "@/lib/dwallet-guard/utils";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Wallet,
  FileKey,
  Lock,
  Fingerprint,
  Globe,
  Radio,
  Clock,
  Hash,
} from "lucide-react";

const IKA_PROGRAM_ID = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net:443";

export default function DwalletGuardPageClient() {
  const { publicKey } = useWallet();
  const {
    guardProgramId,
    isConfigured,
    isDeployed,
    isCheckingDeployment,
    deploymentError,
    deriveCpiAuthority,
    deriveGuardedDwallet,
    deriveGuardSigningRequest,
  } = useDwalletGuard();

  const { agents } = useAgents();

  // -----------------------------------------------------------------------
  // Deployment status UI
  // -----------------------------------------------------------------------
  const deploymentStatus = isCheckingDeployment
    ? "checking"
    : isDeployed
    ? "deployed"
    : "not-deployed";

  // -----------------------------------------------------------------------
  // Demo inputs: Policy
  // -----------------------------------------------------------------------
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [dwalletInput, setDwalletInput] = useState("");
  const [allowedChainId, setAllowedChainId] = useState("1");
  const [assetInput, setAssetInput] = useState("ETH");
  const [recipientInput, setRecipientInput] = useState("");
  const [perTxLimit, setPerTxLimit] = useState("1000000");
  const [dailyLimit, setDailyLimit] = useState("5000000");
  const [totalLimit, setTotalLimit] = useState("50000000");
  const [expiresAt, setExpiresAt] = useState("");
  const [policyHashes, setPolicyHashes] = useState<{
    assetHash: string;
    recipientHash: string;
  } | null>(null);

  const computePolicyHashes = useCallback(async () => {
    const assetHash = await hashPolicyInput(assetInput);
    const recipientHash = await hashPolicyInput(recipientInput || "any");
    setPolicyHashes({
      assetHash: Buffer.from(assetHash).toString("hex"),
      recipientHash: Buffer.from(recipientHash).toString("hex"),
    });
  }, [assetInput, recipientInput]);

  // -----------------------------------------------------------------------
  // Demo inputs: Signing request
  // -----------------------------------------------------------------------
  const [messageInput, setMessageInput] = useState("");
  const [messageDigest, setMessageDigest] = useState<string>("");
  const [signatureScheme, setSignatureScheme] = useState<IkaSignatureScheme>(
    IkaSignatureScheme.EcdsaKeccak256
  );
  const [requestAmount, setRequestAmount] = useState("100000");
  const [requestIdHex] = useState(() => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("hex");
  });

  const computeMessageDigest = useCallback(async () => {
    if (!messageInput) return;
    const digest = await keccak256(messageInput);
    setMessageDigest(Buffer.from(digest).toString("hex"));
  }, [messageInput]);

  // -----------------------------------------------------------------------
  // Derived PDAs
  // -----------------------------------------------------------------------
  const derivedPdas = useMemo(() => {
    if (!publicKey || !guardProgramId) return null;
    try {
      const [cpiAuthority] = deriveCpiAuthority();
      let guardedDwallet = publicKey.toBase58();
      if (selectedAgent && dwalletInput) {
        const [gd] = deriveGuardedDwallet(
          publicKey,
          new PublicKey(selectedAgent),
          new PublicKey(dwalletInput)
        );
        guardedDwallet = gd.toBase58();
      }
      const [gsr] = deriveGuardSigningRequest(
        new PublicKey(guardedDwallet),
        Buffer.from(requestIdHex, "hex")
      );
      return {
        cpiAuthority: cpiAuthority.toBase58(),
        guardedDwallet,
        guardSigningRequest: gsr.toBase58(),
      };
    } catch (e) {
      console.error("PDA derivation failed:", e);
      return null;
    }
  }, [
    publicKey,
    guardProgramId,
    deriveCpiAuthority,
    deriveGuardedDwallet,
    deriveGuardSigningRequest,
    selectedAgent,
    dwalletInput,
    requestIdHex,
  ]);

  // -----------------------------------------------------------------------
  // UI helpers
  // -----------------------------------------------------------------------
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Guarded dWallets</h1>
        <p className="text-sm text-neutral-400">
          Cross-chain signing authority for AI agents, governed by HumanRail policy and powered by Ika.
        </p>
        <p className="text-xs text-neutral-500 italic">
          Mandara preview: programmable mandates for cross-chain AI agents.
        </p>
      </div>

      {/* Deployment banner */}
      {deploymentStatus === "not-deployed" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">
              Guard program not deployed yet
            </p>
            <p className="text-xs text-amber-200/70">
              SBF build complete; deploy pending devnet SOL. All transaction buttons are disabled until deployment is confirmed on-chain.
            </p>
            {guardProgramId && (
              <code className="mt-1 block rounded bg-black/30 px-2 py-1 text-[11px] text-amber-100/80">
                Program ID: {guardProgramId.toBase58()}
              </code>
            )}
          </div>
        </motion.div>
      )}

      {deploymentStatus === "deployed" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-200">
            Guard program is live on {deploymentError ? "devnet" : "devnet"}
          </p>
        </motion.div>
      )}

      {/* Pre-alpha Ika warning */}
      <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-purple-200">Ika Pre-Alpha</p>
          <p className="text-xs text-purple-200/70">
            Ika uses a single mock signer, not real 2PC-MPC. Devnet data is wiped periodically. Not production custody.
          </p>
        </div>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-neutral-900">
          <TabsTrigger value="config">Config & PDAs</TabsTrigger>
          <TabsTrigger value="policy">Policy Creation</TabsTrigger>
          <TabsTrigger value="request">Signing Request</TabsTrigger>
        </TabsList>

        {/* Config & PDAs tab */}
        <TabsContent value="config" className="space-y-4 pt-4">
          {/* Program config card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
                Guard Program
              </CardTitle>
              <CardDescription className="text-neutral-500">
                HumanRail dWallet Guard program configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Configured</span>
                <Badge variant={isConfigured ? "default" : "destructive"}>
                  {isConfigured ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Deployed</span>
                <Badge variant={isDeployed ? "default" : "secondary"}>
                  {isDeployed ? "Live" : "Pending"}
                </Badge>
              </div>
              {guardProgramId && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Program ID</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">
                      {guardProgramId.toBase58().slice(0, 8)}…
                      {guardProgramId.toBase58().slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(guardProgramId.toBase58())}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {deploymentError && (
                <p className="text-xs text-amber-400/80">{deploymentError}</p>
              )}
            </CardContent>
          </Card>

          {/* Ika config card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Globe className="h-4 w-4 text-purple-400" />
                Ika Protocol Config
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Cross-chain signing layer connection details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Program ID</span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">
                    {IKA_PROGRAM_ID.slice(0, 8)}…{IKA_PROGRAM_ID.slice(-8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(IKA_PROGRAM_ID)}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">gRPC Endpoint</span>
                <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">
                  {IKA_GRPC_ENDPOINT}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">CPI Authority Seed</span>
                <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">
                  __ika_cpi_authority
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Derived PDAs */}
          {derivedPdas && (
            <Card className="border-white/[0.06] bg-neutral-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Fingerprint className="h-4 w-4 text-sky-400" />
                  Derived PDAs
                </CardTitle>
                <CardDescription className="text-neutral-500">
                  Program-derived addresses for guard accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">CPI Authority</span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {derivedPdas.cpiAuthority}
                    </code>
                    <button
                      onClick={() => copyToClipboard(derivedPdas.cpiAuthority)}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">
                    GuardedDwallet {"["}guarded_dwallet, principal, agent, dwallet{"]"}
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {derivedPdas.guardedDwallet}
                    </code>
                    <button
                      onClick={() => copyToClipboard(derivedPdas.guardedDwallet)}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">
                    GuardSigningRequest {"["}guard_signing_request, guarded_dwallet, request_id{"]"}
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {derivedPdas.guardSigningRequest}
                    </code>
                    <button
                      onClick={() => copyToClipboard(derivedPdas.guardSigningRequest)}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Policy Creation tab */}
        <TabsContent value="policy" className="space-y-4 pt-4">
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Lock className="h-4 w-4 text-emerald-400" />
                Policy Creation
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Define guardrails for a cross-chain signing mandate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Principal */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Principal</Label>
                <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm text-neutral-300">
                  <Wallet className="h-4 w-4 text-neutral-500" />
                  <span className="truncate">
                    {publicKey?.toBase58() ?? "Connect wallet"}
                  </span>
                </div>
              </div>

              {/* Agent selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Agent</Label>
                <select
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-emerald-500/30"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  <option value="">Select an agent…</option>
                  {agents.map((a) => (
                    <option key={a.pda.toBase58()} value={a.pda.toBase58()}>
                      {a.name} ({a.pda.toBase58().slice(0, 6)}…)
                    </option>
                  ))}
                </select>
                {agents.length === 0 && (
                  <p className="text-xs text-amber-400/70">
                    No agents registered. Register one in My Agents first.
                  </p>
                )}
              </div>

              {/* dWallet input */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">dWallet Pubkey</Label>
                <Input
                  placeholder="Paste Ika dWallet public key"
                  value={dwalletInput}
                  onChange={(e) => setDwalletInput(e.target.value)}
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600"
                />
                <p className="text-xs text-neutral-600">
                  Demo input: the Ika dWallet that will be guarded
                </p>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Per-Tx Limit</Label>
                  <Input
                    type="number"
                    value={perTxLimit}
                    onChange={(e) => setPerTxLimit(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Daily Limit</Label>
                  <Input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Total Limit</Label>
                  <Input
                    type="number"
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                  />
                </div>
              </div>

              {/* Constraints */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Allowed Chain ID</Label>
                  <Input
                    type="number"
                    value={allowedChainId}
                    onChange={(e) => setAllowedChainId(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Asset (demo string)</Label>
                  <Input
                    value={assetInput}
                    onChange={(e) => setAssetInput(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Recipient (demo string)</Label>
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Expires At</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt || "2026-05-08T08:00"}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                />
              </div>

              {/* Hash preview */}
              {policyHashes && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3">
                  <p className="text-xs font-medium text-neutral-400">Demo policy hashes</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-500">Asset hash</span>
                      <code className="text-[11px] text-neutral-400">{policyHashes.assetHash.slice(0, 16)}…</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-500">Recipient hash</span>
                      <code className="text-[11px] text-neutral-400">{policyHashes.recipientHash.slice(0, 16)}…</code>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={computePolicyHashes}
                  className="text-xs"
                >
                  <Hash className="mr-1.5 h-3.5 w-3.5" />
                  Compute Hashes
                </Button>
                <Button
                  size="sm"
                  disabled={!isDeployed || !publicKey || !selectedAgent || !dwalletInput}
                  className="bg-emerald-600 text-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Initialize Guard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signing Request tab */}
        <TabsContent value="request" className="space-y-4 pt-4">
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <FileKey className="h-4 w-4 text-sky-400" />
                Signing Request
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Submit a cross-chain message for policy-checked approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Message / Preimage</Label>
                <Input
                  placeholder="Enter message to sign (e.g. Ethereum tx payload)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600"
                />
                <p className="text-xs text-neutral-600">
                  Demo input: the raw message that will be hashed with keccak256 for Ika
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={computeMessageDigest}
                  className="text-xs"
                >
                  <Hash className="mr-1.5 h-3.5 w-3.5" />
                  Compute keccak256
                </Button>
              </div>

              {messageDigest && (
                <div className="space-y-1 rounded-lg bg-black/20 p-3">
                  <span className="text-xs text-neutral-500">Message Digest (keccak256)</span>
                  <code className="block break-all text-[11px] text-neutral-400">
                    {messageDigest}
                  </code>
                </div>
              )}

              {/* Signature scheme */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Signature Scheme</Label>
                <select
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-emerald-500/30"
                  value={signatureScheme}
                  onChange={(e) => setSignatureScheme(Number(e.target.value) as IkaSignatureScheme)}
                >
                  {Object.values(IkaSignatureScheme)
                    .filter((v) => typeof v === "number")
                    .map((scheme) => (
                      <option key={scheme} value={scheme}>
                        {signatureSchemeName(scheme as IkaSignatureScheme)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Amount</Label>
                <Input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
                />
              </div>

              {/* Request ID */}
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Request ID (random demo)</Label>
                <div className="flex items-center gap-2">
                  <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1.5 text-xs text-neutral-400">
                    {requestIdHex}
                  </code>
                  <button
                    onClick={() => copyToClipboard(requestIdHex)}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Status cards (demo) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-center">
                  <Clock className="h-5 w-5 text-neutral-500" />
                  <p className="text-xs font-medium text-neutral-400">Pending</p>
                  <p className="text-[10px] text-neutral-600">Waiting for principal approval</p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-xs font-medium text-emerald-400">Approved</p>
                  <p className="text-[10px] text-emerald-400/60">Policy passed, Ika CPI invoked</p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <p className="text-xs font-medium text-red-400">Rejected</p>
                  <p className="text-[10px] text-red-400/60">Policy check failed, no CPI</p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-center">
                  <Radio className="h-5 w-5 text-purple-400" />
                  <p className="text-xs font-medium text-purple-400">Ika Signed</p>
                  <p className="text-[10px] text-purple-400/60">MessageApproval status = Signed</p>
                </div>
              </div>

              <Button
                size="sm"
                disabled={!isDeployed || !publicKey || !messageDigest}
                className="w-full bg-emerald-600 text-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <FileKey className="mr-1.5 h-3.5 w-3.5" />
                Submit Guarded Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
