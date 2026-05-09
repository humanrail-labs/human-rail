/**
 * Mandara Product API client
 *
 * Browser-side fetch wrapper. No secrets.
 */

import { MANDARA_API_BASE_URL, MANDARA_DEV_USER } from "./config";
import type {
  ApiResponse,
  Agent,
  IkaDwallet,
  GuardedPolicy,
  SigningRequest,
  MessageApproval,
  AuditEvent,
  DevnetDemoSnapshot,
  PreviewSigningRequestInput,
  SigningRequestPreviewResult,
  CreateSigningRequestInput,
  CreateSigningRequestResult,
  EnqueueResult,
  ExecutionResult,
  AgentApiKey,
  CreateAgentApiKeyInput,
  CreateAgentApiKeyResult,
  Webhook,
  CreateWebhookInput,
  WebhookDelivery,
  Organization,
  CreateAgentInput,
  ImportWalletInput,
  CreatePolicyInput,
  CreateOrganizationInput,
  AgentChatSession,
  CreateAgentChatSessionInput,
  SendAgentChatMessageInput,
  SendAgentChatMessageResult,
  ApproveAgentProposalResult,
  AgentActionProposal,
  SubscriptionSummary,
} from "./types";

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-mandara-dev-user": MANDARA_DEV_USER,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${MANDARA_API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  });

  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error(`API returned non-JSON (status ${res.status})`);
  }

  if (!res.ok || "error" in body) {
    const err = "error" in body ? body.error : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new Error(`${err.code}: ${err.message}`);
  }

  return body.data;
}

// ── Devnet Demo ──

export function getDevnetDemo(): Promise<DevnetDemoSnapshot> {
  return apiFetch<DevnetDemoSnapshot>("/api/product/devnet-demo");
}

// ── Organizations ──

export function listOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/api/orgs");
}

export function createOrganization(
  input: CreateOrganizationInput
): Promise<Organization> {
  return apiFetch<Organization>("/api/orgs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Agents ──

export function listAgents(): Promise<Agent[]> {
  return apiFetch<Agent[]>("/api/agents");
}

export function createAgent(input: CreateAgentInput): Promise<Agent> {
  return apiFetch<Agent>("/api/agents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Wallets ──

export function listWallets(): Promise<IkaDwallet[]> {
  return apiFetch<IkaDwallet[]>("/api/wallets");
}

export function importWallet(input: ImportWalletInput): Promise<IkaDwallet> {
  return apiFetch<IkaDwallet>("/api/wallets/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Policies ──

export function listPolicies(): Promise<GuardedPolicy[]> {
  return apiFetch<GuardedPolicy[]>("/api/policies");
}

export function createPolicy(input: CreatePolicyInput): Promise<GuardedPolicy> {
  return apiFetch<GuardedPolicy>("/api/policies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Signing Requests ──

export function listSigningRequests(): Promise<SigningRequest[]> {
  return apiFetch<SigningRequest[]>("/api/signing-requests");
}

export function getSigningRequest(id: string): Promise<SigningRequest> {
  return apiFetch<SigningRequest>(`/api/signing-requests/${id}`);
}

export function previewSigningRequest(
  input: PreviewSigningRequestInput
): Promise<SigningRequestPreviewResult> {
  return apiFetch<SigningRequestPreviewResult>("/api/signing-requests/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createSigningRequest(
  input: CreateSigningRequestInput
): Promise<CreateSigningRequestResult> {
  return apiFetch<CreateSigningRequestResult>("/api/signing-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function enqueueSigningRequest(id: string): Promise<EnqueueResult> {
  return apiFetch<EnqueueResult>(`/api/signing-requests/${id}/enqueue`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getSigningRequestExecution(id: string): Promise<ExecutionResult> {
  return apiFetch<ExecutionResult>(`/api/signing-requests/${id}/execution`);
}

export function getSubscription(): Promise<SubscriptionSummary> {
  return apiFetch<SubscriptionSummary>("/api/subscription");
}

// ── Agent Chat ──

export function listAgentChatSessions(): Promise<AgentChatSession[]> {
  return apiFetch<AgentChatSession[]>("/api/agent-chat/sessions");
}

export function createAgentChatSession(
  input: CreateAgentChatSessionInput
): Promise<AgentChatSession> {
  return apiFetch<AgentChatSession>("/api/agent-chat/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAgentChatSession(id: string): Promise<AgentChatSession> {
  return apiFetch<AgentChatSession>(`/api/agent-chat/sessions/${id}`);
}

export function sendAgentChatMessage(
  input: SendAgentChatMessageInput
): Promise<SendAgentChatMessageResult> {
  return apiFetch<SendAgentChatMessageResult>("/api/agent-chat/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function approveAgentProposal(
  proposalId: string,
  input: { enqueue?: boolean }
): Promise<ApproveAgentProposalResult> {
  return apiFetch<ApproveAgentProposalResult>(`/api/agent-chat/proposals/${proposalId}/approve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function rejectAgentProposal(
  proposalId: string,
  input: { reason?: string }
): Promise<{ proposal: AgentActionProposal }> {
  return apiFetch<{ proposal: AgentActionProposal }>(`/api/agent-chat/proposals/${proposalId}/reject`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Message Approvals ──

export function listMessageApprovals(): Promise<MessageApproval[]> {
  return apiFetch<MessageApproval[]>("/api/message-approvals");
}

// ── Audit Events ──

export function listAuditEvents(params?: {
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}): Promise<AuditEvent[]> {
  const search = new URLSearchParams();
  if (params?.resourceType) search.set("resourceType", params.resourceType);
  if (params?.resourceId) search.set("resourceId", params.resourceId);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<AuditEvent[]>(`/api/audit-events${qs ? `?${qs}` : ""}`);
}

// ── Agent API Keys ──

export function listAgentApiKeys(agentId: string): Promise<AgentApiKey[]> {
  return apiFetch<AgentApiKey[]>(`/api/agents/${agentId}/api-keys`);
}

export function createAgentApiKey(
  agentId: string,
  input: CreateAgentApiKeyInput
): Promise<CreateAgentApiKeyResult> {
  return apiFetch<CreateAgentApiKeyResult>(`/api/agents/${agentId}/api-keys`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeAgentApiKey(agentId: string, keyId: string): Promise<AgentApiKey> {
  return apiFetch<AgentApiKey>(`/api/agents/${agentId}/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

// ── Webhooks ──

export function listWebhooks(): Promise<Webhook[]> {
  return apiFetch<Webhook[]>("/api/webhooks");
}

export function createWebhook(input: CreateWebhookInput): Promise<Webhook & { secret: string }> {
  return apiFetch<Webhook & { secret: string }>("/api/webhooks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getWebhook(id: string): Promise<Webhook & { deliveries: WebhookDelivery[] }> {
  return apiFetch<Webhook & { deliveries: WebhookDelivery[] }>(`/api/webhooks/${id}`);
}

export function deleteWebhook(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch<{ id: string; deleted: boolean }>(`/api/webhooks/${id}`, {
    method: "DELETE",
  });
}

// ── Audit Export ──

export function exportAuditEvents(params: {
  eventType?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  format?: "json" | "csv";
  limit?: number;
}): Promise<{ events: AuditEvent[]; meta: { count: number; format: string } } | string> {
  const search = new URLSearchParams();
  if (params.eventType) search.set("eventType", params.eventType);
  if (params.resourceType) search.set("resourceType", params.resourceType);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.format) search.set("format", params.format);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch(`/api/audit-events/export${qs ? `?${qs}` : ""}`);
}
