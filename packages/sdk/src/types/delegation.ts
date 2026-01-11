import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Program scope bitmask values
export const ProgramScope = {
  HUMAN_PAY: 1n << 0n,
  DATA_BLINK: 1n << 1n,
  TOKEN_TRANSFER: 1n << 2n,
  NFT_TRANSFER: 1n << 3n,
  SWAP: 1n << 4n,
  STAKE: 1n << 5n,
  GOVERNANCE: 1n << 6n,
} as const;

// Asset type bitmask values
export const AssetScope = {
  SOL: 1n << 0n,
  USDC: 1n << 1n,
  USDT: 1n << 2n,
  ANY_SPL_TOKEN: 1n << 3n,
  ANY_NFT: 1n << 4n,
} as const;

// Capability status enum
export enum CapabilityStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Frozen = 3,
  Disputed = 4,
}

// Dispute resolution enum
export enum DisputeResolution {
  Cleared = 0,
  Revoked = 1,
  Modified = 2,
}

// Capability - matches on-chain Capability
export interface Capability {
  principal: PublicKey;
  agent: PublicKey;
  allowedPrograms: BN;
  allowedAssets: BN;
  perTxLimit: BN;
  dailyLimit: BN;
  totalLimit: BN;
  maxSlippageBps: number;
  maxFee: BN;
  validFrom: BN;
  expiresAt: BN;
  cooldownSeconds: number;
  riskTier: number;
  status: CapabilityStatus;
  issuedAt: BN;
  lastUsedAt: BN;
  dailySpent: BN;
  currentDay: number;
  totalSpent: BN;
  useCount: BN;
  enforceAllowlist: boolean;
  allowlistCount: number;
  destinationAllowlist: PublicKey[];
  disputeReason: Uint8Array;
  nonce: BN;
  bump: number;
}

// Revocation Entry
export interface RevocationEntry {
  capability: PublicKey;
  revokedBy: PublicKey;
  revokedAt: BN;
  reasonHash: Uint8Array;
  bump: number;
}

// Emergency Freeze Record
export interface EmergencyFreezeRecord {
  agent: PublicKey;
  frozenBy: PublicKey;
  frozenAt: BN;
  isActive: boolean;
  unfrozenAt: BN;
  reasonHash: Uint8Array;
  bump: number;
}

// Usage Record
export interface UsageRecord {
  capability: PublicKey;
  agent: PublicKey;
  amount: BN;
  actionType: number;
  destination: PublicKey;
  usedAt: BN;
  txSignature: Uint8Array;
  sequence: BN;
  bump: number;
}

// Issue Capability params
export interface IssueCapabilityParams {
  allowedPrograms: BN;
  allowedAssets: BN;
  perTxLimit: BN;
  dailyLimit: BN;
  totalLimit: BN;
  maxSlippageBps: number;
  maxFee: BN;
  validFrom: BN;
  expiresAt: BN;
  cooldownSeconds: number;
  destinationAllowlist: PublicKey[];
  riskTier: number;
  nonce: BN;
}

// Helper to create scope bitmask
export function createProgramScope(...programs: bigint[]): BN {
  const scope = programs.reduce((acc, p) => acc | p, 0n);
  return new BN(scope.toString());
}

// Helper to create asset scope bitmask
export function createAssetScope(...assets: bigint[]): BN {
  const scope = assets.reduce((acc, a) => acc | a, 0n);
  return new BN(scope.toString());
}

// Helper to check if capability is valid
export function isCapabilityValid(capability: Capability, currentTime: number): boolean {
  return (
    capability.status === CapabilityStatus.Active &&
    currentTime >= capability.validFrom.toNumber() &&
    currentTime < capability.expiresAt.toNumber()
  );
}

// Helper to check remaining daily limit
export function getRemainingDailyLimit(capability: Capability): BN {
  return capability.dailyLimit.sub(capability.dailySpent);
}

// Helper to check remaining total limit
export function getRemainingTotalLimit(capability: Capability): BN {
  return capability.totalLimit.sub(capability.totalSpent);
}
