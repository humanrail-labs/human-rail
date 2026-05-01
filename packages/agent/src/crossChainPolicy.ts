// HumanRail Cross-Chain Policy Utility — Phase 6
//
// Mirrors the demo policy used in lib/dwallet-guard/utils.ts for the
// Base Sepolia USDC transfer demo. All hashing uses keccak256.
//
// Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.

import { keccak_256 } from "@noble/hashes/sha3.js";

// ── Demo Policy Constants ──
// These match the policy created by scripts/devnet-create-guarded-dwallet.ts

export const DEMO_POLICY = {
  chainId: 84532, // Base Sepolia
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x1111111111111111111111111111111111111111",
  perTxLimit: BigInt(100_000_000), // 100 USDC (6 decimals)
} as const;

// ── Hashing helpers ──
// Duplicated from lib/dwallet-guard/utils.ts to avoid cross-package dependency issues.

function keccak256(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return keccak_256(bytes);
}

function hashPolicyInput(input: string): Uint8Array {
  return keccak256(input);
}

// ── Normalization helpers ──

export function normalizeAsset(input: string): string {
  return input.trim().toUpperCase();
}

export function normalizeRecipient(input: string): string {
  return input.trim().toLowerCase();
}

export function parseAmount(input: string): bigint {
  const cleaned = input.trim().replace(/_/g, "").replace(/,/g, "");
  try {
    return BigInt(cleaned);
  } catch {
    return BigInt(-1);
  }
}

// ── Policy evaluation ──

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  policyHashAsset: string;
  policyHashRecipient: string;
  messageDigest: string;
  destinationChainId: number;
  amount: bigint;
}

export function evaluateDemoPolicy(params: {
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message?: string;
}): PolicyEvaluationResult {
  const assetNorm = normalizeAsset(params.asset);
  const recipientNorm = normalizeRecipient(params.recipient);
  const amount = parseAmount(params.amount);

  const policyHashAsset = Buffer.from(hashPolicyInput(DEMO_POLICY.asset)).toString("hex");
  const policyHashRecipient = Buffer.from(hashPolicyInput(DEMO_POLICY.recipient)).toString("hex");
  const inputHashAsset = Buffer.from(hashPolicyInput(assetNorm)).toString("hex");
  const inputHashRecipient = Buffer.from(hashPolicyInput(recipientNorm)).toString("hex");

  const reasons: string[] = [];

  if (params.destinationChainId !== DEMO_POLICY.chainId) {
    reasons.push(
      `chain_id mismatch: expected ${DEMO_POLICY.chainId} (Base Sepolia), got ${params.destinationChainId}`
    );
  }

  if (inputHashAsset !== policyHashAsset) {
    reasons.push(
      `asset mismatch: expected hash ${policyHashAsset.slice(0, 16)}…, got ${inputHashAsset.slice(0, 16)}… (input: "${assetNorm}")`
    );
  }

  if (inputHashRecipient !== policyHashRecipient) {
    reasons.push(
      `recipient mismatch: expected hash ${policyHashRecipient.slice(0, 16)}…, got ${inputHashRecipient.slice(0, 16)}… (input: "${recipientNorm}")`
    );
  }

  if (amount < BigInt(0)) {
    reasons.push(`invalid amount: "${params.amount}"`);
  } else if (amount > BigInt(DEMO_POLICY.perTxLimit)) {
    reasons.push(
      `amount ${amount} exceeds per-tx limit ${DEMO_POLICY.perTxLimit}`
    );
  }

  const messageDigest = Buffer.from(keccak256(params.message || "")).toString("hex");

  if (reasons.length === 0) {
    return {
      allowed: true,
      reason: "Request matches demo policy (Base Sepolia USDC transfer within limits).",
      policyHashAsset,
      policyHashRecipient,
      messageDigest,
      destinationChainId: params.destinationChainId,
      amount,
    };
  }

  return {
    allowed: false,
    reason: `Policy rejection: ${reasons.join("; ")}`,
    policyHashAsset,
    policyHashRecipient,
    messageDigest,
    destinationChainId: params.destinationChainId,
    amount,
  };
}

export function computePolicyHashes(): {
  assetHash: string;
  recipientHash: string;
} {
  return {
    assetHash: Buffer.from(hashPolicyInput(DEMO_POLICY.asset)).toString("hex"),
    recipientHash: Buffer.from(hashPolicyInput(DEMO_POLICY.recipient)).toString("hex"),
  };
}

export function computeMessageDigest(message: string): string {
  return Buffer.from(keccak256(message)).toString("hex");
}
