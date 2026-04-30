import { PublicKey } from "@solana/web3.js";

export type AgentStatus = "Active" | "Suspended" | "Revoked";

export type CapabilityStatus = "Active" | "Frozen" | "Revoked" | "Disputed";

export type CapabilityScope = "Payment" | "DataAction" | "DocumentSign" | "Full";

export interface HumanProfile {
  wallet: PublicKey;
  humanScore: number;
  isUnique: boolean;
  totalAttestationCount: number;
  activeAttestationCount: number;
  lastAttestationAt: number;
  lastScoreUpdate: number;
  canRegisterAgents: boolean;
  agentsRegistered: number;
  createdAt: number;
  bump: number;
}

export interface AgentAccount {
  ownerPrincipal: PublicKey;
  signingKey: PublicKey;
  name: string;
  metadataHash: Uint8Array;
  teeMeasurement: Uint8Array;
  hasTeeMeasurement: boolean;
  status: AgentStatus;
  createdAt: number;
  lastStatusChange: number;
  lastMetadataUpdate: number;
  capabilityCount: number;
  actionCount: number;
  nonce: bigint;
  bump: number;
  pda: PublicKey;
}

export interface Capability {
  principal: PublicKey;
  agent: PublicKey;
  allowedPrograms: bigint;
  allowedAssets: bigint;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  maxSlippageBps: number;
  maxFee: bigint;
  validFrom: number;
  expiresAt: number;
  cooldownSeconds: number;
  riskTier: number;
  status: CapabilityStatus;
  issuedAt: number;
  lastUsedAt: number;
  dailySpent: bigint;
  currentDay: number;
  totalSpent: bigint;
  useCount: bigint;
  enforceAllowlist: boolean;
  nonce: bigint;
  bump: number;
  pda: PublicKey;
  isFrozen: boolean;
}

export interface FreezeAccount {
  principal: PublicKey;
  agent: PublicKey;
  frozen: boolean;
  frozenAt: bigint | null;
}

export interface Receipt {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: Uint8Array;
  resultHash: Uint8Array;
  actionType: number;
  amount: bigint;
  destination: PublicKey;
  timestamp: number;
  slot: bigint;
  blockHash: Uint8Array;
  offchainRef: Uint8Array;
  hasOffchainRef: boolean;
  sequence: bigint;
  nonce: bigint;
  bump: number;
  pda: PublicKey;
}

export interface DocumentRecord {
  pubkey: PublicKey;
  docHash: Uint8Array;
  docHashHex: string;
  creator: PublicKey;
  schema: string;
  uri: string | null;
  status: "Draft" | "Active" | "Finalized" | "Disputed";
  signatureCount: number;
  createdAt: number;
  finalizedAt: number | null;
}

export interface SignatureRecord {
  pubkey: PublicKey;
  document: PublicKey;
  signerPubkey: PublicKey;
  signerType: "Human" | "Agent" | "Organization";
  role: string;
  tier: "WalletNotarization" | "VerifiedSigner" | "AgentOnBehalf";
  status: "Active" | "Revoked";
  signedAt: number;
  humanScoreAtSigning: number;
}

// ============================================================================
// HUMANRAIL DWALLET GUARD TYPES (Phase 2)
// ============================================================================

export type GuardSigningRequestStatus = "Pending" | "Approved" | "Rejected";

export type GuardRejectionCode =
  | "None"
  | "Frozen"
  | "Expired"
  | "ChainNotAllowed"
  | "AssetNotAllowed"
  | "RecipientNotAllowed"
  | "InvalidAmount"
  | "PerTxLimitExceeded"
  | "DailyLimitExceeded"
  | "TotalLimitExceeded"
  | "DwalletMismatch"
  | "UnauthorizedPrincipal";

export const GUARD_REJECTION_CODES: GuardRejectionCode[] = [
  "None",
  "Frozen",
  "Expired",
  "ChainNotAllowed",
  "AssetNotAllowed",
  "RecipientNotAllowed",
  "InvalidAmount",
  "PerTxLimitExceeded",
  "DailyLimitExceeded",
  "TotalLimitExceeded",
  "DwalletMismatch",
  "UnauthorizedPrincipal",
];

export function guardRejectionCodeFromNumber(n: number): GuardRejectionCode {
  return GUARD_REJECTION_CODES[n] ?? `Unknown(${n})`;
}

export function guardRejectionCodeToNumber(code: GuardRejectionCode): number {
  return GUARD_REJECTION_CODES.indexOf(code);
}

export interface GuardedDwallet {
  version: number;
  principal: PublicKey;
  humanProfile: PublicKey;
  agent: PublicKey;
  humanrailCapability: PublicKey;
  dwallet: PublicKey;
  allowedChainId: number;
  allowedAssetHash: Uint8Array;
  allowedRecipientHash: Uint8Array;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  dailySpent: bigint;
  totalSpent: bigint;
  lastSpendDay: bigint;
  expiresAt: bigint;
  frozen: boolean;
  bump: number;
  pda: PublicKey;
}

export interface GuardSigningRequest {
  version: number;
  requestId: Uint8Array;
  guardedDwallet: PublicKey;
  principal: PublicKey;
  agent: PublicKey;
  dwallet: PublicKey;
  messageDigest: Uint8Array;
  messageMetadataDigest: Uint8Array;
  destinationChainId: number;
  assetHash: Uint8Array;
  recipientHash: Uint8Array;
  amount: bigint;
  signatureScheme: number;
  status: GuardSigningRequestStatus;
  rejectionCode: GuardRejectionCode;
  ikaMessageApproval: PublicKey;
  createdAt: bigint;
  bump: number;
  pda: PublicKey;
}
