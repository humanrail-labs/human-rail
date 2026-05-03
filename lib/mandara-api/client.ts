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

// ── Agents ──

export function listAgents(): Promise<Agent[]> {
  return apiFetch<Agent[]>("/api/agents");
}

// ── Wallets ──

export function listWallets(): Promise<IkaDwallet[]> {
  return apiFetch<IkaDwallet[]>("/api/wallets");
}

// ── Policies ──

export function listPolicies(): Promise<GuardedPolicy[]> {
  return apiFetch<GuardedPolicy[]>("/api/policies");
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
