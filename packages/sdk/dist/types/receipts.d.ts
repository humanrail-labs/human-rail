import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
export interface ActionReceipt {
    principalId: PublicKey;
    agentId: PublicKey;
    capabilityId: PublicKey;
    actionHash: Uint8Array;
    resultHash: Uint8Array;
    actionType: number;
    value: BN;
    destination: PublicKey;
    timestamp: BN;
    slot: BN;
    blockHash: Uint8Array;
    offchainRef: Uint8Array;
    hasOffchainRef: boolean;
    sequence: BN;
    nonce: BN;
    bump: number;
}
export interface ReceiptIndex {
    entity: PublicKey;
    entityType: number;
    receiptCount: BN;
    latestReceipt: PublicKey;
    latestTimestamp: BN;
    totalValue: BN;
    bump: number;
}
export interface BatchReceiptSummary {
    emitter: PublicKey;
    receiptCount: number;
    merkleRoot: Uint8Array;
    firstReceipt: PublicKey;
    lastReceipt: PublicKey;
    createdAt: BN;
    totalValue: BN;
    bump: number;
}
export interface EmitReceiptParams {
    principalId: PublicKey;
    agentId: PublicKey;
    capabilityId: PublicKey;
    actionHash: Uint8Array;
    resultHash: Uint8Array;
    actionType: number;
    value: BN;
    destination: PublicKey;
    offchainRef: Uint8Array;
    nonce: BN;
}
export declare function createActionHash(data: string | object): Uint8Array;
export declare function createOffchainRef(uri: string): Uint8Array;
export declare function decodeOffchainRef(bytes: Uint8Array): string;
export interface ReceiptVerification {
    isValid: boolean;
    receipt: ActionReceipt;
    principal: PublicKey;
    agent: PublicKey;
    capability: PublicKey;
    timestamp: Date;
    value: BN;
}
export declare function verifyReceiptIntegrity(receipt: ActionReceipt, expectedPrincipal?: PublicKey, expectedAgent?: PublicKey, expectedCapability?: PublicKey): ReceiptVerification;
//# sourceMappingURL=receipts.d.ts.map