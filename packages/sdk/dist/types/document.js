"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureTier = exports.SignatureStatus = exports.SignatureMode = exports.SignerType = exports.DocumentStatus = exports.HashAlgorithm = void 0;
exports.createRole = createRole;
exports.decodeRole = decodeRole;
exports.createSchema = createSchema;
exports.decodeSchema = decodeSchema;
exports.createUri = createUri;
exports.decodeUri = decodeUri;
exports.createDomain = createDomain;
exports.computeDocHash = computeDocHash;
exports.createSigningMessage = createSigningMessage;
exports.tierMeetsRequirement = tierMeetsRequirement;
exports.canBeSigned = canBeSigned;
exports.getTierName = getTierName;
exports.formatDocHash = formatDocHash;
// =============================================================================
// ENUMS
// =============================================================================
var HashAlgorithm;
(function (HashAlgorithm) {
    HashAlgorithm[HashAlgorithm["Sha256"] = 0] = "Sha256";
    HashAlgorithm[HashAlgorithm["Sha3_256"] = 1] = "Sha3_256";
    HashAlgorithm[HashAlgorithm["Blake3"] = 2] = "Blake3";
    HashAlgorithm[HashAlgorithm["Keccak256"] = 3] = "Keccak256";
})(HashAlgorithm || (exports.HashAlgorithm = HashAlgorithm = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus[DocumentStatus["Draft"] = 0] = "Draft";
    DocumentStatus[DocumentStatus["Final"] = 1] = "Final";
    DocumentStatus[DocumentStatus["Void"] = 2] = "Void";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var SignerType;
(function (SignerType) {
    SignerType[SignerType["Human"] = 0] = "Human";
    SignerType[SignerType["Agent"] = 1] = "Agent";
    SignerType[SignerType["Organization"] = 2] = "Organization";
})(SignerType || (exports.SignerType = SignerType = {}));
var SignatureMode;
(function (SignatureMode) {
    SignatureMode[SignatureMode["TxApproval"] = 0] = "TxApproval";
    SignatureMode[SignatureMode["OffchainMessage"] = 1] = "OffchainMessage";
})(SignatureMode || (exports.SignatureMode = SignatureMode = {}));
var SignatureStatus;
(function (SignatureStatus) {
    SignatureStatus[SignatureStatus["Active"] = 0] = "Active";
    SignatureStatus[SignatureStatus["Revoked"] = 1] = "Revoked";
})(SignatureStatus || (exports.SignatureStatus = SignatureStatus = {}));
var SignatureTier;
(function (SignatureTier) {
    SignatureTier[SignatureTier["WalletNotarization"] = 0] = "WalletNotarization";
    SignatureTier[SignatureTier["VerifiedSigner"] = 1] = "VerifiedSigner";
    SignatureTier[SignatureTier["AgentOnBehalf"] = 2] = "AgentOnBehalf";
})(SignatureTier || (exports.SignatureTier = SignatureTier = {}));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Create a role identifier from string
 */
function createRole(role) {
    const bytes = new Uint8Array(32);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(role.slice(0, 32));
    bytes.set(encoded);
    return bytes;
}
/**
 * Decode a role identifier to string
 */
function decodeRole(bytes) {
    const decoder = new TextDecoder();
    const nullIndex = bytes.indexOf(0);
    return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}
/**
 * Create a schema identifier from string
 */
function createSchema(schema) {
    return createRole(schema); // Same format
}
/**
 * Decode a schema identifier to string
 */
function decodeSchema(bytes) {
    return decodeRole(bytes);
}
/**
 * Create a document URI
 */
function createUri(uri) {
    const bytes = new Uint8Array(128);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(uri.slice(0, 128));
    bytes.set(encoded);
    return bytes;
}
/**
 * Decode a document URI
 */
function decodeUri(bytes) {
    const decoder = new TextDecoder();
    const nullIndex = bytes.indexOf(0);
    return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}
/**
 * Create a domain identifier for offchain signing
 */
function createDomain(domain) {
    const bytes = new Uint8Array(64);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(domain.slice(0, 64));
    bytes.set(encoded);
    return bytes;
}
/**
 * Compute SHA-256 hash of data (browser-compatible)
 */
async function computeDocHash(data) {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(hashBuffer);
}
/**
 * Create canonical message for offchain signing (SIWS-style)
 */
function createSigningMessage(params) {
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
function tierMeetsRequirement(actual, required) {
    return actual >= required;
}
/**
 * Check if a document can be signed
 */
function canBeSigned(document) {
    return document.status === DocumentStatus.Draft || document.status === DocumentStatus.Final;
}
/**
 * Get signature tier display name
 */
function getTierName(tier) {
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
function formatDocHash(hash) {
    return Array.from(hash.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('') + '...';
}
//# sourceMappingURL=document.js.map