import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Attestation types
export enum AttestationType {
  SAS = 0,
  WorldId = 1,
  Civic = 2,
  GitcoinPassport = 3,
  Custom = 4,
}

// Invoice status
export enum InvoiceStatus {
  Open = 0,
  Paid = 1,
  Cancelled = 2,
  Withdrawn = 3,
}

// Human Profile
export interface HumanProfile {
  wallet: PublicKey;
  humanScore: number;
  isUnique: boolean;
  attestationCount: number;
  attestations: AttestationRef[];
  lastUpdated: BN;
  bump: number;
}

export interface AttestationRef {
  sourceId: PublicKey;
  payloadHash: Uint8Array;
  attestationType: number;
  scoreWeight: number;
  registeredAt: BN;
  isActive: boolean;
}

// Invoice
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
}

// Task
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
}

// Task Response
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

// Task Metadata (JSON schema for metadata_uri)
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

// Instruction params
export interface CreateInvoiceParams {
  amount: BN;
  humanRequirements: number;
  expiresAt: BN;
  memo: Uint8Array;
}

export interface CreateTaskParams {
  rewardPerResponse: BN;
  totalBudget: BN;
  humanRequirements: number;
  metadataUri: string;
  maxResponses: number;
  allowMultipleResponses: boolean;
}

export interface AttestationInput {
  sourceId: PublicKey;
  payloadHash: Uint8Array;
  signature?: Uint8Array;
  attestationType: AttestationType;
}
