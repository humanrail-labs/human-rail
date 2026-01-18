import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
export declare enum AgentStatus {
    Active = 0,
    Suspended = 1,
    Revoked = 2
}
export interface AgentProfile {
    ownerPrincipal: PublicKey;
    signingKey: PublicKey;
    name: Uint8Array;
    metadataHash: Uint8Array;
    teeMeasurement: Uint8Array;
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
export interface KeyRotation {
    agent: PublicKey;
    oldKey: PublicKey;
    newKey: PublicKey;
    rotatedAt: BN;
    oldKeyExpiresAt: BN;
    sequence: number;
    bump: number;
}
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
export interface RegisterAgentParams {
    name: Uint8Array;
    metadataHash: Uint8Array;
    signingKey: PublicKey;
    teeMeasurement: Uint8Array | null;
    nonce: BN;
}
export declare function createAgentName(name: string): Uint8Array;
export declare function decodeAgentName(bytes: Uint8Array): string;
//# sourceMappingURL=agent.d.ts.map