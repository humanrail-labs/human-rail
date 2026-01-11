import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Agent status enum
export enum AgentStatus {
  Active = 0,
  Suspended = 1,
  Revoked = 2,
}

// Agent Profile - matches on-chain AgentProfile
export interface AgentProfile {
  ownerPrincipal: PublicKey;
  signingKey: PublicKey;
  name: Uint8Array; // 32 bytes
  metadataHash: Uint8Array; // 32 bytes
  teeMeasurement: Uint8Array; // 32 bytes
  hasTeeMeasurement: boolean;
  status: AgentStatus;
  createdAt: BN;
  lastStatusChange: BN;
  lastMetadataUpdate: BN;
  capabilityCount: number;
  actionCount: BN;
  nonce: BN;
  bump: number;
}

// Key Rotation record
export interface KeyRotation {
  agent: PublicKey;
  oldKey: PublicKey;
  newKey: PublicKey;
  rotatedAt: BN;
  oldKeyExpiresAt: BN;
  sequence: number;
  bump: number;
}

// Agent Operator Stats
export interface AgentOperatorStats {
  agent: PublicKey;
  totalTransactions: BN;
  totalValueTransacted: BN;
  failedTransactions: number;
  revokedCapabilities: number;
  lastActivity: BN;
  riskScore: number;
  anomalyFlags: number;
  bump: number;
}

// Register Agent params
export interface RegisterAgentParams {
  name: Uint8Array; // 32 bytes
  metadataHash: Uint8Array; // 32 bytes
  signingKey: PublicKey;
  teeMeasurement: Uint8Array | null; // 32 bytes or null
  nonce: BN;
}

// Helper to create agent name from string
export function createAgentName(name: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(name.slice(0, 32));
  bytes.set(encoded);
  return bytes;
}

// Helper to decode agent name
export function decodeAgentName(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const nullIndex = bytes.indexOf(0);
  return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}
