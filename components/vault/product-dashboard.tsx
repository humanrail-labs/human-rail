"use client";

import { useState, useCallback } from "react";
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
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Send,
  Eye,
  Play,
  Clock,
  Shield,
  Wallet,
  Lock,
  Radio,
  Activity,
  FileKey,
  Bot,
} from "lucide-react";
import WebhookManagement from "./webhook-management";
import AuditExport from "./audit-export";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    requested: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    queued: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    worker_processing: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    policy_rejected: "bg-red-500/10 text-red-300 border-red-500/20",
    guard_approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    ika_pending: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    signed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-300 border-red-500/20",
  };
  return map[status] || "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
};

function truncate(str: string, len = 12) {
  if (!str || str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}…${str.slice(-len)}`;
}

export default function ProductDashboard() {
  const {
    loading,
    error,
    apiAvailable,
    devnetDemo,
    agents,
    wallets,
    policies,
    signingRequests,
    messageApprovals,
    refresh,
    previewSigningRequest,
    createSigningRequest,
    enqueueSigningRequest,
    fetchExecution,
    startPollingExecution,
    stopPolling,
    listApiKeys,
    createApiKey,
    revokeApiKey,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    exportAuditEvents,
  } = useMandaraProduct();

  const [selectedSrId, setSelectedSrId] = useState<string | null>(null);
  const [execution, setExecution] = useState<Awaited<ReturnType<typeof fetchExecution>> | null>(null);
  const [polling, setPolling] = useState(false);

  // Create form state
  const [formAgentId, setFormAgentId] = useState("");
  const [formPolicyId, setFormPolicyId] = useState("");
  const [formChainId, setFormChainId] = useState("84532");
  const [formAsset, setFormAsset] = useState("USDC:BASE_SEPOLIA");
  const [formRecipient, setFormRecipient] = useState("0x1111111111111111111111111111111111111111");
  const [formAmount, setFormAmount] = useState("1000000");
  const [formMessage, setFormMessage] = useState(`Mandara dashboard request ${Date.now()}`);
  const [previewResult, setPreviewResult] = useState<Awaited<ReturnType<typeof previewSigningRequest>> | null>(null);
  const [createdSr, setCreatedSr] = useState<Awaited<ReturnType<typeof createSigningRequest>> | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // API Key management state
  const [apiKeyAgentId, setApiKeyAgentId] = useState("");
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeys, setApiKeys] = useState<Awaited<ReturnType<typeof listApiKeys>>>([]);
  const [createdApiKey, setCreatedApiKey] = useState<Awaited<ReturnType<typeof createApiKey>> | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const signedCount = signingRequests.filter((s) => s.status === "signed").length;

  const handlePreview = useCallback(async () => {
    setActionLoading("preview");
    setActionError(null);
    try {
      const res = await previewSigningRequest({
        agentId: formAgentId,
        policyId: formPolicyId,
        destinationChainId: Number(formChainId),
        asset: formAsset,
        recipient: formRecipient,
        amount: formAmount,
        message: formMessage,
      });
      setPreviewResult(res);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setActionLoading(null);
    }
  }, [formAgentId, formPolicyId, formChainId, formAsset, formRecipient, formAmount, formMessage, previewSigningRequest]);

  const handleCreate = useCallback(async () => {
    setActionLoading("create");
    setActionError(null);
    try {
      const res = await createSigningRequest({
        agentId: formAgentId,
        policyId: formPolicyId,
        destinationChainId: Number(formChainId),
        asset: formAsset,
        recipient: formRecipient,
        amount: formAmount,
        message: formMessage,
      });
      setCreatedSr(res);
      setPreviewResult(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setActionLoading(null);
    }
  }, [formAgentId, formPolicyId, formChainId, formAsset, formRecipient, formAmount, formMessage, createSigningRequest]);

  const handleEnqueue = useCallback(async () => {
    if (!createdSr) return;
    setActionLoading("enqueue");
    setActionError(null);
    try {
      await enqueueSigningRequest(createdSr.signingRequest.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Enqueue failed");
    } finally {
      setActionLoading(null);
    }
  }, [createdSr, enqueueSigningRequest, refresh]);

  const handleSelectSr = useCallback(
    async (id: string) => {
      setSelectedSrId(id);
      setPolling(false);
      stopPolling();
      try {
        const ex = await fetchExecution(id);
        setExecution(ex);
      } catch {
        setExecution(null);
      }
    },
    [fetchExecution, stopPolling]
  );

  const handlePoll = useCallback(() => {
    if (!selectedSrId) return;
    setPolling(true);
    const cleanup = startPollingExecution(selectedSrId, (result) => {
      setExecution(result);
    });
    return () => {
      cleanup();
      setPolling(false);
    };
  }, [selectedSrId, startPollingExecution]);

  const handleLoadApiKeys = useCallback(async () => {
    if (!apiKeyAgentId) return;
    setApiKeyLoading(true);
    setApiKeyError(null);
    try {
      const keys = await listApiKeys(apiKeyAgentId);
      setApiKeys(keys);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setApiKeyLoading(false);
    }
  }, [apiKeyAgentId, listApiKeys]);

  const handleCreateApiKey = useCallback(async () => {
    if (!apiKeyAgentId || !apiKeyName) return;
    setApiKeyLoading(true);
    setApiKeyError(null);
    setCreatedApiKey(null);
    try {
      const key = await createApiKey(apiKeyAgentId, { name: apiKeyName });
      setCreatedApiKey(key);
      setApiKeyName("");
      await handleLoadApiKeys();
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setApiKeyLoading(false);
    }
  }, [apiKeyAgentId, apiKeyName, createApiKey, handleLoadApiKeys]);

  const handleRevokeApiKey = useCallback(async (keyId: string) => {
    if (!apiKeyAgentId) return;
    setApiKeyLoading(true);
    try {
      await revokeApiKey(apiKeyAgentId, keyId);
      await handleLoadApiKeys();
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : "Failed to revoke API key");
    } finally {
      setApiKeyLoading(false);
    }
  }, [apiKeyAgentId, revokeApiKey, handleLoadApiKeys]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading product dashboard…
      </div>
    );
  }

  if (error && !apiAvailable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">Mandara API unavailable</p>
            <p className="text-xs text-amber-200/70">{error}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Status */}
      <Card className="border-white/[0.06] bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Activity className="h-4 w-4 text-emerald-400" />
            API Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">API Base URL</span>
            <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">
              {process.env.NEXT_PUBLIC_MANDARA_API_URL || "http://localhost:4000"}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Connection</span>
            <Badge variant="outline" className={apiAvailable ? "border-emerald-500/30 text-emerald-300" : "border-red-500/30 text-red-300"}>
              {apiAvailable ? "Connected" : "Error"}
            </Badge>
          </div>
          {devnetDemo && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Lifecycle status</span>
                <span className="text-xs text-neutral-300">{devnetDemo.lifecycleStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Signed</span>
                <Badge variant="outline" className={devnetDemo.signed ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                  {devnetDemo.signed ? "Yes" : "No"}
                </Badge>
              </div>
            </>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 p-2 text-[11px] text-purple-200/70">
            <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
            Ika pre-alpha uses a single mock signer. Not production MPC custody.
          </div>
        </CardContent>
      </Card>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Agents", value: agents.length, icon: Bot },
          { label: "Wallets", value: wallets.length, icon: Wallet },
          { label: "Policies", value: policies.length, icon: Lock },
          { label: "Requests", value: signingRequests.length, icon: FileKey },
          { label: "Signed", value: signedCount, icon: CheckCircle2 },
          { label: "Approvals", value: messageApprovals.length, icon: Shield },
        ].map((item) => (
          <Card key={item.label} className="border-white/[0.06] bg-neutral-900/50">
            <CardContent className="flex flex-col items-center justify-center py-4">
              <item.icon className="mb-1 h-5 w-5 text-neutral-400" />
              <p className="text-xl font-semibold text-white">{item.value}</p>
              <p className="text-[11px] text-neutral-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Signing Request */}
      <Card className="border-white/[0.06] bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Send className="h-4 w-4 text-sky-400" />
            Create Signing Request
          </CardTitle>
          <CardDescription className="text-neutral-500">
            Preview, create, and enqueue a policy-governed signing request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Agent</Label>
              <select
                className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-sky-500/30"
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value)}
              >
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Policy</Label>
              <select
                className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-sky-500/30"
                value={formPolicyId}
                onChange={(e) => setFormPolicyId(e.target.value)}
              >
                <option value="">Select policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.onChainPda || p.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Destination Chain ID</Label>
              <Input value={formChainId} onChange={(e) => setFormChainId(e.target.value)} className="border-white/[0.06] bg-black/20 text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Amount</Label>
              <Input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="border-white/[0.06] bg-black/20 text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Asset</Label>
              <Input value={formAsset} onChange={(e) => setFormAsset(e.target.value)} className="border-white/[0.06] bg-black/20 text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Recipient</Label>
              <Input value={formRecipient} onChange={(e) => setFormRecipient(e.target.value)} className="border-white/[0.06] bg-black/20 text-sm text-neutral-300" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Message</Label>
            <Input value={formMessage} onChange={(e) => setFormMessage(e.target.value)} className="border-white/[0.06] bg-black/20 text-sm text-neutral-300" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={actionLoading === "preview" || !formAgentId || !formPolicyId} className="text-xs">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={actionLoading === "create" || !formAgentId || !formPolicyId} className="bg-sky-600 text-xs hover:bg-sky-700">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Create Request
            </Button>
            {createdSr && (
              <Button variant="outline" size="sm" onClick={handleEnqueue} disabled={actionLoading === "enqueue"} className="text-xs">
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Enqueue
              </Button>
            )}
          </div>

          {actionError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-200/80">{actionError}</p>
            </div>
          )}

          {previewResult && (
            <div className="space-y-2 rounded-lg bg-black/20 p-3">
              <p className="text-xs font-medium text-neutral-400">Preview Result</p>
              <Badge variant="outline" className={previewResult.allowed ? "border-emerald-500/30 text-emerald-300" : "border-red-500/30 text-red-300"}>
                {previewResult.allowed ? "Allowed" : "Rejected"}
              </Badge>
              <p className="text-xs text-neutral-400">{previewResult.reason}</p>
              {previewResult.computed && (
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-neutral-500">Asset hash</span><code className="text-neutral-400">{truncate(previewResult.computed.assetHash, 8)}</code></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Recipient hash</span><code className="text-neutral-400">{truncate(previewResult.computed.recipientHash, 8)}</code></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Message digest</span><code className="text-neutral-400">{truncate(previewResult.computed.messageDigest, 8)}</code></div>
                </div>
              )}
            </div>
          )}

          {createdSr && (
            <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-xs font-medium text-emerald-200">Request Created</p>
              <div className="flex justify-between text-[11px]">
                <span className="text-emerald-200/60">ID</span>
                <code className="text-emerald-200/80">{createdSr.signingRequest.id}</code>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-emerald-200/60">Status</span>
                <span className="text-emerald-200/80">{createdSr.signingRequest.status}</span>
              </div>
              <p className="text-[11px] text-emerald-200/60">
                Queueing creates a worker job. Live signing requires the backend worker with live-devnet gates enabled.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key Management */}
      <Card className="border-white/[0.06] bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileKey className="h-4 w-4 text-amber-400" />
            Agent API Keys
          </CardTitle>
          <CardDescription className="text-neutral-500">
            Create and revoke API keys for external agent authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Agent</Label>
              <select
                className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-sky-500/30"
                value={apiKeyAgentId}
                onChange={(e) => {
                  setApiKeyAgentId(e.target.value);
                  setApiKeys([]);
                  setCreatedApiKey(null);
                }}
              >
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Key Name</Label>
              <Input
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder="e.g. production-agent"
                className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                onClick={handleCreateApiKey}
                disabled={apiKeyLoading || !apiKeyAgentId || !apiKeyName}
                className="bg-amber-600 text-xs hover:bg-amber-700"
              >
                <FileKey className="mr-1.5 h-3.5 w-3.5" />
                Create API Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadApiKeys}
                disabled={apiKeyLoading || !apiKeyAgentId}
                className="text-xs"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${apiKeyLoading ? "animate-spin" : ""}`} />
                Load Keys
              </Button>
            </div>
          </div>

          {apiKeyError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-200/80">{apiKeyError}</p>
            </div>
          )}

          {createdApiKey && (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-medium text-amber-200">API Key Created</p>
              <p className="text-[11px] text-amber-200/70">
                Copy the raw key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-amber-200/90">
                  {createdApiKey.rawKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdApiKey.rawKey)}
                  className="text-amber-200/70 hover:text-amber-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-200/60">Prefix</span>
                <span className="text-amber-200/80">{createdApiKey.prefix}</span>
              </div>
            </div>
          )}

          {apiKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-400">Existing Keys</p>
              <div className="space-y-1.5">
                {apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between rounded bg-black/20 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-300">{k.name}</span>
                      <code className="text-[10px] text-neutral-500">{k.prefix}</code>
                      {k.revokedAt && (
                        <Badge variant="outline" className="border-red-500/30 text-red-300 text-[10px]">
                          Revoked
                        </Badge>
                      )}
                      {k.expiresAt && !k.revokedAt && new Date(k.expiresAt) < new Date() && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {k.lastUsedAt && (
                        <span className="text-[10px] text-neutral-500">
                          Used {new Date(k.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {!k.revokedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeApiKey(k.id)}
                          disabled={apiKeyLoading}
                          className="h-6 text-[10px] border-red-500/20 text-red-300 hover:bg-red-500/10"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <WebhookManagement
        listWebhooks={listWebhooks}
        createWebhook={createWebhook}
        deleteWebhook={deleteWebhook}
      />

      {/* Audit Export */}
      <AuditExport exportAuditEvents={exportAuditEvents} />

      {/* Signing Requests */}
      <Card className="border-white/[0.06] bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileKey className="h-4 w-4 text-sky-400" />
            Signing Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signingRequests.length === 0 ? (
            <p className="text-sm text-neutral-500">No signing requests yet.</p>
          ) : (
            <div className="space-y-2">
              {signingRequests.map((sr) => (
                <div
                  key={sr.id}
                  onClick={() => handleSelectSr(sr.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedSrId === sr.id
                      ? "border-sky-500/30 bg-sky-500/5"
                      : "border-white/[0.06] bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusBadge(sr.status)}>
                        {sr.status}
                      </Badge>
                      <span className="text-xs text-neutral-400">{truncate(sr.id, 6)}</span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(sr.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-neutral-400">
                    <span>Amount: {sr.amount}</span>
                    <span>Chain: {sr.destinationChainId}</span>
                    {sr.message && <span className="truncate max-w-[200px]">Msg: {sr.message}</span>}
                  </div>
                  {sr.onChainMessageApprovalPda && (
                    <div className="mt-1 text-[11px] text-neutral-500">
                      MA: {truncate(sr.onChainMessageApprovalPda, 8)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Detail */}
      {selectedSrId && execution && (
        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Eye className="h-4 w-4 text-purple-400" />
              Execution Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={statusBadge(execution.signingRequest.status)}>
                {execution.signingRequest.status}
              </Badge>
              {!polling && (
                <Button variant="outline" size="sm" onClick={handlePoll} className="text-xs">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Poll status
                </Button>
              )}
              {polling && (
                <Button variant="outline" size="sm" onClick={() => { stopPolling(); setPolling(false); }} className="text-xs">
                  <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Polling…
                </Button>
              )}
            </div>

            {execution.signingRequest.approveTxSignature && (
              <div className="space-y-1">
                <span className="text-xs text-neutral-500">Approve Tx</span>
                <div className="flex items-center gap-2">
                  <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                    {execution.signingRequest.approveTxSignature}
                  </code>
                  <button onClick={() => copyToClipboard(execution.signingRequest.approveTxSignature!)} className="text-neutral-500 hover:text-neutral-300">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a href={`https://explorer.solana.com/tx/${execution.signingRequest.approveTxSignature}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-neutral-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {execution.signingRequest.onChainRequestPda && (
              <div className="space-y-1">
                <span className="text-xs text-neutral-500">GuardSigningRequest PDA</span>
                <code className="block truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                  {execution.signingRequest.onChainRequestPda}
                </code>
              </div>
            )}

            {execution.signingRequest.onChainMessageApprovalPda && (
              <div className="space-y-1">
                <span className="text-xs text-neutral-500">MessageApproval PDA</span>
                <code className="block truncate rounded bg-black/30 px-2 py-1 text-xs text-neutral-300">
                  {execution.signingRequest.onChainMessageApprovalPda}
                </code>
              </div>
            )}

            {execution.signingRequest.signatureHex && (
              <div className="space-y-2 rounded-lg bg-black/20 p-3">
                <p className="text-xs font-medium text-neutral-400">Signature</p>
                <div className="space-y-1">
                  <span className="text-[11px] text-neutral-500">Hex</span>
                  <code className="block truncate rounded bg-black/30 px-2 py-1 text-[10px] text-neutral-300">
                    {execution.signingRequest.signatureHex}
                  </code>
                </div>
                {execution.signingRequest.signatureBase64 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-500">Base64</span>
                    <code className="block truncate rounded bg-black/30 px-2 py-1 text-[10px] text-neutral-300">
                      {execution.signingRequest.signatureBase64}
                    </code>
                  </div>
                )}
              </div>
            )}

            {execution.auditEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-400">Audit Events</p>
                <div className="space-y-1.5">
                  {execution.auditEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between rounded bg-black/20 px-2 py-1.5 text-[11px]">
                      <span className="text-neutral-400">{ev.eventType}</span>
                      <span className="text-neutral-500">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agents / Wallets / Policies tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Bot className="h-4 w-4 text-sky-400" />
              Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.length === 0 ? (
              <p className="text-xs text-neutral-500">No agents.</p>
            ) : (
              agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded bg-black/20 px-2 py-1.5 text-xs">
                  <span className="text-neutral-300">{a.name}</span>
                  <Badge variant="outline" className={a.status === "active" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Wallet className="h-4 w-4 text-purple-400" />
              Wallets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wallets.length === 0 ? (
              <p className="text-xs text-neutral-500">No wallets.</p>
            ) : (
              wallets.map((w) => (
                <div key={w.id} className="space-y-0.5 rounded bg-black/20 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">{w.name || "Unnamed"}</span>
                    <Badge variant="outline" className={w.state === "Active" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                      {w.state}
                    </Badge>
                  </div>
                  <code className="block truncate text-[10px] text-neutral-500">{truncate(w.onChainPda, 8)}</code>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Lock className="h-4 w-4 text-amber-400" />
              Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.length === 0 ? (
              <p className="text-xs text-neutral-500">No policies.</p>
            ) : (
              policies.map((p) => (
                <div key={p.id} className="space-y-0.5 rounded bg-black/20 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">{p.name || "Unnamed"}</span>
                    <Badge variant="outline" className={p.status === "active" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>Chain: {p.allowedChainId}</span>
                    <span>Tx: {p.perTxLimit}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
