import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export enum IssuerType {
  KycProvider = 0,
  ProofOfPersonhood = 1,
  SocialVerification = 2,
  DeviceBased = 3,
  EventBased = 4,
  Custom = 5,
}

export enum IssuerStatus {
  Active = 0,
  Suspended = 1,
  Revoked = 2,
}

export enum AttestationStatus {
  Active = 0,
  Expired = 1,
  Revoked = 2,
}

export enum AgentStatus {
  Active = 0,
  Suspended = 1,
  Revoked = 2,
}

export enum CapabilityStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Frozen = 3,
  Disputed = 4,
}

export interface AttestationRefV2 {
  attestation: PublicKey;
  issuer: PublicKey;
  attestationType: IssuerType;
  weight: number;
  expiresAt: BN;
}

export interface HumanProfile {
  wallet: PublicKey;
  humanScore: number;
  isUnique: boolean;
  totalAttestationCount: number;
  activeAttestationCount: number;
  lastAttestationAt: BN;
  lastScoreUpdate: BN;
  attestations: AttestationRefV2[];
  canRegisterAgents: boolean;
  agentsRegistered: number;
  createdAt: BN;
  bump: number;
}

export interface IssuerRegistry {
  admin: PublicKey;
  issuerCount: number;
  registrationPaused: boolean;
  minAttestationWeight: number;
  maxAttestationWeight: number;
  bump: number;
}

export interface Issuer {
  authority: PublicKey;
  name: number[];
  issuerType: IssuerType;
  status: IssuerStatus;
  maxWeight: number;
  contributesToUniqueness: boolean;
  defaultValidity: BN;
  attestationsIssued: BN;
  attestationsRevoked: BN;
  registeredAt: BN;
  registeredBy: PublicKey;
  metadataUri: number[];
  hasMetadataUri: boolean;
  bump: number;
}

export interface SignedAttestation {
  profile: PublicKey;
  issuer: PublicKey;
  issuerAuthority: PublicKey;
  attestationType: IssuerType;
  payloadHash: number[];
  weight: number;
  status: AttestationStatus;
  issuedAt: BN;
  expiresAt: BN;
  revokedAt: BN;
  signature: number[];
  nonce: BN;
  externalId: number[];
  hasExternalId: boolean;
  bump: number;
}

export interface AgentProfile {
  ownerPrincipal: PublicKey;
  signingKey: PublicKey;
  name: number[];
  metadataHash: number[];
  teeMeasurement: number[];
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
  disputeReason: number[];
  nonce: BN;
  bump: number;
}

export interface ActionReceipt {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: number[];
  resultHash: number[];
  actionType: number;
  value: BN;
  destination: PublicKey;
  timestamp: BN;
  slot: BN;
  blockHash: number[];
  offchainRef: number[];
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

export interface HumanRailConfig {
  humanRegistryProgramId?: PublicKey;
  agentRegistryProgramId?: PublicKey;
  delegationProgramId?: PublicKey;
  receiptsProgramId?: PublicKey;
}
