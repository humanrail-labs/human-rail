import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// =============================================================================
// ENUMS
// =============================================================================

export enum HashAlgorithm {
  Sha256 = 0,
  Sha3_256 = 1,
  Blake3 = 2,
  Keccak256 = 3,
}

export enum DocumentStatus {
  Draft = 0,
  Final = 1,
  Void = 2,
}

export enum SignerType {
  Human = 0,
  Agent = 1,
  Organization = 2,
}

export enum SignatureMode {
  TxApproval = 0,
  OffchainMessage = 1,
}

export enum SignatureStatus {
  Active = 0,
  Revoked = 1,
}

export enum SignatureTier {
  WalletNotarization = 0,
  VerifiedSigner = 1,
  AgentOnBehalf = 2,
}

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

export interface Document {
  docHash: Uint8Array; // 32 bytes
  hashAlgorithm: HashAlgorithm;
  schema: Uint8Array; // 32 bytes
  uri: Uint8Array; // 128 bytes
  hasUri: boolean;
  metadataHash: Uint8Array; // 32 bytes
  hasMetadata: boolean;
  creator: PublicKey;
  status: DocumentStatus;
  createdAtSlot: BN;
  createdAtTs: BN;
  finalizedAtSlot: BN;
  finalizedAtTs: BN;
  versionOf: PublicKey;
  isVersioned: boolean;
  versionNumber: number;
  signatureCount: number;
  requiredSignerCount: number;
  bump: number;
}

export interface SignatureRecord {
  document: PublicKey;
  signerType: SignerType;
  signerPubkey: PublicKey;
  principalPubkey: PublicKey;
  hasPrincipal: boolean;
  capabilityId: PublicKey;
  hasCapability: boolean;
  attestationId: PublicKey;
  hasAttestation: boolean;
  signatureMode: SignatureMode;
  signatureBytes: Uint8Array; // 64 bytes
  hasSignatureBytes: boolean;
  role: Uint8Array; // 32 bytes
  tier: SignatureTier;
  status: SignatureStatus;
  signedAtSlot: BN;
  signedAtTs: BN;
  revokedAtSlot: BN;
  revokedAtTs: BN;
  metadata: Uint8Array; // 64 bytes
  hasMetadata: boolean;
  humanScoreAtSigning: number;
  bump: number;
}

export interface RequiredSigner {
  document: PublicKey;
  role: Uint8Array; // 32 bytes
  requiredSigner: PublicKey;
  hasRequiredSigner: boolean;
  minTier: SignatureTier;
  isSatisfied: boolean;
  satisfyingSignature: PublicKey;
  sequence: number;
  bump: number;
}

export interface DocumentSigningReceipt {
  document: PublicKey;
  signatureRecord: PublicKey;
  principal: PublicKey;
  agent: PublicKey;
  isAgentSignature: boolean;
  capability: PublicKey;
  docHash: Uint8Array; // 32 bytes
  role: Uint8Array; // 32 bytes
  tier: SignatureTier;
  slot: BN;
  timestamp: BN;
  bump: number;
}

// =============================================================================
// INSTRUCTION PARAMS
// =============================================================================

export interface RegisterDocumentParams {
  docHash: Uint8Array;
  hashAlgorithm: HashAlgorithm;
  schema: Uint8Array;
  uri: Uint8Array;
  hasUri: boolean;
  metadataHash: Uint8Array;
  hasMetadata: boolean;
  versionOf: PublicKey | null;
}

export interface SignDocumentTxParams {
  role: Uint8Array;
  signatureMetadata: Uint8Array;
  hasMetadata: boolean;
}

export interface SignDocumentAgentParams {
  role: Uint8Array;
  capabilityNonce: BN;
  signatureMetadata: Uint8Array;
  hasMetadata: boolean;
}

export interface AnchorOffchainParams {
  message: Uint8Array;
  signature: Uint8Array;
  role: Uint8Array;
  domain: Uint8Array;
  nonce: BN;
  expiresAt: BN;
}

export interface RequiredSignerParams {
  role: Uint8Array;
  requiredSigner: PublicKey | null;
  minTier: SignatureTier;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a role identifier from string
 */
export function createRole(role: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(role.slice(0, 32));
  bytes.set(encoded);
  return bytes;
}

/**
 * Decode a role identifier to string
 */
export function decodeRole(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const nullIndex = bytes.indexOf(0);
  return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}

/**
 * Create a schema identifier from string
 */
export function createSchema(schema: string): Uint8Array {
  return createRole(schema); // Same format
}

/**
 * Decode a schema identifier to string
 */
export function decodeSchema(bytes: Uint8Array): string {
  return decodeRole(bytes);
}

/**
 * Create a document URI
 */
export function createUri(uri: string): Uint8Array {
  const bytes = new Uint8Array(128);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(uri.slice(0, 128));
  bytes.set(encoded);
  return bytes;
}

/**
 * Decode a document URI
 */
export function decodeUri(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const nullIndex = bytes.indexOf(0);
  return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}

/**
 * Create a domain identifier for offchain signing
 */
export function createDomain(domain: string): Uint8Array {
  const bytes = new Uint8Array(64);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(domain.slice(0, 64));
  bytes.set(encoded);
  return bytes;
}

/**
 * Compute SHA-256 hash of data (browser-compatible)
 */
export async function computeDocHash(data: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hashBuffer);
}

/**
 * Create canonical message for offchain signing (SIWS-style)
 */
export function createSigningMessage(params: {
  domain: string;
  docHash: Uint8Array;
  role: string;
  signer: PublicKey;
  nonce: bigint;
  issuedAt: number;
  expiresAt: number;
}): Uint8Array {
  const message = new Uint8Array(256);
  let offset = 0;

  // Domain (64 bytes)
  const domainBytes = createDomain(params.domain);
  message.set(domainBytes, offset);
  offset += 64;

  // Doc hash (32 bytes)
  message.set(params.docHash, offset);
  offset += 32;

  // Role (32 bytes)
  const roleBytes = createRole(params.role);
  message.set(roleBytes, offset);
  offset += 32;

  // Signer (32 bytes)
  message.set(params.signer.toBytes(), offset);
  offset += 32;

  // Nonce (8 bytes)
  const nonceBytes = new Uint8Array(8);
  const dv = new DataView(nonceBytes.buffer);
  dv.setBigUint64(0, params.nonce, true);
  message.set(nonceBytes, offset);
  offset += 8;

  // Issued at (8 bytes)
  const issuedBytes = new Uint8Array(8);
  const dv2 = new DataView(issuedBytes.buffer);
  dv2.setBigInt64(0, BigInt(params.issuedAt), true);
  message.set(issuedBytes, offset);
  offset += 8;

  // Expires at (8 bytes)
  const expiresBytes = new Uint8Array(8);
  const dv3 = new DataView(expiresBytes.buffer);
  dv3.setBigInt64(0, BigInt(params.expiresAt), true);
  message.set(expiresBytes, offset);
  offset += 8;

  // Chain ID (16 bytes) - "solana-mainnet" padded
  const chainId = createDomain('solana-mainnet').slice(0, 16);
  message.set(chainId, offset);

  return message;
}

/**
 * Check if a signature tier meets minimum requirement
 */
export function tierMeetsRequirement(
  actual: SignatureTier,
  required: SignatureTier
): boolean {
  return actual >= required;
}

/**
 * Check if a document can be signed
 */
export function canBeSigned(document: Document): boolean {
  return document.status === DocumentStatus.Draft || document.status === DocumentStatus.Final;
}

/**
 * Get signature tier display name
 */
export function getTierName(tier: SignatureTier): string {
  switch (tier) {
    case SignatureTier.WalletNotarization:
      return 'Tier 0: Wallet Notarization';
    case SignatureTier.VerifiedSigner:
      return 'Tier 1: Verified Human';
    case SignatureTier.AgentOnBehalf:
      return 'Tier 2: Agent on Behalf';
    default:
      return 'Unknown';
  }
}

/**
 * Format document hash for display
 */
export function formatDocHash(hash: Uint8Array): string {
  return Array.from(hash.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('') + '...';
}
