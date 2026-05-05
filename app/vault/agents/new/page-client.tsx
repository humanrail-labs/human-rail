"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId, deriveHumanProfilePda, DISCRIMINATORS, deriveCapabilityPda,
} from "@/lib/programs";
import {
  validateAgentName, validatePublicKey, validateString, validateAmount, sanitizeDisplayString,
} from "@/lib/utils/validation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot, ChevronLeft, ChevronRight, Copy, CheckCircle2, RefreshCw, Wallet, Shield, Zap, FileText,
  AlertTriangle, ArrowRight, Sparkles, ExternalLink, Loader2,
} from "lucide-react";
import { AGENT_TEMPLATES } from "./templates";

const fade = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.25 } };

const SCOPE_LABELS: Record<string, string> = {
  payment: "Payment", data: "DataAction", document: "DocumentSign", full: "Full Access",
};

const SCOPE_BITMASK: Record<string, bigint> = {
  payment: BigInt(1),
  data: BigInt(2),
  document: BigInt(4),
  full: BigInt("0xFFFFFFFFFFFFFFFF"),
};

function buildScopeBitmask(programIds: string[]): bigint {
  let mask = BigInt(0);
  for (const id of programIds) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    if (trimmed === "HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9") mask |= BigInt(1);
    else if (trimmed === "GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX") mask |= BigInt(2);
    else if (trimmed === "8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28") mask |= BigInt(4);
    else mask |= BigInt("0x8000000000000000");
  }
  return mask === BigInt(0) ? BigInt("0xFFFFFFFFFFFFFFFF") : mask;
}

function formatDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

function getTemplateIcon(name: string) {
  switch (name) {
    case "Wallet": return <Wallet className="h-6 w-6" />;
    case "Zap": return <Zap className="h-6 w-6" />;
    case "FileText": return <FileText className="h-6 w-6" />;
    default: return <Bot className="h-6 w-6" />;
  }
}

export default function NewAgentWizardPage() {
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/20"><Bot className="h-8 w-8 text-sky-500" /></div>
        <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a Solana wallet to deploy AI agents.</p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-sky-600 hover:bg-sky-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
      </motion.div>
    );
  }

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | "success">(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Step 2: Identity
  const [identity, setIdentity] = useState({
    name: "",
    type: "custom",
    description: "",
    walletMode: "generate" as "generate" | "existing",
    walletKey: "",
    tee: "",
    showTee: false,
  });
  const [generatedKeypair, setGeneratedKeypair] = useState<Keypair | null>(null);

  // Step 3: Capabilities
  const [capabilities, setCapabilities] = useState<Array<{
    name: string;
    scope: string;
    perTxLimit: string;
    dailyLimit: string;
    totalLimit: string;
    expiryDate: string;
    noExpiry: boolean;
    allowedPrograms: string;
  }>>([
    { name: "", scope: "full", perTxLimit: "0.1", dailyLimit: "1", totalLimit: "10", expiryDate: formatDateInput(new Date(Date.now() + 30 * 86400000)), noExpiry: false, allowedPrograms: "" },
  ]);

  // Step 4: Funding
  const totalCapabilityBudget = useMemo(() => capabilities.reduce((sum, c) => sum + (Number(c.totalLimit) || 0), 0), [capabilities]);
  const recommendedFunding = totalCapabilityBudget + 0.05;
  const [funding, setFunding] = useState({ fundNow: false, amount: recommendedFunding.toFixed(4) });

  // Step 5: Deployment
  const [deployState, setDeployState] = useState<{
    steps: Array<{ label: string; status: "pending" | "running" | "done" | "error"; tx?: string; error?: string }>;
    agentPda?: string;
    failedStepIndex: number | null;
  }>({
    steps: [
      { label: "Register Agent", status: "pending" },
      { label: "Issue Capabilities", status: "pending" },
      { label: "Fund Agent", status: "pending" },
    ],
    failedStepIndex: null,
  });

  const agentNonceRef = useRef<bigint | null>(null);
  const agentPdaRef = useRef<string | null>(null);

  const applyTemplate = (templateId: string) => {
    const t = AGENT_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    setIdentity((prev) => ({
      ...prev,
      type: t.identity.type,
      description: t.identity.description,
    }));
    setCapabilities(t.capabilities.map((c) => ({ ...c })));
    setStep(2);
  };

  const identityErrors = useMemo(() => {
    const errs: string[] = [];
    const nameRes = validateAgentName(identity.name);
    if (!nameRes.valid) errs.push(nameRes.error || "Invalid name");
    if (identity.walletMode === "existing") {
      if (!identity.walletKey.trim()) errs.push("Agent wallet public key is required");
      else if (!validatePublicKey(identity.walletKey.trim())) errs.push("Invalid Solana public key");
    }
    if (identity.description) {
      const descRes = validateString(identity.description, { maxLength: 256, allowEmpty: true });
      if (!descRes.valid) errs.push(descRes.error || "Invalid description");
    }
    if (identity.tee) {
      const teeRes = validateString(identity.tee, { maxLength: 64, allowEmpty: true });
      if (!teeRes.valid) errs.push(teeRes.error || "Invalid TEE measurement");
    }
    return errs;
  }, [identity]);

  const capabilityErrors = useMemo(() => {
    const errs: string[] = [];
    for (const cap of capabilities) {
      const nameRes = validateString(cap.name, { minLength: 1, maxLength: 32 });
      if (!nameRes.valid) errs.push(nameRes.error || "Invalid capability name");
      const perTx = validateAmount(cap.perTxLimit, { allowZero: false });
      if (!perTx.valid) errs.push(perTx.error || "Invalid per-tx limit");
      const daily = validateAmount(cap.dailyLimit, { allowZero: false });
      if (!daily.valid) errs.push(daily.error || "Invalid daily limit");
      const total = validateAmount(cap.totalLimit, { allowZero: false });
      if (!total.valid) errs.push(total.error || "Invalid total limit");
      if (!cap.noExpiry && !cap.expiryDate) errs.push("Expiry date is required");
    }
    return errs;
  }, [capabilities]);

  const agentWalletKey = useMemo(() => {
    if (identity.walletMode === "generate") {
      if (!generatedKeypair) {
        const kp = Keypair.generate();
        setGeneratedKeypair(kp);
        return kp.publicKey.toBase58();
      }
      return generatedKeypair.publicKey.toBase58();
    }
    return identity.walletKey.trim();
  }, [identity.walletMode, identity.walletKey, generatedKeypair]);

  const handleGenerateWallet = () => {
    const kp = Keypair.generate();
    setGeneratedKeypair(kp);
    setIdentity((s) => ({ ...s, walletMode: "generate" }));
  };

  const addCapability = () => {
    setCapabilities((prev) => [
      ...prev,
      { name: "", scope: "full", perTxLimit: "0.1", dailyLimit: "1", totalLimit: "10", expiryDate: formatDateInput(new Date(Date.now() + 30 * 86400000)), noExpiry: false, allowedPrograms: "" },
    ]);
  };

  const removeCapability = (idx: number) => {
    setCapabilities((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCapability = (idx: number, patch: Partial<typeof capabilities[0]>) => {
    setCapabilities((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const setExpiryPreset = (idx: number, days: number | null) => {
    if (days === null) {
      updateCapability(idx, { noExpiry: true, expiryDate: "" });
    } else {
      const d = new Date(Date.now() + days * 86400000);
      updateCapability(idx, { noExpiry: false, expiryDate: formatDateInput(d) });
    }
  };

  const deploy = async (resumeFromStep = 0) => {
    if (!publicKey || !connection) {
      toast.error("Wallet not connected");
      return;
    }

    setDeployState((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => ({
        ...s,
        status: i < resumeFromStep ? (s.status === "done" ? "done" : s.status) : i === resumeFromStep ? "running" : "pending",
        error: i === resumeFromStep ? undefined : s.error,
      })),
      failedStepIndex: null,
    }));

    const signingKey = new PublicKey(agentWalletKey);

    if (resumeFromStep <= 0) {
      try {
        const programId = getProgramId(cluster, "agentRegistry");
        const humanRegistryId = getProgramId(cluster, "humanRegistry");
        const nonce = BigInt(Date.now());
        agentNonceRef.current = nonce;
        const nonceBuffer = Buffer.alloc(8);
        nonceBuffer.writeBigUInt64LE(nonce);

        const [humanProfilePda] = deriveHumanProfilePda(publicKey, cluster);
        const [agentPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("agent"), publicKey.toBuffer(), nonceBuffer],
          programId
        );
        agentPdaRef.current = agentPda.toBase58();

        const [operatorStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("agent_stats"), agentPda.toBuffer()],
          programId
        );

        const nameBuffer = Buffer.alloc(32);
        Buffer.from(identity.name.slice(0, 32), "utf-8").copy(nameBuffer);

        const metadataHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${identity.type}:${identity.description}`)).then((buf) => new Uint8Array(buf));

        const teeOption = identity.tee && identity.tee.length === 64
          ? Buffer.concat([Buffer.from([1]), Buffer.from(identity.tee, "hex")])
          : Buffer.from([0]);

        const finalParams = Buffer.concat([nameBuffer, Buffer.from(metadataHash), signingKey.toBuffer(), teeOption, nonceBuffer]);

        const instruction = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: humanProfilePda, isSigner: false, isWritable: false },
            { pubkey: humanRegistryId, isSigner: false, isWritable: false },
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: operatorStatsPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId,
          data: Buffer.concat([DISCRIMINATORS.registerAgent, finalParams]),
        });

        const tx = new Transaction().add(instruction);
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");

        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[0] = { ...steps[0], status: "done", tx: sig };
          steps[1] = { ...steps[1], status: "running" };
          return { ...prev, steps, agentPda: agentPda.toBase58() };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[0] = { ...steps[0], status: "error", error: msg };
          return { ...prev, steps, failedStepIndex: 0 };
        });
        toast.error("Agent registration failed", { description: msg });
        return;
      }
    }

    const agentPda = new PublicKey(agentPdaRef.current!);

    if (resumeFromStep <= 1) {
      try {
        const programId = getProgramId(cluster, "delegation");
        for (let i = 0; i < capabilities.length; i++) {
          const cap = capabilities[i];
          const nonce = BigInt(Date.now()) + BigInt(i);
          const nonceBuffer = Buffer.alloc(8);
          nonceBuffer.writeBigUInt64LE(nonce);

          const [capabilityPda] = deriveCapabilityPda(publicKey, agentPda, nonce, cluster);

          let allowedProgramsMask: bigint;
          if (cap.allowedPrograms.trim()) {
            allowedProgramsMask = buildScopeBitmask(cap.allowedPrograms.split(/[\n,]+/));
          } else {
            allowedProgramsMask = SCOPE_BITMASK[cap.scope] || BigInt("0xFFFFFFFFFFFFFFFF");
          }

          const allowedProgramsBuf = Buffer.alloc(8);
          allowedProgramsBuf.writeBigUInt64LE(allowedProgramsMask);

          const allowedAssetsBuf = Buffer.alloc(8);
          allowedAssetsBuf.fill(0xFF);

          const perTxLimitBuf = Buffer.alloc(8);
          perTxLimitBuf.writeBigUInt64LE(BigInt(Math.floor(Number(cap.perTxLimit) * 1e9)));

          const dailyLimitBuf = Buffer.alloc(8);
          dailyLimitBuf.writeBigUInt64LE(BigInt(Math.floor(Number(cap.dailyLimit) * 1e9)));

          const totalLimitBuf = Buffer.alloc(8);
          totalLimitBuf.writeBigUInt64LE(BigInt(Math.floor(Number(cap.totalLimit) * 1e9)));

          const maxSlippageBuf = Buffer.alloc(2);
          maxSlippageBuf.writeUInt16LE(500);

          const maxFeeBuf = Buffer.alloc(8);
          maxFeeBuf.writeBigUInt64LE(BigInt(10000000));

          const validitySeconds = cap.noExpiry
            ? BigInt(365 * 86400 * 10)
            : BigInt(Math.max(0, Math.floor((new Date(cap.expiryDate).getTime() - Date.now()) / 1000)));

          const validityBuf = Buffer.alloc(8);
          validityBuf.writeBigInt64LE(validitySeconds);

          const cooldownBuf = Buffer.alloc(4);
          cooldownBuf.writeUInt32LE(0);

          const riskTierBuf = Buffer.from([1]);
          const enforceAllowlistBuf = Buffer.from([0]);
          const allowlistBuf = Buffer.alloc(4);

          const paramsData = Buffer.concat([
            allowedProgramsBuf, allowedAssetsBuf, perTxLimitBuf, dailyLimitBuf, totalLimitBuf,
            maxSlippageBuf, maxFeeBuf, validityBuf, cooldownBuf, riskTierBuf, enforceAllowlistBuf, allowlistBuf, nonceBuffer,
          ]);

          const instruction = new TransactionInstruction({
            keys: [
              { pubkey: publicKey, isSigner: true, isWritable: true },
              { pubkey: agentPda, isSigner: false, isWritable: false },
              { pubkey: capabilityPda, isSigner: false, isWritable: true },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId,
            data: Buffer.concat([DISCRIMINATORS.issueCapability, paramsData]),
          });

          const tx = new Transaction().add(instruction);
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey;

          const sig = await sendTransaction(tx, connection);
          await connection.confirmTransaction(sig, "confirmed");
        }

        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[1] = { ...steps[1], status: "done" };
          steps[2] = { ...steps[2], status: funding.fundNow ? "running" : "done" };
          return { ...prev, steps };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[1] = { ...steps[1], status: "error", error: msg };
          return { ...prev, steps, failedStepIndex: 1 };
        });
        toast.error("Capability issuance failed", { description: msg });
        return;
      }
    }

    if (resumeFromStep <= 2 && funding.fundNow) {
      try {
        const amountLamports = Math.floor(Number(funding.amount) * LAMPORTS_PER_SOL);
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: agentPda,
            lamports: amountLamports,
          })
        );
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");

        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[2] = { ...steps[2], status: "done", tx: sig };
          return { ...prev, steps };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setDeployState((prev) => {
          const steps = [...prev.steps];
          steps[2] = { ...steps[2], status: "error", error: msg };
          return { ...prev, steps, failedStepIndex: 2 };
        });
        toast.error("Funding transfer failed", { description: msg });
        return;
      }
    }

    setStep("success");
  };

  const StepIndicator = () => (
    <div className="mb-6 flex items-center justify-between">
      {[
        { num: 1, label: "Template" },
        { num: 2, label: "Identity" },
        { num: 3, label: "Capabilities" },
        { num: 4, label: "Fund" },
        { num: 5, label: "Review" },
      ].map((s, idx, arr) => (
        <div key={s.num} className="flex flex-1 items-center">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === "success"
                ? "bg-emerald-500 text-white"
                : step >= s.num || (step === 5 && s.num === 5)
                ? "bg-emerald-500 text-white"
                : "bg-neutral-800 text-neutral-500"
            }`}>
              {step === "success" || (typeof step === "number" && step > s.num) || step === 5 ? (
                s.num === 5 && step !== "success" ? 5 : <CheckCircle2 className="h-4 w-4" />
              ) : (
                s.num
              )}
            </div>
            <span className={`mt-1 text-xs font-medium ${(typeof step === "number" && step >= s.num) || step === "success" ? "text-emerald-400" : "text-neutral-500"}`}>
              {s.label}
            </span>
          </div>
          {idx < arr.length - 1 && (
            <div className={`mx-2 h-[2px] flex-1 rounded ${(typeof step === "number" && step > s.num) || step === "success" ? "bg-emerald-500/40" : "bg-neutral-800"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const BackButton = ({ to }: { to: typeof step }) => (
    <Button variant="ghost" size="sm" onClick={() => setStep(to)} className="text-neutral-500 hover:text-white">
      <ChevronLeft className="h-4 w-4" /> Back
    </Button>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vault/agents")} className="text-neutral-500 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Cancel
        </Button>
      </div>

      <StepIndicator />

      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" {...fade} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
                  <p className="text-sm text-neutral-500">Start from a pre-configured agent template or customize from scratch.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {AGENT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t.id)}
                      className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-white/[0.12] ${
                        selectedTemplateId === t.id ? "border-sky-500/40 bg-sky-500/5" : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                        {getTemplateIcon(t.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{t.name}</span>
                          <Badge variant="outline" className="text-xs border-white/[0.08] text-neutral-400">{t.category}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{t.description}</p>
                        <p className="mt-2 text-xs text-neutral-600">
                          {t.capabilities.length} capability{t.capabilities.length === 1 ? "" : "ies"} · {t.identity.type.replace("_", " ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => { setSelectedTemplateId(null); setStep(2); }} variant="ghost" className="text-neutral-400 hover:text-white">
                    Skip template <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" {...fade} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Agent Identity</h2>
                  <p className="text-sm text-neutral-500">Define your agent&apos;s identity and wallet.</p>
                </div>

                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} placeholder="e.g. trading-bot-v1" className="border-neutral-800 bg-neutral-900" />
                  <p className="text-xs text-neutral-500">Max 32 characters. Letters, numbers, hyphens, and underscores only.</p>
                </div>

                <div className="space-y-2">
                  <Label>Agent Type</Label>
                  <select value={identity.type} onChange={(e) => setIdentity({ ...identity, type: e.target.value })} className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white">
                    <option value="trading">Trading Bot</option>
                    <option value="customer_service">Customer Service</option>
                    <option value="data_processor">Data Processor</option>
                    <option value="content_creator">Content Creator</option>
                    <option value="payment">Payment</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Description <span className="text-neutral-500">(optional)</span></Label>
                  <textarea value={identity.description} onChange={(e) => setIdentity({ ...identity, description: sanitizeDisplayString(e.target.value) })} maxLength={256} placeholder="What does this agent do?"
                    className="min-h-[80px] w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-700" />
                  <p className="text-xs text-neutral-500">{identity.description.length}/256</p>
                </div>

                <div className="space-y-3">
                  <Label>Agent Wallet</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={identity.walletMode === "generate" ? "default" : "outline"} size="sm" onClick={handleGenerateWallet} className="flex-1">
                      <Sparkles className="mr-1.5 h-4 w-4" /> Generate New Keypair
                    </Button>
                    <Button type="button" variant={identity.walletMode === "existing" ? "default" : "outline"} size="sm" onClick={() => setIdentity({ ...identity, walletMode: "existing" })} className="flex-1">
                      <Wallet className="mr-1.5 h-4 w-4" /> Use Existing Key
                    </Button>
                  </div>
                  {identity.walletMode === "generate" && generatedKeypair && (
                    <div className="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.03]">
                      <p className="text-xs text-neutral-500">Generated Public Key</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="text-sm text-neutral-300">{generatedKeypair.publicKey.toBase58()}</code>
                        <CopyBtn text={generatedKeypair.publicKey.toBase58()} />
                      </div>
                      <p className="mt-2 text-xs text-amber-400/80">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        Save this keypair securely. It is stored only in memory for this session.
                      </p>
                    </div>
                  )}
                  {identity.walletMode === "existing" && (
                    <Input value={identity.walletKey} onChange={(e) => setIdentity({ ...identity, walletKey: e.target.value })} placeholder="Paste Solana public key"
                      className="border-neutral-800 bg-neutral-900 font-mono text-xs" />
                  )}
                </div>

                <div className="space-y-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIdentity({ ...identity, showTee: !identity.showTee })} className="h-auto p-0 text-neutral-400 hover:text-white">
                    {identity.showTee ? <ChevronRight className="mr-1 h-4 w-4 rotate-90 transition-transform" /> : <ChevronRight className="mr-1 h-4 w-4 transition-transform" />}
                    Advanced: TEE Measurement
                  </Button>
                  {identity.showTee && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                      <Input value={identity.tee} onChange={(e) => setIdentity({ ...identity, tee: e.target.value })} placeholder="Paste 64-character hex hash" className="border-neutral-800 bg-neutral-900 font-mono text-xs" />
                      <p className="text-xs text-neutral-500">If your agent runs in a trusted execution environment, paste the attestation hash here.</p>
                    </motion.div>
                  )}
                </div>

                {identityErrors.length > 0 && (
                  <div className="rounded-lg bg-red-500/5 p-3 text-xs text-red-400 ring-1 ring-red-500/10">
                    {identityErrors.map((e, i) => <div key={i}>• {e}</div>)}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <BackButton to={1} />
                  <Button onClick={() => setStep(3)} disabled={identityErrors.length > 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" {...fade} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Capabilities</h2>
                  <p className="text-sm text-neutral-500">Set spending limits and permissions for this agent.</p>
                </div>

                {capabilities.map((cap, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.04] bg-neutral-900/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Capability {idx + 1}</span>
                      {capabilities.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-auto text-red-400 hover:text-red-300" onClick={() => removeCapability(idx)}>
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Capability Name</Label>
                        <Input value={cap.name} onChange={(e) => updateCapability(idx, { name: e.target.value })} placeholder="e.g. Trading Budget" className="border-neutral-800 bg-neutral-950" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Scope</Label>
                        <select value={cap.scope} onChange={(e) => updateCapability(idx, { scope: e.target.value })} className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white">
                          <option value="payment">Payment</option>
                          <option value="data">DataAction</option>
                          <option value="document">DocumentSign</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Per-TX Limit (SOL)</Label>
                          <Input type="number" min={0} step={0.01} value={cap.perTxLimit} onChange={(e) => updateCapability(idx, { perTxLimit: e.target.value })} className="border-neutral-800 bg-neutral-950" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Daily Limit (SOL)</Label>
                          <Input type="number" min={0} step={0.01} value={cap.dailyLimit} onChange={(e) => updateCapability(idx, { dailyLimit: e.target.value })} className="border-neutral-800 bg-neutral-950" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total Budget (SOL)</Label>
                          <Input type="number" min={0} step={0.01} value={cap.totalLimit} onChange={(e) => updateCapability(idx, { totalLimit: e.target.value })} className="border-neutral-800 bg-neutral-950" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Expiry</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant={!cap.noExpiry && cap.expiryDate === formatDateInput(new Date(Date.now() + 7 * 86400000)) ? "default" : "outline"} size="sm" onClick={() => setExpiryPreset(idx, 7)}>7 days</Button>
                          <Button type="button" variant={!cap.noExpiry && cap.expiryDate === formatDateInput(new Date(Date.now() + 30 * 86400000)) ? "default" : "outline"} size="sm" onClick={() => setExpiryPreset(idx, 30)}>30 days</Button>
                          <Button type="button" variant={!cap.noExpiry && cap.expiryDate === formatDateInput(new Date(Date.now() + 90 * 86400000)) ? "default" : "outline"} size="sm" onClick={() => setExpiryPreset(idx, 90)}>90 days</Button>
                          <Button type="button" variant={cap.noExpiry ? "default" : "outline"} size="sm" onClick={() => setExpiryPreset(idx, null)}>No expiry</Button>
                        </div>
                        {!cap.noExpiry && (
                          <Input type="date" value={cap.expiryDate} onChange={(e) => updateCapability(idx, { expiryDate: e.target.value })} className="border-neutral-800 bg-neutral-950" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Allowed Programs <span className="text-neutral-500">(optional)</span></Label>
                        <textarea value={cap.allowedPrograms} onChange={(e) => updateCapability(idx, { allowedPrograms: e.target.value })} placeholder="Paste program pubkeys, one per line or comma-separated"
                          className="min-h-[60px] w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-700" />
                      </div>

                      <div className="rounded-lg bg-neutral-950/50 p-3 ring-1 ring-white/[0.03]">
                        <p className="text-sm font-medium text-white">📋 {cap.name || "Untitled Capability"}</p>
                        <p className="text-xs text-neutral-400">
                          Max per tx: {cap.perTxLimit || "0"} SOL | Daily: {cap.dailyLimit || "0"} SOL | Total: {cap.totalLimit || "0"} SOL
                          <br />
                          Expires: {cap.noExpiry ? "Never" : cap.expiryDate || "—"}
                          <br />
                          Programs: {cap.allowedPrograms.trim() ? "Custom list" : SCOPE_LABELS[cap.scope] || "Unrestricted"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addCapability} className="w-full">
                  + Add Another Capability
                </Button>

                {capabilityErrors.length > 0 && (
                  <div className="rounded-lg bg-red-500/5 p-3 text-xs text-red-400 ring-1 ring-red-500/10">
                    {capabilityErrors.map((e, i) => <div key={i}>• {e}</div>)}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <BackButton to={2} />
                  <Button onClick={() => setStep(4)} disabled={capabilityErrors.length > 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" {...fade} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Fund Agent</h2>
                  <p className="text-sm text-neutral-500">Send SOL to the agent wallet so it can pay for transactions.</p>
                </div>

                <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.03]">
                  <p className="text-xs text-neutral-500">Agent Wallet Address</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-sm text-neutral-300">{agentWalletKey}</code>
                    <CopyBtn text={agentWalletKey} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-neutral-900/30 p-3 ring-1 ring-white/[0.03]">
                    <p className="text-xs text-neutral-500">Total Capability Budget</p>
                    <p className="text-lg font-semibold text-white">{totalCapabilityBudget.toFixed(4)} SOL</p>
                  </div>
                  <div className="rounded-lg bg-neutral-900/30 p-3 ring-1 ring-white/[0.03]">
                    <p className="text-xs text-neutral-500">Est. TX Fees</p>
                    <p className="text-lg font-semibold text-white">~0.01 SOL</p>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-3">
                  <p className="text-sm font-medium text-emerald-200">Recommended funding</p>
                  <p className="text-xl font-bold text-white">{recommendedFunding.toFixed(4)} SOL</p>
                  <p className="text-xs text-emerald-400/60">Total budget + 0.05 SOL for fees</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input id="fund-now" type="checkbox" checked={funding.fundNow} onChange={(e) => setFunding({ ...funding, fundNow: e.target.checked })} className="h-4 w-4 rounded border-neutral-700 bg-neutral-900" />
                    <Label htmlFor="fund-now" className="text-sm text-neutral-300">Fund now via transfer</Label>
                  </div>
                  {funding.fundNow && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                      <Label className="text-xs">Amount (SOL)</Label>
                      <Input type="number" min={0} step={0.001} value={funding.amount} onChange={(e) => setFunding({ ...funding, amount: e.target.value })} className="border-neutral-800 bg-neutral-900" />
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <BackButton to={3} />
                  <Button onClick={() => setStep(5)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    Review <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" {...fade} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Review & Deploy</h2>
                  <p className="text-sm text-neutral-500">Confirm everything before submitting on-chain.</p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-white/[0.04] bg-neutral-900/30 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-white">Agent Identity</h3>
                    <div className="grid grid-cols-1 gap-1 text-sm text-neutral-400 sm:grid-cols-2">
                      <div><span className="text-neutral-500">Name:</span> {identity.name}</div>
                      <div><span className="text-neutral-500">Type:</span> {identity.type.replace("_", " ")}</div>
                      <div className="sm:col-span-2"><span className="text-neutral-500">Description:</span> {identity.description || "—"}</div>
                      <div className="sm:col-span-2"><span className="text-neutral-500">Wallet:</span> <code className="text-neutral-300">{agentWalletKey}</code></div>
                      {identity.tee && <div className="sm:col-span-2"><span className="text-neutral-500">TEE:</span> <code className="text-neutral-300">{identity.tee.slice(0, 16)}…</code></div>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.04] bg-neutral-900/30 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-white">Capabilities ({capabilities.length})</h3>
                    <div className="space-y-2">
                      {capabilities.map((cap, i) => (
                        <div key={i} className="rounded bg-neutral-950/50 p-2 text-sm">
                          <p className="font-medium text-neutral-300">{cap.name}</p>
                          <p className="text-xs text-neutral-500">
                            {SCOPE_LABELS[cap.scope]} · {cap.perTxLimit} SOL/tx · {cap.dailyLimit} SOL/day · {cap.totalLimit} SOL total · {cap.noExpiry ? "No expiry" : `Expires ${cap.expiryDate}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.04] bg-neutral-900/30 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-white">Funding</h3>
                    <p className="text-sm text-neutral-400">
                      {funding.fundNow ? `${Number(funding.amount).toFixed(4)} SOL will be transferred to the agent wallet.` : "No funding transfer. You can fund the wallet later."}
                    </p>
                  </div>
                </div>

                {deployState.steps.some((s) => s.status !== "pending") && (
                  <div className="rounded-lg border border-white/[0.04] bg-neutral-950 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-white">Deployment Progress</h4>
                    <div className="space-y-2">
                      {deployState.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          {s.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
                          {s.status === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {s.status === "pending" && <div className="h-4 w-4 rounded-full border border-neutral-700" />}
                          <span className={s.status === "error" ? "text-red-400" : s.status === "done" ? "text-emerald-400" : "text-neutral-300"}>{s.label}</span>
                          {s.tx && (
                            <a href={`https://explorer.solana.com/tx/${s.tx}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">
                              View TX
                            </a>
                          )}
                          {s.error && <span className="text-xs text-red-400">{s.error}</span>}
                        </div>
                      ))}
                    </div>
                    {deployState.failedStepIndex !== null && (
                      <Button onClick={() => deploy(deployState.failedStepIndex!)} className="mt-4 gap-2 bg-amber-600 hover:bg-amber-700">
                        <RefreshCw className="h-4 w-4" /> Retry from failed step
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <BackButton to={4} />
                  <Button
                    onClick={() => deploy(0)}
                    disabled={deployState.steps.some((s) => s.status === "running") || deployState.failedStepIndex !== null}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {deployState.steps.some((s) => s.status === "running") ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Deploying…</>
                    ) : deployState.failedStepIndex !== null ? (
                      <><AlertTriangle className="h-4 w-4" /> Failed</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Deploy Agent</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Agent Deployed!</h2>
                <p className="mb-6 text-sm text-neutral-500">Your agent is now registered on-chain with its capabilities.</p>

                <div className="mb-6 w-full max-w-sm rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.03]">
                  <p className="text-xs text-neutral-500">Agent PDA</p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <code className="text-sm text-neutral-300">{deployState.agentPda}</code>
                    <CopyBtn text={deployState.agentPda || ""} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => router.push(`/vault/agents/${deployState.agentPda}`)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Bot className="h-4 w-4" /> View Agent
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/vault/agents/new")} className="gap-2">
                    <Sparkles className="h-4 w-4" /> Deploy Another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); toast.success("Copied!"); setTimeout(() => setOk(false), 1200); }}
      className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
