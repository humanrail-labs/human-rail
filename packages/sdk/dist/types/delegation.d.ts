import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
export declare const ProgramScope: {
    readonly HUMAN_PAY: bigint;
    readonly DATA_BLINK: bigint;
    readonly TOKEN_TRANSFER: bigint;
    readonly NFT_TRANSFER: bigint;
    readonly SWAP: bigint;
    readonly STAKE: bigint;
    readonly GOVERNANCE: bigint;
};
export declare const AssetScope: {
    readonly SOL: bigint;
    readonly USDC: bigint;
    readonly USDT: bigint;
    readonly ANY_SPL_TOKEN: bigint;
    readonly ANY_NFT: bigint;
};
export declare enum CapabilityStatus {
    Active = 0,
    Revoked = 1,
    Expired = 2,
    Frozen = 3,
    Disputed = 4
}
export declare enum DisputeResolution {
    Cleared = 0,
    Revoked = 1,
    Modified = 2
}
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
export interface RevocationEntry {
    capability: PublicKey;
    revokedBy: PublicKey;
    revokedAt: BN;
    reasonHash: Uint8Array;
    bump: number;
}
export interface EmergencyFreezeRecord {
    agent: PublicKey;
    frozenBy: PublicKey;
    frozenAt: BN;
    isActive: boolean;
    unfrozenAt: BN;
    reasonHash: Uint8Array;
    bump: number;
}
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
export declare function createProgramScope(...programs: bigint[]): BN;
export declare function createAssetScope(...assets: bigint[]): BN;
export declare function isCapabilityValid(capability: Capability, currentTime: number): boolean;
export declare function getRemainingDailyLimit(capability: Capability): BN;
export declare function getRemainingTotalLimit(capability: Capability): BN;
//# sourceMappingURL=delegation.d.ts.map