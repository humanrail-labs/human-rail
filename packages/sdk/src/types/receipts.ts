import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Action Receipt - matches on-chain ActionReceipt
export interface ActionReceipt {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: Uint8Array; // 32 bytes
  resultHash: Uint8Array; // 32 bytes
  actionType: number;
  value: BN;
  destination: PublicKey;
  timestamp: BN;
  slot: BN;
  blockHash: Uint8Array; // 32 bytes
  offchainRef: Uint8Array; // 64 bytes
  hasOffchainRef: boolean;
  sequence: BN;
  nonce: BN;
  bump: number;
}

// Receipt Index
export interface ReceiptIndex {
  entity: PublicKey;
  entityType: number; // 0 = agent, 1 = principal
  receiptCount: BN;
  latestReceipt: PublicKey;
  latestTimestamp: BN;
  totalValue: BN;
  bump: number;
}

// Batch Receipt Summary
export interface BatchReceiptSummary {
  emitter: PublicKey;
  receiptCount: number;
  merkleRoot: Uint8Array; // 32 bytes
  firstReceipt: PublicKey;
  lastReceipt: PublicKey;
  createdAt: BN;
  totalValue: BN;
  bump: number;
}

// Emit Receipt params
export interface EmitReceiptParams {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: Uint8Array; // 32 bytes
  resultHash: Uint8Array; // 32 bytes
  actionType: number;
  value: BN;
  destination: PublicKey;
  offchainRef: Uint8Array; // 64 bytes
  nonce: BN;
}

// Helper to create action hash from request data
export function createActionHash(data: string | object): Uint8Array {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  
  // Simple hash (in production, use proper hash function)
  const hash = new Uint8Array(32);
  for (let i = 0; i < encoded.length; i++) {
    hash[i % 32] ^= encoded[i];
  }
  return hash;
}

// Helper to create offchain reference
export function createOffchainRef(uri: string): Uint8Array {
  const bytes = new Uint8Array(64);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(uri.slice(0, 64));
  bytes.set(encoded);
  return bytes;
}

// Helper to decode offchain reference
export function decodeOffchainRef(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const nullIndex = bytes.indexOf(0);
  return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}

// Receipt verification result
export interface ReceiptVerification {
  isValid: boolean;
  receipt: ActionReceipt;
  principal: PublicKey;
  agent: PublicKey;
  capability: PublicKey;
  timestamp: Date;
  value: BN;
}

// Helper to verify receipt data integrity
export function verifyReceiptIntegrity(
  receipt: ActionReceipt,
  expectedPrincipal?: PublicKey,
  expectedAgent?: PublicKey,
  expectedCapability?: PublicKey
): ReceiptVerification {
  let isValid = true;

  if (expectedPrincipal && !receipt.principalId.equals(expectedPrincipal)) {
    isValid = false;
  }
  if (expectedAgent && !receipt.agentId.equals(expectedAgent)) {
    isValid = false;
  }
  if (expectedCapability && !receipt.capabilityId.equals(expectedCapability)) {
    isValid = false;
  }

  return {
    isValid,
    receipt,
    principal: receipt.principalId,
    agent: receipt.agentId,
    capability: receipt.capabilityId,
    timestamp: new Date(receipt.timestamp.toNumber() * 1000),
    value: receipt.value,
  };
}
