"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
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
  buildInitializeGuardedDwalletDemoIx,
  buildFreezeGuardedDwalletIx,
  buildUnfreezeGuardedDwalletIx,
  buildApproveGuardedMessageIx,
} from "@/lib/dwallet-guard/instructions";
import {
  GuardedDwallet,
  GuardSigningRequest,
} from "@/lib/hooks/use-dwallet-guard";
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
  Eye,
  Play,
  Snowflake,
  Flame,
  Ban,
  ExternalLink,
  Search,
  Activity,
  LayoutDashboard,
  FlaskConical,
} from "lucide-react";
import ProductDashboard from "@/components/vault/product-dashboard";
import {
  deriveIkaDwalletPda,
  deriveHumanRailGuardCpiAuthority,
  parseIkaDwalletAccount,
  parseIkaMessageApprovalAccount,
  DWalletCurve,
  IkaSignatureScheme as IkaSigScheme,
  IkaDwallet,
  IkaMessageApproval,
} from "@/lib/ika";

const IKA_PROGRAM_ID = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net:443";

export default function DwalletGuardPageClient() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const {
    guardProgramId,
    isConfigured,
    isDeployed,
    isCheckingDeployment,
    deploymentError,
    deriveCpiAuthority,
    deriveGuardedDwallet,
    deriveGuardSigningRequest,
    fetchGuardedDwallet,
    fetchGuardSigningRequest,
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
    const assetHash = hashPolicyInput(assetInput);
    const recipientHash = hashPolicyInput(recipientInput || "any");
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
    const digest = keccak256(messageInput);
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

  // -----------------------------------------------------------------------
  // Phase 4B Devnet Demo State
  // -----------------------------------------------------------------------
  const [fetchedGuarded, setFetchedGuarded] = useState<GuardedDwallet | null>(null);
  const [fetchedRequest, setFetchedRequest] = useState<GuardSigningRequest | null>(null);
  const [txLoading, setTxLoading] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessNote, setTxSuccessNote] = useState<string | null>(null);

  // Production policy inputs (disabled)
  const [prodHumanProfile, setProdHumanProfile] = useState("");
  const [prodAgent, setProdAgent] = useState("");
  const [prodCapability, setProdCapability] = useState("");
  const [prodDwallet, setProdDwallet] = useState("");

  // Phase 5A Ika Readiness panel state
  const [ikaDwalletPubkeyInput, setIkaDwalletPubkeyInput] = useState("");
  const [ikaDwalletCurve, setIkaDwalletCurve] = useState<DWalletCurve>(DWalletCurve.Curve25519);
  const [ikaMessageApprovalInput, setIkaMessageApprovalInput] = useState("");
  const [derivedIkaDwalletPda, setDerivedIkaDwalletPda] = useState<string | null>(null);
  const [fetchedIkaDwallet, setFetchedIkaDwallet] = useState<IkaDwallet | null>(null);
  const [fetchedIkaMessageApproval, setFetchedIkaMessageApproval] = useState<IkaMessageApproval | null>(null);
  const [ikaProgramExecutable, setIkaProgramExecutable] = useState<boolean | null>(null);
  const [ikaLoading, setIkaLoading] = useState<string | null>(null);

  // Phase 5C real Ika dWallet state
  const REAL_IKA_DWALLET_PDA = "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp";
  const REAL_IKA_PUBLIC_KEY = "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d";
  const REAL_IKA_AUTHORITY_BEFORE = "5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y";
  const REAL_IKA_AUTHORITY_AFTER = "FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd";
  const REAL_IKA_TRANSFER_SIG = "33xoiwuXmu56hC5Ks18kn6zMota41PNMGHu1KkVdzyFRnRcXX1VCdtK64Jg1LzSku5HuTWkxU6jvaFt63AXxUhtz";
  const REAL_GUARDED_DWALLET_PDA = "C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup";
  const [realIkaDwallet, setRealIkaDwallet] = useState<IkaDwallet | null>(null);
  const [realGuardedDwallet, setRealGuardedDwallet] = useState<GuardedDwallet | null>(null);

  // Phase 5D/5E approved signing request state
  const [phase5dArtifact, setPhase5dArtifact] = useState<{
    preimage: string;
    messageDigestHex: string;
    signatureScheme: string;
    guardSigningRequestPda: string;
    ikaMessageApprovalPda: string;
    approveGuardedMessageSignature: string;
    amount: string;
    destinationChainId: number;
    status: string;
    // Phase 5E optional fields
    ikaSignatureHex?: string;
    ikaSignatureBase64?: string;
    signatureLen?: number;
    onChainSignatureHex?: string;
    signedAt?: string;
  } | null>(null);
  const [phase5dGuardSigningRequest, setPhase5dGuardSigningRequest] = useState<GuardSigningRequest | null>(null);
  const [phase5dMessageApproval, setPhase5dMessageApproval] = useState<IkaMessageApproval | null>(null);
  const [phase5dLoading, setPhase5dLoading] = useState<string | null>(null);

  // Phase 4B known demo addresses
  const PHASE4B = useMemo(() => {
    if (!guardProgramId) return null;
    const principal = new PublicKey("5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y");
    const humanProfile = new PublicKey("CFzvySB43C2xQnJ6YzZHaH5aLxNaivPTK58KhK6rcaTs");
    const agent = new PublicKey("7MU4iHWD7cwHeQ28bdufZE47W4N6pAbSyLr63aX5awQ3");
    const capability = new PublicKey("F91EysWYw4xa4rBhHzkq9hVMVqHhD6kGWAfYRm46vut7");
    const dwallet = new PublicKey("9NNE4v7DcuQA9fL868wwgx8jsz3pn9EKr97ZADLnw12p");
    const guardedDwallet = new PublicKey("FNt1H6B4ZyDMPvZj2VUX5KYr6PjwYLCxWAgjifoeFM4b");
    const guardSigningRequest = new PublicKey("AwQUee1KHkitvEy3BAAM9ostZdDawxiquMaoSnuwUsqV");
    const [cpiAuthority] = deriveCpiAuthority();
    return {
      principal,
      humanProfile,
      agent,
      capability,
      dwallet,
      guardedDwallet,
      guardSigningRequest,
      cpiAuthority,
    };
  }, [guardProgramId, deriveCpiAuthority]);

  const explorerLink = (address: string) =>
    `https://explorer.solana.com/address/${address}?cluster=devnet`;
  const txExplorerLink = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  const isDemoPrincipal = useMemo(() => {
    if (!publicKey || !PHASE4B) return false;
    return publicKey.toBase58() === PHASE4B.principal.toBase58();
  }, [publicKey, PHASE4B]);

  // -----------------------------------------------------------------------
  // Fetch helpers
  // -----------------------------------------------------------------------
  const handleFetchGuarded = useCallback(async () => {
    if (!PHASE4B) return;
    const data = await fetchGuardedDwallet(PHASE4B.guardedDwallet);
    setFetchedGuarded(data);
  }, [PHASE4B, fetchGuardedDwallet]);

  const handleFetchRequest = useCallback(async () => {
    if (!PHASE4B) return;
    const data = await fetchGuardSigningRequest(PHASE4B.guardSigningRequest);
    setFetchedRequest(data);
  }, [PHASE4B, fetchGuardSigningRequest]);

  // -----------------------------------------------------------------------
  // Phase 5D helpers
  // -----------------------------------------------------------------------
  const handleLoadPhase5dArtifact = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setPhase5dArtifact(parsed);
      localStorage.setItem("hr_phase5d_artifact", jsonString);
    } catch (err) {
      console.error("Failed to parse Phase 5D artifact:", err);
    }
  }, []);

  const handleFetchPhase5dGuardSigningRequest = useCallback(async () => {
    if (!phase5dArtifact?.guardSigningRequestPda) return;
    setPhase5dLoading("Fetching GuardSigningRequest");
    try {
      const data = await fetchGuardSigningRequest(new PublicKey(phase5dArtifact.guardSigningRequestPda));
      setPhase5dGuardSigningRequest(data);
    } catch (err) {
      console.error("Fetch Phase 5D GSR failed:", err);
    } finally {
      setPhase5dLoading(null);
    }
  }, [phase5dArtifact, fetchGuardSigningRequest]);

  const handleFetchPhase5dMessageApproval = useCallback(async () => {
    if (!phase5dArtifact?.ikaMessageApprovalPda) return;
    setPhase5dLoading("Fetching MessageApproval");
    try {
      const info = await connection.getAccountInfo(new PublicKey(phase5dArtifact.ikaMessageApprovalPda));
      if (info) {
        const parsed = parseIkaMessageApprovalAccount(info.data as Buffer);
        setPhase5dMessageApproval(parsed);
      } else {
        setPhase5dMessageApproval(null);
      }
    } catch (err) {
      console.error("Fetch Phase 5D MA failed:", err);
      setPhase5dMessageApproval(null);
    } finally {
      setPhase5dLoading(null);
    }
  }, [phase5dArtifact, connection]);

  // Load artifact from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hr_phase5d_artifact");
      if (saved) {
        setPhase5dArtifact(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // -----------------------------------------------------------------------
  // Demo transaction helpers
  // -----------------------------------------------------------------------
  const sendDemoTx = useCallback(async (label: string, buildIx: () => TransactionInstruction, successNote?: string) => {
    if (!publicKey || !connection || !sendTransaction) {
      setTxError("Wallet not connected");
      return;
    }
    setTxLoading(label);
    setTxSig(null);
    setTxError(null);
    setTxSuccessNote(null);
    try {
      const tx = new Transaction().add(buildIx());
      const sig = await sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      setTxSig(sig);
      if (successNote) setTxSuccessNote(successNote);
      await handleFetchGuarded();
    } catch (err) {
      console.error(`${label} failed:`, err);
      setTxError(err instanceof Error ? err.message : String(err));
    } finally {
      setTxLoading(null);
    }
  }, [publicKey, connection, sendTransaction, handleFetchGuarded]);

  const demoInitialize = useCallback(() => {
    if (!guardProgramId || !PHASE4B) return;
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
    sendDemoTx("Initialize Demo", () =>
      buildInitializeGuardedDwalletDemoIx(guardProgramId, {
        principal: PHASE4B.principal,
        guardedDwallet: PHASE4B.guardedDwallet,
        humanProfile: PHASE4B.humanProfile,
        agent: PHASE4B.agent,
        humanrailCapability: PHASE4B.capability,
        dwallet: PHASE4B.dwallet,
        allowedChainId: 84532,
        allowedAssetHash: hashPolicyInput("USDC:BASE_SEPOLIA"),
        allowedRecipientHash: hashPolicyInput("0x1111111111111111111111111111111111111111"),
        perTxLimit: BigInt(100_000_000),
        dailyLimit: BigInt(500_000_000),
        totalLimit: BigInt(1_000_000_000),
        expiresAt,
      })
    );
  }, [guardProgramId, PHASE4B, sendDemoTx]);

  const demoFreeze = useCallback(() => {
    if (!guardProgramId || !PHASE4B) return;
    sendDemoTx("Freeze", () =>
      buildFreezeGuardedDwalletIx(guardProgramId, {
        principal: PHASE4B.principal,
        guardedDwallet: PHASE4B.guardedDwallet,
      })
    );
  }, [guardProgramId, PHASE4B, sendDemoTx]);

  const demoUnfreeze = useCallback(() => {
    if (!guardProgramId || !PHASE4B) return;
    sendDemoTx("Unfreeze", () =>
      buildUnfreezeGuardedDwalletIx(guardProgramId, {
        principal: PHASE4B.principal,
        guardedDwallet: PHASE4B.guardedDwallet,
      })
    );
  }, [guardProgramId, PHASE4B, sendDemoTx]);

  const demoRejectedRequest = useCallback(() => {
    if (!guardProgramId || !PHASE4B) return;
    const message = "HumanRail Guarded dWallet demo rejected request";
    const messageDigest = hashPolicyInput(message);
    const messageMetadataDigest = hashPolicyInput("phase-4b-metadata");
    const requestId = keccak256("phase-4b-rejected-request-" + Date.now().toString());
    const assetHash = hashPolicyInput("USDC:BASE_SEPOLIA");
    const recipientHash = hashPolicyInput("0x1111111111111111111111111111111111111111");
    const [requestPda] = deriveGuardSigningRequest(PHASE4B.guardedDwallet, requestId);
    const dummyCoordinator = new PublicKey("11111111111111111111111111111111");
    const dummyMessageApproval = new PublicKey("11111111111111111111111111111111");

    sendDemoTx("Rejected Request", () =>
      buildApproveGuardedMessageIx(guardProgramId, {
        requester: PHASE4B.principal,
        guardedDwallet: PHASE4B.guardedDwallet,
        guardSigningRequest: requestPda,
        dwallet: PHASE4B.dwallet,
        cpiAuthority: PHASE4B.cpiAuthority,
        coordinator: dummyCoordinator,
        messageApproval: dummyMessageApproval,
        requestId,
        messageDigest,
        messageMetadataDigest,
        destinationChainId: 84532,
        assetHash,
        recipientHash,
        amount: BigInt(101_000_000),
        userPubkey: PHASE4B.principal.toBytes(),
        signatureScheme: 0,
        messageApprovalBump: 0,
      }),
      "Rejected request recorded; Ika CPI was not called."
    );
  }, [guardProgramId, PHASE4B, sendDemoTx, deriveGuardSigningRequest]);

  return (
    <div className="space-y-6">
      {/* Advanced Technical Proof banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <FlaskConical className="h-4 w-4 text-amber-400" />
              Advanced Technical Proof
            </p>
            <p className="max-w-xl text-xs text-amber-200/70">
              This page preserves the HumanRail + Ika devnet proof: program IDs, PDAs, Guard CPI approval,
              Ika MessageApproval, and signed devnet lifecycle. For normal product onboarding, use the
              Mandara Console.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.location.href = "/mandara/app"}
              className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
            >
              Open Mandara Console
            </button>
            <button
              onClick={() => window.location.href = "/mandara/app/onboarding"}
              className="shrink-0 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
            >
              Start Onboarding
            </button>
          </div>
        </div>
      </div>

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

      {/* Mandara product branding */}
      <div className="space-y-3 rounded-xl border border-white/[0.06] bg-neutral-900/50 p-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Mandara by HumanRail</h2>
          <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">
            Ika Grant Demo
          </Badge>
        </div>
        <p className="text-sm text-neutral-400">
          Programmable mandates for cross-chain AI agents, powered by Ika dWallets.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200/80">
            <CheckCircle2 className="h-3 w-3" />
            1. Guard policy
          </div>
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200/80">
            <CheckCircle2 className="h-3 w-3" />
            2. Ika approval
          </div>
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200/80">
            <CheckCircle2 className="h-3 w-3" />
            3. Signed MessageApproval
          </div>
        </div>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="product" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-neutral-900">
          <TabsTrigger value="product">
            <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
            Product Dashboard
          </TabsTrigger>
          <TabsTrigger value="config">Grant Proof</TabsTrigger>
          <TabsTrigger value="policy">Policy Creation</TabsTrigger>
          <TabsTrigger value="request">Signing Request</TabsTrigger>
        </TabsList>

        {/* Product Dashboard tab */}
        <TabsContent value="product" className="space-y-4 pt-4">
          <ProductDashboard />
        </TabsContent>

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

          {/* Devnet Proof */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Eye className="h-4 w-4 text-sky-400" />
                Devnet Proof
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Known Phase 4B on-chain addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Active guard program ID", value: "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2" },
                { label: "Phase 4B GuardedDwallet PDA", value: "FNt1H6B4ZyDMPvZj2VUX5KYr6PjwYLCxWAgjifoeFM4b" },
                { label: "Phase 4B GuardSigningRequest PDA", value: "AwQUee1KHkitvEy3BAAM9ostZdDawxiquMaoSnuwUsqV" },
                { label: "dWallet placeholder", value: "9NNE4v7DcuQA9fL868wwgx8jsz3pn9EKr97ZADLnw12p" },
                { label: "Human Profile (demo)", value: "CFzvySB43C2xQnJ6YzZHaH5aLxNaivPTK58KhK6rcaTs" },
                { label: "Agent (demo)", value: "7MU4iHWD7cwHeQ28bdufZE47W4N6pAbSyLr63aX5awQ3" },
                { label: "Capability (demo)", value: "F91EysWYw4xa4rBhHzkq9hVMVqHhD6kGWAfYRm46vut7" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <span className="text-xs text-neutral-500">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {item.value}
                    </code>
                    <a
                      href={explorerLink(item.value)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(item.value)}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Fetch Phase 4B accounts */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Play className="h-4 w-4 text-emerald-400" />
                Fetch Phase 4B Accounts
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Read on-chain guard state
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchGuarded}
                  disabled={!isDeployed || !PHASE4B}
                  className="text-xs"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Fetch Phase 4B Policy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchRequest}
                  disabled={!isDeployed || !PHASE4B}
                  className="text-xs"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Fetch Rejected Request
                </Button>
              </div>

              {fetchedGuarded && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3">
                  <p className="text-xs font-medium text-neutral-400">GuardedDwallet</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-neutral-500">Principal</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.principal.toBase58()}</code>
                    <div className="text-neutral-500">Agent</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.agent.toBase58()}</code>
                    <div className="text-neutral-500">dWallet</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.dwallet.toBase58()}</code>
                    <div className="text-neutral-500">Allowed Chain</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.allowedChainId}</code>
                    <div className="text-neutral-500">Per-Tx Limit</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.perTxLimit.toString()}</code>
                    <div className="text-neutral-500">Daily Limit</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.dailyLimit.toString()}</code>
                    <div className="text-neutral-500">Total Limit</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.totalLimit.toString()}</code>
                    <div className="text-neutral-500">Frozen</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.frozen ? "Yes" : "No"}</code>
                    <div className="text-neutral-500">Expires At</div>
                    <code className="truncate text-neutral-400">{fetchedGuarded.expiresAt.toString()}</code>
                  </div>
                </div>
              )}

              {fetchedRequest && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3">
                  <p className="text-xs font-medium text-neutral-400">GuardSigningRequest</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-neutral-500">Status</div>
                    <code className="truncate text-neutral-400">{fetchedRequest.status}</code>
                    <div className="text-neutral-500">Rejection Code</div>
                    <code className="truncate text-neutral-400">{fetchedRequest.rejectionCode}</code>
                    <div className="text-neutral-500">Ika Message Approval</div>
                    <code className="truncate text-neutral-400">{fetchedRequest.ikaMessageApproval.toBase58()}</code>
                    <div className="text-neutral-500">Amount</div>
                    <code className="truncate text-neutral-400">{fetchedRequest.amount.toString()}</code>
                    <div className="text-neutral-500">Destination Chain</div>
                    <code className="truncate text-neutral-400">{fetchedRequest.destinationChainId}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 5A Ika Readiness Panel */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Activity className="h-4 w-4 text-purple-400" />
                Ika Readiness
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Phase 5A — Read-only helpers, PDA derivations, account parsers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phase 5 status banner */}
              <div className="flex items-start gap-3 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                <Radio className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-200">
                    Phase 5 status: read-only helpers added
                  </p>
                  <p className="text-[11px] text-purple-200/60">
                    dWallet DKG and gRPC signing not yet executed. Inspect Ika program state, derive PDAs, and fetch accounts below.
                  </p>
                </div>
              </div>

              {/* Ika program status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Ika program executable</span>
                <Badge
                  variant={
                    ikaProgramExecutable === null
                      ? "secondary"
                      : ikaProgramExecutable
                      ? "default"
                      : "destructive"
                  }
                >
                  {ikaProgramExecutable === null
                    ? "Unknown"
                    : ikaProgramExecutable
                    ? "Yes"
                    : "No"}
                </Badge>
              </div>

              {/* Guard CPI authority */}
              {guardProgramId && (
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">Guard CPI Authority PDA</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const [pda] = deriveHumanRailGuardCpiAuthority(guardProgramId);
                      return (
                      <>
                        <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                          {pda.toBase58()}
                        </code>
                        <button
                          onClick={() => copyToClipboard(pda.toBase58())}
                          className="text-neutral-500 hover:text-neutral-300"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Check Ika program status button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIkaLoading("Checking Ika program");
                  try {
                    const info = await connection.getAccountInfo(new PublicKey(IKA_PROGRAM_ID));
                    setIkaProgramExecutable(info?.executable === true);
                  } catch (err) {
                    console.error("Ika program check failed:", err);
                    setIkaProgramExecutable(false);
                  } finally {
                    setIkaLoading(null);
                  }
                }}
                disabled={ikaLoading !== null}
                className="text-xs"
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                Check Ika Program Status
              </Button>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="mb-2 text-xs font-medium text-neutral-400">Inspect Ika Accounts</p>

                {/* dWallet public key input */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">dWallet Public Key (optional)</Label>
                  <Input
                    placeholder="Paste dWallet public key bytes (base58)"
                    value={ikaDwalletPubkeyInput}
                    onChange={(e) => setIkaDwalletPubkeyInput(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600"
                  />
                </div>

                {/* Curve selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">Curve</Label>
                  <select
                    className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-purple-500/30"
                    value={ikaDwalletCurve}
                    onChange={(e) => setIkaDwalletCurve(Number(e.target.value) as DWalletCurve)}
                  >
                    {Object.entries(DWalletCurve)
                      .filter(([, v]) => typeof v === "number")
                      .map(([name, value]) => (
                        <option key={value} value={value}>
                          {name} ({value})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Derive dWallet PDA */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      const pk = new PublicKey(ikaDwalletPubkeyInput || "11111111111111111111111111111111");
                      const [pda] = deriveIkaDwalletPda(ikaDwalletCurve, pk.toBytes());
                      setDerivedIkaDwalletPda(pda.toBase58());
                    } catch (err) {
                      setDerivedIkaDwalletPda(null);
                      console.error("PDA derivation failed:", err);
                    }
                  }}
                  disabled={!ikaDwalletPubkeyInput}
                  className="text-xs"
                >
                  <Fingerprint className="mr-1.5 h-3.5 w-3.5" />
                  Derive dWallet PDA
                </Button>

                {derivedIkaDwalletPda && (
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500">Derived dWallet PDA</span>
                    <div className="flex items-center gap-2">
                      <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                        {derivedIkaDwalletPda}
                      </code>
                      <button
                        onClick={() => copyToClipboard(derivedIkaDwalletPda)}
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={explorerLink(derivedIkaDwalletPda)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Fetch dWallet account */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!derivedIkaDwalletPda) return;
                    setIkaLoading("Fetching dWallet");
                    try {
                      const info = await connection.getAccountInfo(new PublicKey(derivedIkaDwalletPda));
                      if (info) {
                        const parsed = parseIkaDwalletAccount(info.data as Buffer);
                        setFetchedIkaDwallet(parsed);
                      } else {
                        setFetchedIkaDwallet(null);
                      }
                    } catch (err) {
                      console.error("Fetch dWallet failed:", err);
                      setFetchedIkaDwallet(null);
                    } finally {
                      setIkaLoading(null);
                    }
                  }}
                  disabled={!derivedIkaDwalletPda || ikaLoading !== null}
                  className="text-xs"
                >
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Fetch dWallet Account
                </Button>

                {fetchedIkaDwallet && (
                  <div className="space-y-2 rounded-lg bg-black/20 p-3">
                    <p className="text-xs font-medium text-neutral-400">IkaDwallet</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-neutral-500">Authority</div>
                      <code className="truncate text-neutral-400">{fetchedIkaDwallet.authority.toBase58()}</code>
                      <div className="text-neutral-500">Curve</div>
                      <code className="truncate text-neutral-400">{DWalletCurve[fetchedIkaDwallet.curve]} ({fetchedIkaDwallet.curve})</code>
                      <div className="text-neutral-500">State</div>
                      <code className="truncate text-neutral-400">{["DKGInProgress", "Active", "Frozen"][fetchedIkaDwallet.state] ?? fetchedIkaDwallet.state}</code>
                      <div className="text-neutral-500">Public Key Len</div>
                      <code className="truncate text-neutral-400">{fetchedIkaDwallet.publicKeyLen}</code>
                      <div className="text-neutral-500">Created Epoch</div>
                      <code className="truncate text-neutral-400">{fetchedIkaDwallet.createdEpoch.toString()}</code>
                      <div className="text-neutral-500">Is Imported</div>
                      <code className="truncate text-neutral-400">{fetchedIkaDwallet.isImported ? "Yes" : "No"}</code>
                      <div className="text-neutral-500">Bump</div>
                      <code className="truncate text-neutral-400">{fetchedIkaDwallet.bump}</code>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                {/* MessageApproval pubkey input */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-400">MessageApproval Pubkey (optional)</Label>
                  <Input
                    placeholder="Paste MessageApproval PDA"
                    value={ikaMessageApprovalInput}
                    onChange={(e) => setIkaMessageApprovalInput(e.target.value)}
                    className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600"
                  />
                </div>

                {/* Fetch MessageApproval account */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!ikaMessageApprovalInput) return;
                    setIkaLoading("Fetching MessageApproval");
                    try {
                      const info = await connection.getAccountInfo(new PublicKey(ikaMessageApprovalInput));
                      if (info) {
                        const parsed = parseIkaMessageApprovalAccount(info.data as Buffer);
                        setFetchedIkaMessageApproval(parsed);
                      } else {
                        setFetchedIkaMessageApproval(null);
                      }
                    } catch (err) {
                      console.error("Fetch MessageApproval failed:", err);
                      setFetchedIkaMessageApproval(null);
                    } finally {
                      setIkaLoading(null);
                    }
                  }}
                  disabled={!ikaMessageApprovalInput || ikaLoading !== null}
                  className="text-xs"
                >
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Fetch MessageApproval Account
                </Button>

                {fetchedIkaMessageApproval && (
                  <div className="space-y-2 rounded-lg bg-black/20 p-3">
                    <p className="text-xs font-medium text-neutral-400">IkaMessageApproval</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-neutral-500">dWallet</div>
                      <code className="truncate text-neutral-400">{fetchedIkaMessageApproval.dwallet.toBase58()}</code>
                      <div className="text-neutral-500">Message Digest</div>
                      <code className="truncate text-neutral-400">{Buffer.from(fetchedIkaMessageApproval.messageDigest).toString("hex").slice(0, 16)}…</code>
                      <div className="text-neutral-500">Approver</div>
                      <code className="truncate text-neutral-400">{fetchedIkaMessageApproval.approver.toBase58()}</code>
                      <div className="text-neutral-500">Signature Scheme</div>
                      <code className="truncate text-neutral-400">{IkaSigScheme[fetchedIkaMessageApproval.signatureScheme]} ({fetchedIkaMessageApproval.signatureScheme})</code>
                      <div className="text-neutral-500">Status</div>
                      <code className="truncate text-neutral-400">{fetchedIkaMessageApproval.status === 1 ? "Signed" : "Pending"}</code>
                      <div className="text-neutral-500">Signature Len</div>
                      <code className="truncate text-neutral-400">{fetchedIkaMessageApproval.signatureLen}</code>
                      {fetchedIkaMessageApproval.signatureLen > 0 && (
                        <>
                          <div className="text-neutral-500">Signature</div>
                          <code className="truncate text-neutral-400">{Buffer.from(fetchedIkaMessageApproval.signature).toString("hex").slice(0, 16)}…</code>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {ikaLoading && (
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  {ikaLoading}…
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 5C Real Ika dWallet Card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Wallet className="h-4 w-4 text-emerald-400" />
                Real Ika dWallet
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Phase 5C — Real dWallet created via gRPC DKG, authority transferred to Guard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-emerald-200">Authority transferred ✅</p>
                  <p className="text-[11px] text-emerald-200/60">
                    dWallet authority moved from deployer to HumanRail Guard CPI PDA.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">dWallet PDA</span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {REAL_IKA_DWALLET_PDA}
                    </code>
                    <button onClick={() => copyToClipboard(REAL_IKA_DWALLET_PDA)} className="text-neutral-500 hover:text-neutral-300">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a href={`https://solana.fm/address/${REAL_IKA_DWALLET_PDA}?cluster=devnet-alpha`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-neutral-300">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">Signing Public Key</span>
                  <code className="block truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                    {REAL_IKA_PUBLIC_KEY}
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-neutral-500">Authority before</div>
                  <code className="truncate text-neutral-400">{REAL_IKA_AUTHORITY_BEFORE.slice(0, 16)}…</code>
                  <div className="text-neutral-500">Authority after</div>
                  <code className="truncate text-neutral-400">{REAL_IKA_AUTHORITY_AFTER.slice(0, 16)}…</code>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">Transfer Transaction</span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {REAL_IKA_TRANSFER_SIG.slice(0, 24)}…
                    </code>
                    <a href={`https://solana.fm/tx/${REAL_IKA_TRANSFER_SIG}?cluster=devnet-alpha`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-neutral-300">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIkaLoading("Fetching real dWallet");
                  try {
                    const info = await connection.getAccountInfo(new PublicKey(REAL_IKA_DWALLET_PDA));
                    if (info) {
                      const parsed = parseIkaDwalletAccount(info.data as Buffer);
                      setRealIkaDwallet(parsed);
                    } else {
                      setRealIkaDwallet(null);
                    }
                  } catch (err) {
                    console.error("Fetch real dWallet failed:", err);
                    setRealIkaDwallet(null);
                  } finally {
                    setIkaLoading(null);
                  }
                }}
                disabled={ikaLoading !== null}
                className="text-xs"
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Fetch Real Ika dWallet
              </Button>

              {realIkaDwallet && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3">
                  <p className="text-xs font-medium text-neutral-400">On-chain dWallet</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-neutral-500">Authority</div>
                    <code className="truncate text-neutral-400">{realIkaDwallet.authority.toBase58().slice(0, 16)}…</code>
                    <div className="text-neutral-500">State</div>
                    <code className="truncate text-neutral-400">{["DKGInProgress", "Active", "Frozen"][realIkaDwallet.state] ?? realIkaDwallet.state}</code>
                    <div className="text-neutral-500">Curve</div>
                    <code className="truncate text-neutral-400">{DWalletCurve[realIkaDwallet.curve]} ({realIkaDwallet.curve})</code>
                    <div className="text-neutral-500">Public key len</div>
                    <code className="truncate text-neutral-400">{realIkaDwallet.publicKeyLen}</code>
                    <div className="text-neutral-500">Bump</div>
                    <code className="truncate text-neutral-400">{realIkaDwallet.bump}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 5C Real Ika Policy Card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Shield className="h-4 w-4 text-sky-400" />
                Real Ika Policy
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Phase 5C — GuardedDwallet policy linked to real Ika dWallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-sky-200">Policy created ✅</p>
                  <p className="text-[11px] text-sky-200/60">
                    GuardedDwallet PDA initialized with real Ika dWallet and demo HumanRail refs.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500">GuardedDwallet PDA</span>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                      {REAL_GUARDED_DWALLET_PDA}
                    </code>
                    <button onClick={() => copyToClipboard(REAL_GUARDED_DWALLET_PDA)} className="text-neutral-500 hover:text-neutral-300">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a href={`https://solana.fm/address/${REAL_GUARDED_DWALLET_PDA}?cluster=devnet-alpha`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-neutral-300">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-neutral-500">Linked dWallet</div>
                  <code className="truncate text-neutral-400">{REAL_IKA_DWALLET_PDA.slice(0, 16)}…</code>
                  <div className="text-neutral-500">Chain ID</div>
                  <code className="truncate text-neutral-400">84532 (Base Sepolia)</code>
                  <div className="text-neutral-500">Asset</div>
                  <code className="truncate text-neutral-400">USDC:BASE_SEPOLIA</code>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIkaLoading("Fetching real policy");
                  try {
                    const parsed = await fetchGuardedDwallet(new PublicKey(REAL_GUARDED_DWALLET_PDA));
                    setRealGuardedDwallet(parsed);
                  } catch (err) {
                    console.error("Fetch real policy failed:", err);
                    setRealGuardedDwallet(null);
                  } finally {
                    setIkaLoading(null);
                  }
                }}
                disabled={ikaLoading !== null}
                className="text-xs"
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Fetch Real Ika GuardedDwallet
              </Button>

              {realGuardedDwallet && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3">
                  <p className="text-xs font-medium text-neutral-400">On-chain Policy</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-neutral-500">Principal</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.principal.toBase58().slice(0, 16)}…</code>
                    <div className="text-neutral-500">dWallet</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.dwallet.toBase58().slice(0, 16)}…</code>
                    <div className="text-neutral-500">Per-tx limit</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.perTxLimit.toString()}</code>
                    <div className="text-neutral-500">Daily limit</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.dailyLimit.toString()}</code>
                    <div className="text-neutral-500">Total limit</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.totalLimit.toString()}</code>
                    <div className="text-neutral-500">Frozen</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.frozen ? "Yes" : "No"}</code>
                    <div className="text-neutral-500">Bump</div>
                    <code className="truncate text-neutral-400">{realGuardedDwallet.bump}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 5D Approved Signing Request Card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <FileKey className="h-4 w-4 text-emerald-400" />
                Approved Signing Request — Phase 5D/5E
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Real approve_guarded_message via Guard CPI to Ika approve_message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!phase5dArtifact ? (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">
                    Paste the contents of <code>.local-ika/signing-request.json</code> after running{" "}
                    <code>npm run ika:approve-message</code>:
                  </p>
                  <textarea
                    className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-emerald-500/30"
                    rows={4}
                    placeholder={`{"guardSigningRequestPda":"...","ikaMessageApprovalPda":"..."}`}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        handleLoadPhase5dArtifact(e.target.value.trim());
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-emerald-200">Artifact loaded ✅</p>
                      <p className="text-[11px] text-emerald-200/60">
                        {phase5dMessageApproval?.status === 1 || phase5dArtifact.ikaSignatureHex
                          ? "Phase 5E complete — Ika signature committed on-chain"
                          : phase5dMessageApproval?.status === 0
                          ? "MessageApproval status = Pending — ready for gRPC Sign"
                          : "Fetch on-chain state to verify."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500">Preimage</span>
                      <code className="block truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                        {phase5dArtifact.preimage}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500">Message Digest</span>
                      <code className="block truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                        {phase5dArtifact.messageDigestHex}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-neutral-500">Signature Scheme</div>
                      <code className="truncate text-neutral-400">{phase5dArtifact.signatureScheme}</code>
                      <div className="text-neutral-500">Amount</div>
                      <code className="truncate text-neutral-400">{phase5dArtifact.amount}</code>
                      <div className="text-neutral-500">Destination Chain</div>
                      <code className="truncate text-neutral-400">{phase5dArtifact.destinationChainId}</code>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500">GuardSigningRequest PDA</span>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                          {phase5dArtifact.guardSigningRequestPda}
                        </code>
                        <button onClick={() => copyToClipboard(phase5dArtifact.guardSigningRequestPda)} className="text-neutral-500 hover:text-neutral-300">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500">Ika MessageApproval PDA</span>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                          {phase5dArtifact.ikaMessageApprovalPda}
                        </code>
                        <button onClick={() => copyToClipboard(phase5dArtifact.ikaMessageApprovalPda)} className="text-neutral-500 hover:text-neutral-300">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500">Approve Transaction</span>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                          {phase5dArtifact.approveGuardedMessageSignature.slice(0, 24)}…
                        </code>
                        <a href={`https://solana.fm/tx/${phase5dArtifact.approveGuardedMessageSignature}?cluster=devnet-alpha`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-neutral-300">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchPhase5dGuardSigningRequest}
                      disabled={phase5dLoading !== null}
                      className="text-xs"
                    >
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      Fetch Approved Request
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchPhase5dMessageApproval}
                      disabled={phase5dLoading !== null}
                      className="text-xs"
                    >
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      Fetch MessageApproval
                    </Button>
                  </div>

                  {phase5dLoading && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      {phase5dLoading}…
                    </div>
                  )}

                  {phase5dGuardSigningRequest && (
                    <div className="space-y-2 rounded-lg bg-black/20 p-3">
                      <p className="text-xs font-medium text-neutral-400">GuardSigningRequest on-chain</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="text-neutral-500">Status</div>
                        <code className="truncate text-neutral-400">
                          {phase5dGuardSigningRequest.status === 1 ? "approved" : phase5dGuardSigningRequest.status === 2 ? "rejected" : "unknown"} ({phase5dGuardSigningRequest.status})
                        </code>
                        <div className="text-neutral-500">Rejection code</div>
                        <code className="truncate text-neutral-400">{phase5dGuardSigningRequest.rejectionCode}</code>
                        <div className="text-neutral-500">IkaMessageApproval</div>
                        <code className="truncate text-neutral-400">{phase5dGuardSigningRequest.ikaMessageApproval.toBase58().slice(0, 16)}…</code>
                      </div>
                    </div>
                  )}

                  {phase5dMessageApproval && (
                    <div className="space-y-2 rounded-lg bg-black/20 p-3">
                      <p className="text-xs font-medium text-neutral-400">Ika MessageApproval on-chain</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="text-neutral-500">Status</div>
                        <code className="truncate text-neutral-400">
                          {phase5dMessageApproval.status === 0 ? "Pending" : phase5dMessageApproval.status === 1 ? "Signed" : "?"} ({phase5dMessageApproval.status})
                        </code>
                        <div className="text-neutral-500">Signature len</div>
                        <code className="truncate text-neutral-400">{phase5dMessageApproval.signatureLen}</code>
                        <div className="text-neutral-500">dWallet</div>
                        <code className="truncate text-neutral-400">{phase5dMessageApproval.dwallet.toBase58().slice(0, 16)}…</code>
                      </div>
                      {phase5dMessageApproval.status === 0 && (
                        <div className="mt-2 rounded border border-purple-500/20 bg-purple-500/10 p-2 text-[11px] text-purple-200/80">
                          Pending Ika signature. Run: npm run ika:sign-approved-message
                        </div>
                      )}
                      {phase5dMessageApproval.status === 1 && phase5dMessageApproval.signatureLen > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] text-emerald-200/80">
                            ✅ Phase 5E complete — Ika signature committed on-chain
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-neutral-500">Signature (hex)</span>
                            <code className="block truncate rounded bg-black/30 px-2 py-1 text-[10px] text-neutral-300">
                              {Buffer.from(phase5dMessageApproval.signature).toString("hex")}
                            </code>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-neutral-500">Signature (base64)</span>
                            <code className="block truncate rounded bg-black/30 px-2 py-1 text-[10px] text-neutral-300">
                              {Buffer.from(phase5dMessageApproval.signature).toString("base64")}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhase5dArtifact(null);
                      setPhase5dGuardSigningRequest(null);
                      setPhase5dMessageApproval(null);
                      localStorage.removeItem("hr_phase5d_artifact");
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    Clear Artifact
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Phase 6 Agent Runtime Tool Card */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Globe className="h-4 w-4 text-purple-400" />
                Agent Runtime Tool — Phase 6
              </CardTitle>
              <CardDescription className="text-neutral-500">
                request_cross_chain_signature for autonomous AI agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-200">Tool Registered ✅</p>
                  <p className="text-[11px] text-purple-200/60">
                    Agents can request policy-governed cross-chain signatures via Ika dWallets.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-400">
                <div className="grid grid-cols-[100px_1fr] gap-2 text-[11px]">
                  <span className="text-neutral-500">Tool name</span>
                  <code className="text-neutral-300">request_cross_chain_signature</code>
                  <span className="text-neutral-500">Mode: preview</span>
                  <span>Policy check only — always safe</span>
                  <span className="text-neutral-500">Mode: devnet_existing_artifact</span>
                  <span>Read signed lifecycle state (server-side only)</span>
                  <span className="text-neutral-500">Mode: devnet_execute_new_request</span>
                  <span>Submit approval + sign — requires env var + policy match</span>
                </div>
              </div>

              <div className="rounded border border-white/[0.06] bg-black/20 p-2 text-[11px] text-neutral-400">
                <span className="text-neutral-500">Example agent prompt:</span>
                <p className="mt-1 text-neutral-300">
                  &ldquo;Request a Base Sepolia USDC signature for 42,000,000 units to 0x1111...&rdquo;
                </p>
              </div>

              {phase5dArtifact?.ikaSignatureHex && (
                <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] text-emerald-200/80">
                  ✅ Phase 5E artifact is signed — agent can read signature via devnet_existing_artifact mode
                </div>
              )}

              <div className="text-[11px] text-neutral-500">
                Safety: devnet execution is guarded by{" "}
                <code className="text-neutral-400">HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING=true</code>{" "}
                and constrained to the demo policy.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Creation tab */}
        <TabsContent value="policy" className="space-y-4 pt-4">
          {/* Devnet Demo Mode */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Flame className="h-4 w-4 text-amber-400" />
                Devnet Demo Mode
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Test guard transactions with pre-seeded demo accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-200/80">
                  Uses initialize_guarded_dwallet_demo because the current deployer profile cannot register HumanRail agents. The production initializer with HumanRail owner checks remains available.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!isDeployed || !publicKey || !isDemoPrincipal || txLoading !== null}
                  onClick={demoInitialize}
                  className="bg-emerald-600 text-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Initialize Demo Policy
                </Button>
                <Button
                  size="sm"
                  disabled={!isDeployed || !publicKey || !isDemoPrincipal || txLoading !== null}
                  onClick={demoFreeze}
                  className="bg-sky-600 text-xs hover:bg-sky-700 disabled:opacity-50"
                >
                  <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                  Freeze Policy
                </Button>
                <Button
                  size="sm"
                  disabled={!isDeployed || !publicKey || !isDemoPrincipal || txLoading !== null}
                  onClick={demoUnfreeze}
                  className="bg-orange-600 text-xs hover:bg-orange-700 disabled:opacity-50"
                >
                  <Flame className="mr-1.5 h-3.5 w-3.5" />
                  Unfreeze Policy
                </Button>
                <Button
                  size="sm"
                  disabled={!isDeployed || !publicKey || !isDemoPrincipal || txLoading !== null}
                  onClick={demoRejectedRequest}
                  className="bg-red-600 text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  Submit Rejected Request Test
                </Button>
              </div>

              {txLoading && (
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  {txLoading}…
                </div>
              )}

              {txSig && (
                <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-xs font-medium text-emerald-200">Transaction sent</p>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-[11px] text-emerald-100/80">
                      {txSig}
                    </code>
                    <a
                      href={txExplorerLink(txSig)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(txSig)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {txSuccessNote && (
                    <p className="text-xs text-emerald-200/80">{txSuccessNote}</p>
                  )}
                </div>
              )}

              {txError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs text-red-200/80">{txError}</p>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Production Policy */}
          <Card className="border-white/[0.06] bg-neutral-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Shield className="h-4 w-4 text-purple-400" />
                Production Policy
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Initialize with real HumanRail owner checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div className="space-y-1">
                  <p className="text-xs text-purple-200/80">
                    Production initializer requires real HumanRail accounts with canRegisterAgents=true. Use the Devnet Demo Mode above for testing.
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-purple-200/60">
                    <li>human_profile owner must be Human Registry</li>
                    <li>agent owner must be Agent Registry</li>
                    <li>capability owner must be Delegation</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Human Profile</Label>
                <Input
                  placeholder="Human Profile pubkey"
                  value={prodHumanProfile}
                  onChange={(e) => setProdHumanProfile(e.target.value)}
                  disabled
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Agent</Label>
                <Input
                  placeholder="Agent pubkey"
                  value={prodAgent}
                  onChange={(e) => setProdAgent(e.target.value)}
                  disabled
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">HumanRail Capability</Label>
                <Input
                  placeholder="Capability pubkey"
                  value={prodCapability}
                  onChange={(e) => setProdCapability(e.target.value)}
                  disabled
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">dWallet Pubkey</Label>
                <Input
                  placeholder="dWallet pubkey"
                  value={prodDwallet}
                  onChange={(e) => setProdDwallet(e.target.value)}
                  disabled
                  className="border-white/[0.06] bg-black/20 text-sm text-neutral-300 placeholder:text-neutral-600 disabled:opacity-50"
                />
              </div>

              <Button
                size="sm"
                disabled
                className="w-full bg-purple-600 text-xs opacity-50"
              >
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                Initialize Production Guard
              </Button>
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
