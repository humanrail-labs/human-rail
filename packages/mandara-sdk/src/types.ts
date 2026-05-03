/**
 * Mandara SDK TypeScript types
 *
 * Mirrors the /v1 API response shapes.
 */

export interface MandaraClientOptions {
  /** Mandara agent API key (Bearer token) */
  apiKey: string;
  /** Base URL of the Mandara API. Defaults to process.env.MANDARA_API_URL or http://localhost:4000 */
  baseUrl?: string;
  /** Custom fetch implementation. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Default timeout for HTTP requests in milliseconds. */
  timeoutMs?: number;
}

export interface SignatureRequestInput {
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
  policyId?: string;
  enqueue?: boolean;
  idempotencyKey?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  rejectionCode?: string;
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

export interface SignatureRequestPreview {
  policyDecision: PolicyDecision;
  messageDigest: string;
}

export interface SignatureRequestExecution {
  jobId?: string;
  queue: string;
  status: string;
}

export interface SignatureRequestResponse {
  id: string;
  requestId: string;
  status: SignatureRequestStatus;
  destinationChainId: number;
  asset: string | null;
  recipient: string | null;
  amount: string;
  message: string | null;
  messageDigest: string;
  executionJobId: string | null;
  signature: string | null;
  messageApproval: {
    status: string;
    signatureHex: string | null;
  } | null;
  nextStep: string;
}

export interface CreateSignatureRequestResponse {
  id: string;
  status: SignatureRequestStatus;
  policyDecision: PolicyDecision;
  execution?: SignatureRequestExecution;
  messageDigest: string;
  signingRequest: {
    id: string;
    requestId: string;
    status: SignatureRequestStatus;
  };
}

export type SignatureRequestStatus =
  | "requested"
  | "queued"
  | "worker_processing"
  | "policy_rejected"
  | "guard_approved"
  | "ika_pending"
  | "signed"
  | "failed";

export interface AgentStatusResponse {
  agent: {
    id: string;
    name: string;
    status: string;
  };
  organization: {
    id: string;
  };
  activePolicies: number;
  signingRequests: {
    total: number;
    signed: number;
  };
}

export interface WaitForSignatureOptions {
  /** Polling interval in milliseconds. Default: 3000 */
  intervalMs?: number;
  /** Total timeout in milliseconds. Default: 120000 */
  timeoutMs?: number;
  /** If true, do not throw on policy_rejected or failed. Default: false */
  allowTerminalRejected?: boolean;
}
