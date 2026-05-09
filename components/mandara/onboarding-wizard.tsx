"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Bot,
  Wallet,
  Lock,
  FileKey,
  Send,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Play,
  Building2,
} from "lucide-react";

type Step =
  | "welcome"
  | "organization"
  | "agent"
  | "wallet"
  | "mandate"
  | "apikey"
  | "test"
  | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "organization", label: "Organization" },
  { id: "agent", label: "Agent" },
  { id: "wallet", label: "Wallet" },
  { id: "mandate", label: "Mandate" },
  { id: "apikey", label: "API Key" },
  { id: "test", label: "Test" },
  { id: "done", label: "Done" },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const {
    agents,
    wallets,
    policies,
    organizations,
    devnetDemo,
    apiAvailable,
    loading,
    error,
    refresh,
    createOrganization,
    createAgent,
    importWallet,
    createPolicy,
    createApiKey,
    previewSigningRequest,
    createSigningRequest,
    enqueueSigningRequest,
  } = useMandaraProduct();

  const [step, setStep] = useState<Step>("welcome");
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1: Organization
  const [selectedOrg, setSelectedOrg] = useState<typeof organizations[0] | null>(null);
  const [orgName, setOrgName] = useState("Mandara Devnet Workspace");
  const [orgSlug, setOrgSlug] = useState(`mandara-${Date.now().toString(36)}`);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Step 2: Agent
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [createdAgent, setCreatedAgent] = useState<typeof agents[0] | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Step 3: Wallet
  const [walletPda, setWalletPda] = useState("");
  const [walletPubkey, setWalletPubkey] = useState("");
  const [walletCurve, setWalletCurve] = useState("Secp256k1");
  const [walletAuthority, setWalletAuthority] = useState("");
  const [showAdvancedWallet, setShowAdvancedWallet] = useState(false);
  const [createdWallet, setCreatedWallet] = useState<typeof wallets[0] | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Step 4: Mandate
  const [mandateChainId, setMandateChainId] = useState("84532");
  const [mandateAsset, setMandateAsset] = useState("USDC:BASE_SEPOLIA");
  const [mandateRecipient, setMandateRecipient] = useState("0x1111111111111111111111111111111111111111");
  const [mandatePerTx, setMandatePerTx] = useState("100000000");
  const [mandateDaily, setMandateDaily] = useState("500000000");
  const [mandateTotal, setMandateTotal] = useState("1000000000");
  const [createdPolicy, setCreatedPolicy] = useState<typeof policies[0] | null>(null);
  const [mandateLoading, setMandateLoading] = useState(false);
  const [mandateError, setMandateError] = useState<string | null>(null);

  // Step 5: API Key
  const [apiKeyName, setApiKeyName] = useState("");
  const [createdApiKeyData, setCreatedApiKeyData] = useState<Awaited<ReturnType<typeof createApiKey>> | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Step 6: Test
  const [testAmount, setTestAmount] = useState("1000000");
  const [testMessage, setTestMessage] = useState(`Test request ${Date.now()}`);
  const [previewResult, setPreviewResult] = useState<Awaited<ReturnType<typeof previewSigningRequest>> | null>(null);
  const [createdSr, setCreatedSr] = useState<Awaited<ReturnType<typeof createSigningRequest>> | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const goTo = useCallback((idx: number) => {
    setStepIndex(idx);
    setStep(STEPS[idx].id);
  }, []);

  const activeOrg = selectedOrg ?? organizations[0] ?? null;
  const demoWallet = devnetDemo?.wallet ?? {
    name: "Mandara Devnet Demo Signing Wallet",
    onChainPda: "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
    publicKey: "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d",
    curve: "Secp256k1",
    authority: undefined,
  };

  const productStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      guard_approved: "Approved by mandate",
      ika_pending: "Waiting for Ika signature",
      signed: "Signed",
      policy_rejected: "Rejected by mandate",
      failed: "Failed",
      requested: "Requested",
      queued: "Queued",
      worker_processing: "Processing",
    };
    return labels[status] ?? status;
  };

  const next = useCallback(() => {
    if (stepIndex < STEPS.length - 1) goTo(stepIndex + 1);
  }, [stepIndex, goTo]);

  const back = useCallback(() => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }, [stepIndex, goTo]);

  const handleCreateOrganization = async () => {
    if (!orgName.trim() || !orgSlug.trim()) return;
    setOrgLoading(true);
    setOrgError(null);
    try {
      const org = await createOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim().toLowerCase(),
      });
      setSelectedOrg(org);
      next();
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentName.trim()) return;
    setAgentLoading(true);
    setAgentError(null);
    try {
      const agent = await createAgent({
        organizationId: activeOrg?.id,
        name: agentName.trim(),
        description: agentDesc.trim() || undefined,
      });
      setCreatedAgent(agent);
      next();
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setAgentLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!walletPda.trim()) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      const w = await importWallet({
        organizationId: activeOrg?.id,
        dwalletPda: walletPda.trim(),
        signingPublicKey: walletPubkey.trim() || undefined,
        curve: walletCurve,
        authority: walletAuthority.trim() || undefined,
      });
      setCreatedWallet(w);
      next();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Failed to import wallet");
    } finally {
      setWalletLoading(false);
    }
  };

  const handleUseDemoWallet = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const existing = wallets.find((w) => w.onChainPda === demoWallet.onChainPda);
      if (existing) {
        setCreatedWallet(existing);
        setWalletPda(existing.onChainPda);
        next();
        return;
      }

      const w = await importWallet({
        organizationId: activeOrg?.id,
        name: demoWallet.name ?? "Mandara Devnet Demo Signing Wallet",
        dwalletPda: demoWallet.onChainPda,
        signingPublicKey: demoWallet.publicKey ?? undefined,
        curve: demoWallet.curve ?? "Secp256k1",
        authority: demoWallet.authority ?? undefined,
        state: "Active",
        metadata: { source: "mandara-devnet-demo" },
      });
      setCreatedWallet(w);
      next();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Failed to use demo signing wallet");
    } finally {
      setWalletLoading(false);
    }
  };

  const handleCreateMandate = async () => {
    const agentId = createdAgent?.id ?? agents[0]?.id;
    const walletId = createdWallet?.id ?? wallets[0]?.id;
    if (!agentId || !walletId) {
      setMandateError("Agent and wallet are required");
      return;
    }
    setMandateLoading(true);
    setMandateError(null);
    try {
      const policy = await createPolicy({
        organizationId: activeOrg?.id,
        agentId,
        ikaDwalletId: walletId,
        chainId: Number(mandateChainId),
        asset: mandateAsset,
        recipient: mandateRecipient,
        perTxLimit: mandatePerTx,
        dailyLimit: mandateDaily,
        totalLimit: mandateTotal || undefined,
      });
      setCreatedPolicy(policy);
      next();
    } catch (err) {
      setMandateError(err instanceof Error ? err.message : "Failed to create mandate");
    } finally {
      setMandateLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    const agentId = createdAgent?.id ?? agents[0]?.id;
    if (!agentId || !apiKeyName.trim()) return;
    setApiKeyLoading(true);
    setApiKeyError(null);
    try {
      const key = await createApiKey(agentId, { name: apiKeyName.trim() });
      setCreatedApiKeyData(key);
      next();
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handlePreview = async () => {
    const agentId = createdAgent?.id ?? agents[0]?.id;
    const policyId = createdPolicy?.id ?? policies[0]?.id;
    if (!agentId || !policyId) {
      setTestError("Agent and mandate are required");
      return;
    }
    setTestLoading("preview");
    setTestError(null);
    try {
      const res = await previewSigningRequest({
        organizationId: activeOrg?.id,
        agentId,
        policyId,
        destinationChainId: Number(mandateChainId),
        asset: mandateAsset,
        recipient: mandateRecipient,
        amount: testAmount,
        message: testMessage,
      });
      setPreviewResult(res);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setTestLoading(null);
    }
  };

  const handleCreateRequest = async () => {
    const agentId = createdAgent?.id ?? agents[0]?.id;
    const policyId = createdPolicy?.id ?? policies[0]?.id;
    if (!agentId || !policyId) {
      setTestError("Agent and mandate are required");
      return;
    }
    setTestLoading("create");
    setTestError(null);
    try {
      const res = await createSigningRequest({
        organizationId: activeOrg?.id,
        agentId,
        policyId,
        destinationChainId: Number(mandateChainId),
        asset: mandateAsset,
        recipient: mandateRecipient,
        amount: testAmount,
        message: testMessage,
      });
      setCreatedSr(res);
      setPreviewResult(null);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setTestLoading(null);
    }
  };

  const handleEnqueue = async () => {
    if (!createdSr) return;
    setTestLoading("enqueue");
    setTestError(null);
    try {
      await enqueueSigningRequest(createdSr.signingRequest.id);
      next();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Enqueue failed");
    } finally {
      setTestLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error && !apiAvailable) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">Mandara API unavailable</p>
            <p className="text-xs text-amber-200/70">{error}</p>
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-neutral-400">
          <p className="font-medium text-white">To start the API locally:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li>npm run product:docker:up</li>
            <li>npm run product:db:push</li>
            <li>npm run product:import-devnet-artifacts</li>
            <li>npm run product:api:dev</li>
          </ol>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => goTo(idx)}
            className={`flex flex-1 flex-col items-center gap-1 border-b-2 pb-2 text-xs transition-colors ${
              idx <= stepIndex
                ? "border-sky-500 text-sky-400"
                : "border-neutral-800 text-neutral-600"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                idx < stepIndex
                  ? "bg-emerald-500 text-white"
                  : idx === stepIndex
                  ? "bg-sky-600 text-white"
                  : "bg-neutral-800 text-neutral-500"
              }`}
            >
              {idx < stepIndex ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step: Welcome */}
      {step === "welcome" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Compass className="h-5 w-5 text-sky-400" />
              Welcome to Mandara
            </CardTitle>
            <CardDescription className="text-neutral-500">
              This wizard will guide you through setting up your first policy-governed AI agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-neutral-400">
              <p>You will:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Create or select an organization</li>
                <li>Create an agent identity</li>
                <li>Use a demo signing wallet or import your own</li>
                <li>Set a mandate (spending policy)</li>
                <li>Create a connection key for your real AI agent</li>
                <li>Send a test signature request</li>
              </ol>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/70">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              Devnet beta only. Ika pre-alpha mock signer. Not production custody.
            </div>
            <Button onClick={next} className="bg-sky-600 hover:bg-sky-700">
              Start
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Organization */}
      {step === "organization" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-sky-400" />
              Create or Select Organization
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Your organization owns agents, signing wallets, mandates, requests, and webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {organizations.length > 0 && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-neutral-500">Available organizations:</p>
                <div className="mt-2 space-y-1">
                  {organizations.map((org) => {
                    const selected = activeOrg?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => setSelectedOrg(org)}
                        className={`block w-full rounded px-2 py-1.5 text-left text-xs ${
                          selected
                            ? "bg-sky-500/10 text-sky-300"
                            : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800"
                        }`}
                      >
                        {org.name} <span className="text-neutral-500">/{org.slug}</span>
                      </button>
                    );
                  })}
                </div>
                {activeOrg && (
                  <Button variant="ghost" onClick={next} className="mt-3 text-emerald-400">
                    Use {activeOrg.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs font-medium text-neutral-300">Create a new organization</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Organization name</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Workspace slug</Label>
                <Input
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
            </div>

            {orgError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{orgError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={orgLoading || !orgName.trim() || !orgSlug.trim()}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {orgLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Agent */}
      {step === "agent" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-sky-400" />
              Create Agent
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Registering an agent creates its Mandara identity. Your real AI agent connects later using an API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Agent name</Label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Treasury Bot"
                className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Description (optional)</Label>
              <Input
                value={agentDesc}
                onChange={(e) => setAgentDesc(e.target.value)}
                placeholder="What does this agent do?"
                className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
              />
            </div>
            {agentError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{agentError}</p>
              </div>
            )}
            {agents.length > 0 && !createdAgent && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-neutral-500">Existing agents:</p>
                <div className="mt-1 space-y-1">
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setCreatedAgent(a);
                        setAgentName(a.name);
                      }}
                      className="block w-full rounded bg-neutral-800/50 px-2 py-1 text-left text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-500">Click to select, or create a new one above.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleCreateAgent}
                disabled={agentLoading || !agentName.trim()}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {agentLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Agent
              </Button>
              {createdAgent && (
                <Button variant="ghost" onClick={next} className="text-emerald-400">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Wallet */}
      {step === "wallet" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5 text-purple-400" />
              Select or Import Signing Wallet
            </CardTitle>
            <CardDescription className="text-neutral-500">
              The signing wallet is the Ika dWallet Mandara uses after policy approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallets.length > 0 && !createdWallet && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-neutral-500">Existing wallets:</p>
                <div className="mt-1 space-y-1">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setCreatedWallet(w);
                        setWalletPda(w.onChainPda);
                      }}
                      className="block w-full rounded bg-neutral-800/50 px-2 py-1 text-left text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                      {w.name ?? "Unnamed"} · {w.onChainPda.slice(0, 8)}…
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-500">Click to select, use the demo wallet, or import manually under Advanced.</p>
              </div>
            )}

            <Button
              onClick={handleUseDemoWallet}
              disabled={walletLoading}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {walletLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Use Devnet Demo Signing Wallet
            </Button>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <button
                onClick={() => setShowAdvancedWallet((value) => !value)}
                className="text-xs font-medium text-neutral-300 hover:text-white"
              >
                {showAdvancedWallet ? "Hide" : "Show"} Advanced manual wallet import
              </button>
              {showAdvancedWallet && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">dWallet PDA</Label>
                    <Input
                      value={walletPda}
                      onChange={(e) => setWalletPda(e.target.value)}
                      placeholder="On-chain PDA address"
                      className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">Signing public key (optional)</Label>
                    <Input
                      value={walletPubkey}
                      onChange={(e) => setWalletPubkey(e.target.value)}
                      placeholder="Public key bytes"
                      className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">Curve</Label>
                    <select
                      value={walletCurve}
                      onChange={(e) => setWalletCurve(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-neutral-300 outline-none"
                    >
                      <option value="Secp256k1">Secp256k1</option>
                      <option value="Secp256r1">Secp256r1</option>
                      <option value="Curve25519">Curve25519</option>
                      <option value="Ristretto">Ristretto</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">Authority (optional)</Label>
                    <Input
                      value={walletAuthority}
                      onChange={(e) => setWalletAuthority(e.target.value)}
                      placeholder="Wallet authority address"
                      className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                    />
                  </div>
                </div>
              )}
            </div>
            {walletError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{walletError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {showAdvancedWallet && (
                <Button
                  onClick={handleImportWallet}
                  disabled={walletLoading || !walletPda.trim()}
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  {walletLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Import Wallet
                </Button>
              )}
              {createdWallet && (
                <Button variant="ghost" onClick={next} className="text-emerald-400">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Mandate */}
      {step === "mandate" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5 text-amber-400" />
              Create Mandate
            </CardTitle>
            <CardDescription className="text-neutral-500">
              A mandate defines what the agent is allowed to request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Chain</Label>
                <Input
                  value={mandateChainId}
                  onChange={(e) => setMandateChainId(e.target.value)}
                  placeholder="Base Sepolia"
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Asset</Label>
                <Input
                  value={mandateAsset}
                  onChange={(e) => setMandateAsset(e.target.value)}
                  placeholder="USDC"
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Recipient wallet address</Label>
              <Input
                value={mandateRecipient}
                onChange={(e) => setMandateRecipient(e.target.value)}
                className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Per-transaction limit</Label>
                <Input
                  value={mandatePerTx}
                  onChange={(e) => setMandatePerTx(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Daily limit</Label>
                <Input
                  value={mandateDaily}
                  onChange={(e) => setMandateDaily(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Total limit</Label>
                <Input
                  value={mandateTotal}
                  onChange={(e) => setMandateTotal(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
            </div>
            {mandateError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{mandateError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleCreateMandate}
                disabled={mandateLoading}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {mandateLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Mandate
              </Button>
              {createdPolicy && (
                <Button variant="ghost" onClick={next} className="text-emerald-400">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: API Key */}
      {step === "apikey" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileKey className="h-5 w-5 text-amber-400" />
              Create Connection Key
            </CardTitle>
            <CardDescription className="text-neutral-500">
              This key connects your real bot, Hermes agent, OpenClaw agent, backend, or SDK integration to this Mandara agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Key name</Label>
              <Input
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder="e.g. production-agent"
                className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
              />
            </div>
            {apiKeyError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{apiKeyError}</p>
              </div>
            )}
            {createdApiKeyData && (
              <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-200">API Key Created</p>
                <p className="text-xs text-amber-200/70">
                  Copy the raw key now. It will not be shown again. Do not store in localStorage.
                </p>
                <div className="flex items-center gap-2">
                  <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-amber-200/90">
                    {createdApiKeyData.rawKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdApiKeyData.rawKey)}
                    className="text-amber-200/70 hover:text-amber-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {!createdApiKeyData && (
                <Button
                  onClick={handleCreateApiKey}
                  disabled={apiKeyLoading || !apiKeyName.trim()}
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  {apiKeyLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create API Key
                </Button>
              )}
              {createdApiKeyData && (
                <Button variant="ghost" onClick={next} className="text-emerald-400">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Test */}
      {step === "test" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Send className="h-5 w-5 text-sky-400" />
              Test Request
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Send a test signature request to verify your setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Amount</Label>
                <Input
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-400">Message</Label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={testLoading === "preview"}
                className="text-xs"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={handleCreateRequest}
                disabled={testLoading === "create"}
                className="bg-sky-600 text-xs hover:bg-sky-700"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Create Request
              </Button>
              {createdSr && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnqueue}
                  disabled={testLoading === "enqueue"}
                  className="text-xs"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Enqueue
                </Button>
              )}
            </div>
            {testError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-200/80">{testError}</p>
              </div>
            )}
            {previewResult && (
              <div className="space-y-2 rounded-lg bg-white/[0.02] p-3">
                <p className="text-xs font-medium text-neutral-400">Preview</p>
                <Badge
                  variant="outline"
                  className={
                    previewResult.allowed
                      ? "border-emerald-500/30 text-emerald-300"
                      : "border-red-500/30 text-red-300"
                  }
                >
                  {previewResult.allowed ? "Allowed" : "Rejected"}
                </Badge>
                <p className="text-xs text-neutral-400">{previewResult.reason}</p>
              </div>
            )}
            {createdSr && (
              <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs font-medium text-emerald-200">Request Created</p>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-200/60">ID</span>
                  <code className="text-emerald-200/80">{createdSr.signingRequest.id}</code>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-200/60">Status</span>
                  <span className="text-emerald-200/80">{productStatusLabel(createdSr.signingRequest.status)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Setup Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {createdAgent && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Agent created: {createdAgent.name}
                </div>
              )}
              {createdWallet && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Wallet imported: {createdWallet.onChainPda.slice(0, 8)}…
                </div>
              )}
              {createdPolicy && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Mandate created: {createdPolicy.name ?? "Unnamed"}
                </div>
              )}
              {createdApiKeyData && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  API key created: {createdApiKeyData.name}
                </div>
              )}
              {createdSr && (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Test request: {productStatusLabel(createdSr.signingRequest.status)}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs font-medium text-neutral-400">Next step</p>
              <p className="mt-1 text-sm text-neutral-300">
                Add this API key to your real agent environment.
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs text-neutral-300">
{`export MANDARA_API_URL="${process.env.NEXT_PUBLIC_MANDARA_API_URL || "http://localhost:4000"}"
export MANDARA_AGENT_API_KEY="${createdApiKeyData?.rawKey ?? "YOUR_KEY"}"`}
              </pre>
              {createdApiKeyData && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => copyToClipboard(`export MANDARA_API_URL="${process.env.NEXT_PUBLIC_MANDARA_API_URL || "http://localhost:4000"}"
export MANDARA_AGENT_API_KEY="${createdApiKeyData.rawKey}"`)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs font-medium text-neutral-400">SDK snippet</p>
              <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs text-neutral-300">
{`import { MandaraClient } from "@mandara/sdk";

const client = new MandaraClient({
  baseUrl: process.env.MANDARA_API_URL,
  apiKey: process.env.MANDARA_AGENT_API_KEY!,
});

const result = await client.requestSignature({
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x1111...1111",
  amount: "1000000",
  destinationChainId: 84532,
  message: "Payment for invoice #1234",
});`}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const agentId = createdAgent?.id ?? agents[0]?.id;
                  router.push(agentId ? `/mandara/app/agent-chat?agentId=${agentId}` : "/mandara/app/agent-chat");
                }}
                className="bg-[#3E877E] hover:bg-[#326d66]"
              >
                Talk to this agent
              </Button>
              <Button variant="outline" onClick={() => router.push("/mandara/app")}>
                Go to Console
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/mandara/app/requests")}
              >
                View Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
