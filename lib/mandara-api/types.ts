/**
 * Mandara Product API TypeScript types
 *
 * Mirrors the API response shapes documented in docs/PRODUCT_API_DESIGN.md
 */

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Organization ──

export interface Organization {
  id: string;
  slug: string;
  name: string;
  tier: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Agent ──

export type AgentStatus = "active" | "suspended" | "revoked";

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: AgentStatus;
  onChainAgentPda?: string | null;
  onChainProfilePda?: string | null;
  onChainCapabilityPda?: string | null;
  frozenAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Wallet ──

export type IkaDwalletState = "DKGInProgress" | "Active" | "Frozen";

export interface IkaDwallet {
  id: string;
  organizationId: string;
  name?: string | null;
  onChainPda: string;
  curve: string;
  publicKey?: string | null;
  state: IkaDwalletState;
  authority?: string | null;
  authorityTransferredAt?: string | null;
  createdVia?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Policy ──

export type PolicyStatus = "active" | "frozen" | "expired" | "revoked";

export interface GuardedPolicy {
  id: string;
  organizationId: string;
  agentId: string;
  ikaDwalletId: string;
  name?: string | null;
  onChainPda?: string | null;
  allowedChainId: number;
  allowedAsset?: string | null;
  allowedRecipient?: string | null;
  allowedAssetHash: string;
  allowedRecipientHash: string;
  perTxLimit: string;
  dailyLimit: string;
  totalLimit: string;
  dailySpent: string;
  totalSpent: string;
  lastSpendDay?: number | null;
  expiresAt?: string | null;
  status: PolicyStatus;
  frozenAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Signing Request ──

export type SigningRequestStatus =
  | "requested"
  | "queued"
  | "worker_processing"
  | "policy_rejected"
  | "guard_approved"
  | "ika_pending"
  | "signed"
  | "failed";

export interface SigningRequest {
  id: string;
  organizationId: string;
  agentId: string;
  policyId: string;
  ikaDwalletId?: string | null;
  requestId: string;
  messageDigest: string;
  messageMetadataDigest: string;
  destinationChainId: number;
  asset?: string | null;
  recipient?: string | null;
  assetHash: string;
  recipientHash: string;
  amount: string;
  message?: string | null;
  signatureScheme: string;
  status: SigningRequestStatus;
  rejectionCode?: number | null;
  rejectionReason?: string | null;
  onChainRequestPda?: string | null;
  onChainMessageApprovalPda?: string | null;
  approveTxSignature?: string | null;
  submittedAt?: string | null;
  signedAt?: string | null;
  signatureHex?: string | null;
  signatureBase64?: string | null;
  executionJobId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Relations (included in some endpoints)
  agent?: Pick<Agent, "id" | "name">;
  policy?: Pick<GuardedPolicy, "id" | "name" | "onChainPda">;
  ikaDwallet?: Pick<IkaDwallet, "id" | "name" | "onChainPda">;
  messageApproval?: MessageApproval | null;
}

// ── Message Approval ──

export type MessageApprovalStatus = "pending" | "signed";

export interface MessageApproval {
  id: string;
  organizationId: string;
  signingRequestId: string;
  onChainPda: string;
  dwalletPda: string;
  messageDigest: string;
  metadataDigest: string;
  approver: string;
  userPubkey: string;
  signatureScheme: string;
  epoch: string;
  status: MessageApprovalStatus;
  signatureLength?: number | null;
  signatureHex?: string | null;
  signatureBase64?: string | null;
  metadata?: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Audit Event ──

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorType: string;
  actorId?: string | null;
  eventType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ── Devnet Demo ──

export interface DevnetDemoSnapshot {
  lifecycleStatus: string;
  signed: boolean;
  organization: Organization;
  agent: Agent;
  wallet: IkaDwallet;
  policy: GuardedPolicy;
  signingRequest: SigningRequest;
  messageApproval: MessageApproval;
}

// ── Preview / Create ──

export interface PreviewSigningRequestInput {
  organizationId?: string;
  agentId: string;
  policyId: string;
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
}

export interface SigningRequestPreviewResult {
  allowed: boolean;
  reason: string;
  rejectionCode?: string | null;
  computed: {
    assetHash: string;
    recipientHash: string;
    messageDigest: string;
  };
  limits: {
    perTxLimit: string;
    dailyLimit: string;
    totalLimit: string;
    requestedAmount: string;
  };
}

export interface CreateSigningRequestInput {
  organizationId?: string;
  agentId: string;
  policyId: string;
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
  persistIfRejected?: boolean;
}

export interface CreateSigningRequestResult {
  signingRequest: SigningRequest;
  evaluation: SigningRequestPreviewResult;
  nextStep?: string;
}

export interface EnqueueResult {
  signingRequest: SigningRequest;
  job: {
    id: string;
    queue: string;
    status: string;
  };
}

export interface ExecutionResult {
  signingRequest: SigningRequest;
  auditEvents: AuditEvent[];
}

// ── Agent API Keys ──

export interface AgentApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface CreateAgentApiKeyInput {
  name: string;
  expiresAt?: string;
}

export interface CreateAgentApiKeyResult {
  id: string;
  name: string;
  prefix: string;
  keyPreview: string;
  rawKey: string;
  createdAt: string;
  expiresAt?: string;
}

// ── Webhooks ──

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookInput {
  organizationId?: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

// ── Create Inputs ──

export interface CreateAgentInput {
  organizationId?: string;
  name: string;
  description?: string;
}

export interface ImportWalletInput {
  organizationId?: string;
  name?: string;
  dwalletPda: string;
  signingPublicKey?: string;
  curve: string;
  authority?: string;
  state?: string;
  ikaProgramId?: string;
  guardCpiAuthority?: string;
  authorityTransferSignature?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePolicyInput {
  organizationId?: string;
  agentId: string;
  ikaDwalletId: string;
  name?: string;
  chainId: number;
  asset: string;
  recipient: string;
  perTxLimit: string;
  dailyLimit: string;
  totalLimit?: string;
  expiresAt?: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  status: string;
  responseStatus?: number | null;
  attemptedAt: string;
  createdAt: string;
}
