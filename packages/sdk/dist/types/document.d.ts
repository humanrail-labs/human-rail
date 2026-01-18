import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
export declare enum HashAlgorithm {
    Sha256 = 0,
    Sha3_256 = 1,
    Blake3 = 2,
    Keccak256 = 3
}
export declare enum DocumentStatus {
    Draft = 0,
    Final = 1,
    Void = 2
}
export declare enum SignerType {
    Human = 0,
    Agent = 1,
    Organization = 2
}
export declare enum SignatureMode {
    TxApproval = 0,
    OffchainMessage = 1
}
export declare enum SignatureStatus {
    Active = 0,
    Revoked = 1
}
export declare enum SignatureTier {
    WalletNotarization = 0,
    VerifiedSigner = 1,
    AgentOnBehalf = 2
}
export interface Document {
    docHash: Uint8Array;
    hashAlgorithm: HashAlgorithm;
    schema: Uint8Array;
    uri: Uint8Array;
    hasUri: boolean;
    metadataHash: Uint8Array;
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
    signatureBytes: Uint8Array;
    hasSignatureBytes: boolean;
    role: Uint8Array;
    tier: SignatureTier;
    status: SignatureStatus;
    signedAtSlot: BN;
    signedAtTs: BN;
    revokedAtSlot: BN;
    revokedAtTs: BN;
    metadata: Uint8Array;
    hasMetadata: boolean;
    humanScoreAtSigning: number;
    bump: number;
}
export interface RequiredSigner {
    document: PublicKey;
    role: Uint8Array;
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
    docHash: Uint8Array;
    role: Uint8Array;
    tier: SignatureTier;
    slot: BN;
    timestamp: BN;
    bump: number;
}
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
/**
 * Create a role identifier from string
 */
export declare function createRole(role: string): Uint8Array;
/**
 * Decode a role identifier to string
 */
export declare function decodeRole(bytes: Uint8Array): string;
/**
 * Create a schema identifier from string
 */
export declare function createSchema(schema: string): Uint8Array;
/**
 * Decode a schema identifier to string
 */
export declare function decodeSchema(bytes: Uint8Array): string;
/**
 * Create a document URI
 */
export declare function createUri(uri: string): Uint8Array;
/**
 * Decode a document URI
 */
export declare function decodeUri(bytes: Uint8Array): string;
/**
 * Create a domain identifier for offchain signing
 */
export declare function createDomain(domain: string): Uint8Array;
/**
 * Compute SHA-256 hash of data (browser-compatible)
 */
export declare function computeDocHash(data: Uint8Array | string): Promise<Uint8Array>;
/**
 * Create canonical message for offchain signing (SIWS-style)
 */
export declare function createSigningMessage(params: {
    domain: string;
    docHash: Uint8Array;
    role: string;
    signer: PublicKey;
    nonce: bigint;
    issuedAt: number;
    expiresAt: number;
}): Uint8Array;
/**
 * Check if a signature tier meets minimum requirement
 */
export declare function tierMeetsRequirement(actual: SignatureTier, required: SignatureTier): boolean;
/**
 * Check if a document can be signed
 */
export declare function canBeSigned(document: Document): boolean;
/**
 * Get signature tier display name
 */
export declare function getTierName(tier: SignatureTier): string;
/**
 * Format document hash for display
 */
export declare function formatDocHash(hash: Uint8Array): string;
//# sourceMappingURL=document.d.ts.map