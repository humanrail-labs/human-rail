/**
 * Policy evaluation service for Mandara signing requests.
 *
 * Mirrors the on-chain GuardedPolicy logic off-chain for preview and
 * pre-submission validation. Uses keccak256 for all hashes.
 *
 * Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";

// ── Rejection codes ──

export const PolicyRejectionCode = {
  POLICY_INACTIVE: "POLICY_INACTIVE",
  AGENT_INACTIVE: "AGENT_INACTIVE",
  WALLET_NOT_ACTIVE: "WALLET_NOT_ACTIVE",
  CHAIN_NOT_ALLOWED: "CHAIN_NOT_ALLOWED",
  ASSET_NOT_ALLOWED: "ASSET_NOT_ALLOWED",
  RECIPIENT_NOT_ALLOWED: "RECIPIENT_NOT_ALLOWED",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  PER_TX_LIMIT_EXCEEDED: "PER_TX_LIMIT_EXCEEDED",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",
  TOTAL_LIMIT_EXCEEDED: "TOTAL_LIMIT_EXCEEDED",
  POLICY_EXPIRED: "POLICY_EXPIRED",
} as const;

export type PolicyRejectionCode =
  (typeof PolicyRejectionCode)[keyof typeof PolicyRejectionCode];

// ── Types ──

export interface EvaluatePolicyInput {
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
}

export interface PolicyForEvaluation {
  status: string;
  allowedChainId: number;
  allowedAsset: string | null;
  allowedRecipient: string | null;
  allowedAssetHash: string;
  allowedRecipientHash: string;
  perTxLimit: string | number | bigint;
  dailyLimit: string | number | bigint;
  totalLimit: string | number | bigint;
  expiresAt: Date | null;
  agent?: {
    status: string;
  } | null;
  ikaDwallet?: {
    state: string;
  } | null;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  rejectionCode?: PolicyRejectionCode;
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

// ── Hashing helpers ──
// Minimal duplication from lib/dwallet-guard/utils.ts to avoid cross-package cycles.

function keccak256(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return keccak_256(bytes);
}

function hashToHex(input: string): string {
  return Buffer.from(keccak256(input)).toString("hex");
}

// ── Normalization helpers ──

function normalizeAsset(input: string): string {
  return input.trim().toUpperCase();
}

function normalizeRecipient(input: string): string {
  return input.trim().toLowerCase();
}

function parseBigint(input: string | number | bigint): bigint {
  if (typeof input === "bigint") return input;
  if (typeof input === "number") return BigInt(input);
  return BigInt(input.trim().replace(/_/g, "").replace(/,/g, ""));
}

// ── Evaluation ──

export function evaluateSigningRequest(
  policy: PolicyForEvaluation,
  input: EvaluatePolicyInput
): PolicyEvaluationResult {
  const assetNorm = normalizeAsset(input.asset);
  const recipientNorm = normalizeRecipient(input.recipient);
  const amount = parseBigint(input.amount);

  const assetHash = hashToHex(assetNorm);
  const recipientHash = hashToHex(recipientNorm);
  const messageDigest = hashToHex(input.message);

  const perTxLimit = parseBigint(policy.perTxLimit);
  const dailyLimit = parseBigint(policy.dailyLimit);
  const totalLimit = parseBigint(policy.totalLimit);

  const limits = {
    perTxLimit: perTxLimit.toString(),
    dailyLimit: dailyLimit.toString(),
    totalLimit: totalLimit.toString(),
    requestedAmount: amount.toString(),
  };

  const computed = { assetHash, recipientHash, messageDigest };

  // 1. Policy status
  if (policy.status !== "active") {
    return {
      allowed: false,
      reason: `Policy is not active (status: ${policy.status})`,
      rejectionCode: PolicyRejectionCode.POLICY_INACTIVE,
      computed,
      limits,
    };
  }

  // 2. Agent status
  if (policy.agent && policy.agent.status !== "active") {
    return {
      allowed: false,
      reason: `Agent is not active (status: ${policy.agent.status})`,
      rejectionCode: PolicyRejectionCode.AGENT_INACTIVE,
      computed,
      limits,
    };
  }

  // 3. Wallet state
  if (policy.ikaDwallet && policy.ikaDwallet.state !== "Active") {
    return {
      allowed: false,
      reason: `Wallet is not active (state: ${policy.ikaDwallet.state})`,
      rejectionCode: PolicyRejectionCode.WALLET_NOT_ACTIVE,
      computed,
      limits,
    };
  }

  // 4. Expiry
  if (policy.expiresAt && policy.expiresAt.getTime() < Date.now()) {
    return {
      allowed: false,
      reason: `Policy expired at ${policy.expiresAt.toISOString()}`,
      rejectionCode: PolicyRejectionCode.POLICY_EXPIRED,
      computed,
      limits,
    };
  }

  // 5. Chain
  if (input.destinationChainId !== policy.allowedChainId) {
    return {
      allowed: false,
      reason: `Chain ${input.destinationChainId} not allowed (expected ${policy.allowedChainId})`,
      rejectionCode: PolicyRejectionCode.CHAIN_NOT_ALLOWED,
      computed,
      limits,
    };
  }

  // 6. Asset hash
  if (assetHash !== policy.allowedAssetHash) {
    return {
      allowed: false,
      reason: `Asset hash mismatch: expected ${policy.allowedAssetHash.slice(0, 16)}…, got ${assetHash.slice(0, 16)}…`,
      rejectionCode: PolicyRejectionCode.ASSET_NOT_ALLOWED,
      computed,
      limits,
    };
  }

  // 7. Recipient hash
  if (recipientHash !== policy.allowedRecipientHash) {
    return {
      allowed: false,
      reason: `Recipient hash mismatch: expected ${policy.allowedRecipientHash.slice(0, 16)}…, got ${recipientHash.slice(0, 16)}…`,
      rejectionCode: PolicyRejectionCode.RECIPIENT_NOT_ALLOWED,
      computed,
      limits,
    };
  }

  // 8. Amount validity
  if (amount <= BigInt(0)) {
    return {
      allowed: false,
      reason: `Amount must be greater than zero (got ${amount})`,
      rejectionCode: PolicyRejectionCode.INVALID_AMOUNT,
      computed,
      limits,
    };
  }

  // 9. Per-tx limit
  if (amount > perTxLimit) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds per-tx limit ${perTxLimit}`,
      rejectionCode: PolicyRejectionCode.PER_TX_LIMIT_EXCEEDED,
      computed,
      limits,
    };
  }

  // 10. Daily limit
  if (dailyLimit > BigInt(0) && amount > dailyLimit) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds daily limit ${dailyLimit}`,
      rejectionCode: PolicyRejectionCode.DAILY_LIMIT_EXCEEDED,
      computed,
      limits,
    };
  }

  // 11. Total limit
  if (totalLimit > BigInt(0) && amount > totalLimit) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds total limit ${totalLimit}`,
      rejectionCode: PolicyRejectionCode.TOTAL_LIMIT_EXCEEDED,
      computed,
      limits,
    };
  }

  return {
    allowed: true,
    reason: "Request passes all policy checks. Awaiting worker execution in P4.",
    computed,
    limits,
  };
}

// ── Standalone hash helpers for policy creation ──

export function computePolicyHashes(asset: string, recipient: string): {
  assetHash: string;
  recipientHash: string;
} {
  return {
    assetHash: hashToHex(normalizeAsset(asset)),
    recipientHash: hashToHex(normalizeRecipient(recipient)),
  };
}

export function computeMessageDigest(message: string): string {
  return hashToHex(message);
}
