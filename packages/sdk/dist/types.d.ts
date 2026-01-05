import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
export declare enum AttestationType {
    SAS = 0,
    WorldId = 1,
    Civic = 2,
    GitcoinPassport = 3,
    Custom = 4
}
export declare enum InvoiceStatus {
    Open = 0,
    Paid = 1,
    Cancelled = 2,
    Withdrawn = 3
}
export interface HumanProfile {
    wallet: PublicKey;
    humanScore: number;
    isUnique: boolean;
    attestationCount: number;
    lastAttestationAt: BN;
    lastAttestationHash: Uint8Array;
    attestations: AttestationRef[];
    bump: number;
}
export interface AttestationRef {
    source: PublicKey;
    payloadHash: Uint8Array;
    weight: number;
}
export interface ConfidentialInvoice {
    merchant: PublicKey;
    payer: PublicKey;
    amount: BN;
    mint: PublicKey;
    humanRequirements: number;
    status: InvoiceStatus;
    createdAt: BN;
    expiresAt: BN;
    paidAt: BN;
    memo: Uint8Array;
    vault: PublicKey;
    bump: number;
    vaultBump: number;
    nonce: BN;
}
export interface Task {
    creator: PublicKey;
    rewardMint: PublicKey;
    rewardPerResponse: BN;
    totalBudget: BN;
    consumedBudget: BN;
    humanRequirements: number;
    metadataUri: string;
    isOpen: boolean;
    responseCount: number;
    maxResponses: number;
    allowMultipleResponses: boolean;
    createdAt: BN;
    closedAt: BN;
    vault: PublicKey;
    bump: number;
    vaultBump: number;
    nonce: BN;
}
export interface TaskResponse {
    task: PublicKey;
    worker: PublicKey;
    choice: number;
    responseData: Uint8Array;
    humanScoreAtSubmission: number;
    rewardAmount: BN;
    isClaimed: boolean;
    submittedAt: BN;
    claimedAt: BN;
    bump: number;
}
export interface TaskMetadata {
    title: string;
    description: string;
    taskType: 'preference' | 'labeling' | 'classification' | 'custom';
    options?: TaskOption[];
    inputData?: string;
    iconUrl?: string;
    estimatedTimeSeconds?: number;
}
export interface TaskOption {
    id: number;
    label: string;
    description?: string;
    imageUrl?: string;
}
export interface CreateInvoiceParams {
    amount: BN;
    humanRequirements: number;
    expiresAt: BN;
    memo: Uint8Array;
    nonce: BN;
}
export interface CreateTaskParams {
    rewardPerResponse: BN;
    totalBudget: BN;
    humanRequirements: number;
    metadataUri: string;
    maxResponses: number;
    allowMultipleResponses: boolean;
    nonce: BN;
}
export interface AttestationInput {
    sourceId: PublicKey;
    payloadHash: Uint8Array;
    signature?: Uint8Array;
    attestationType: AttestationType;
}
//# sourceMappingURL=types.d.ts.map