use anchor_lang::prelude::*;
use crate::{HashAlgorithm, SignatureTier};

// =============================================================================
// CONSTANTS
// =============================================================================

/// Maximum URI length
pub const MAX_URI_LEN: usize = 128;

/// Maximum role/schema identifier length
pub const MAX_IDENTIFIER_LEN: usize = 32;

/// Maximum signature metadata length
pub const MAX_SIG_METADATA_LEN: usize = 64;

/// Maximum required signers per document
pub const MAX_REQUIRED_SIGNERS: usize = 10;

/// Maximum message length for offchain signatures
pub const MAX_OFFCHAIN_MESSAGE_LEN: usize = 1024;

// =============================================================================
// DOCUMENT STATUS
// =============================================================================

/// Document lifecycle status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum DocumentStatus {
    /// Document is in draft state, can be modified
    #[default]
    Draft,
    /// Document is finalized, signatures are binding
    Final,
    /// Document has been voided/cancelled
    Void,
}

// =============================================================================
// SIGNER TYPE
// =============================================================================

/// Type of entity signing the document
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum SignerType {
    /// Human signer (wallet owner)
    #[default]
    Human,
    /// AI agent signing on behalf of principal
    Agent,
    /// Organization (multi-sig or DAO)
    Organization,
}

// =============================================================================
// SIGNATURE MODE
// =============================================================================

/// How the signature was captured
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum SignatureMode {
    /// Transaction approval - signing the Solana transaction proves intent
    #[default]
    TxApproval,
    /// Offchain message - Ed25519 signature over canonical message
    OffchainMessage,
}

// =============================================================================
// SIGNATURE STATUS
// =============================================================================

/// Signature validity status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum SignatureStatus {
    /// Signature is active and valid
    #[default]
    Active,
    /// Signature has been revoked by signer
    Revoked,
}

// =============================================================================
// DOCUMENT ACCOUNT
// =============================================================================

/// Document record - represents a hashable document for signing
#[account]
pub struct Document {
    /// SHA-256 (or other) hash of the document content
    pub doc_hash: [u8; 32],
    /// Hash algorithm used
    pub hash_algorithm: HashAlgorithm,
    /// Schema identifier (e.g., "invoice_v1")
    pub schema: [u8; MAX_IDENTIFIER_LEN],
    /// URI pointing to document content (IPFS, Arweave, HTTPS)
    pub uri: [u8; MAX_URI_LEN],
    /// Whether URI is set
    pub has_uri: bool,
    /// Optional metadata hash (for structured data)
    pub metadata_hash: [u8; 32],
    /// Whether metadata is set
    pub has_metadata: bool,
    /// Creator of this document record
    pub creator: Pubkey,
    /// Current document status
    pub status: DocumentStatus,
    /// Slot when document was registered
    pub created_at_slot: u64,
    /// Timestamp when document was registered
    pub created_at_ts: i64,
    /// Slot when document was finalized (0 if not finalized)
    pub finalized_at_slot: u64,
    /// Timestamp when finalized
    pub finalized_at_ts: i64,
    /// If this is a new version, reference to previous version
    pub version_of: Pubkey,
    /// Whether version_of is set
    pub is_versioned: bool,
    /// Version number (1 for original, increments for versions)
    pub version_number: u32,
    /// Total number of signatures on this document
    pub signature_count: u32,
    /// Number of required signers (if any)
    pub required_signer_count: u8,
    /// PDA bump
    pub bump: u8,
}

impl Document {
    pub const LEN: usize = 8 + // discriminator
        32 + // doc_hash
        1 +  // hash_algorithm
        MAX_IDENTIFIER_LEN + // schema
        MAX_URI_LEN + // uri
        1 +  // has_uri
        32 + // metadata_hash
        1 +  // has_metadata
        32 + // creator
        1 +  // status
        8 +  // created_at_slot
        8 +  // created_at_ts
        8 +  // finalized_at_slot
        8 +  // finalized_at_ts
        32 + // version_of
        1 +  // is_versioned
        4 +  // version_number
        4 +  // signature_count
        1 +  // required_signer_count
        1;   // bump

    /// Check if document can be signed
    pub fn can_be_signed(&self) -> bool {
        self.status == DocumentStatus::Draft || self.status == DocumentStatus::Final
    }

    /// Check if document is finalized
    pub fn is_final(&self) -> bool {
        self.status == DocumentStatus::Final
    }

    /// Check if document is voided
    pub fn is_void(&self) -> bool {
        self.status == DocumentStatus::Void
    }
}

// =============================================================================
// SIGNATURE RECORD
// =============================================================================

/// Signature record - proves a signer authorized a document
#[account]
pub struct SignatureRecord {
    /// The document this signature belongs to
    pub document: Pubkey,
    /// Type of signer
    pub signer_type: SignerType,
    /// Public key of the signer (wallet, agent, or org)
    pub signer_pubkey: Pubkey,
    /// Principal pubkey (required if signer is AGENT)
    pub principal_pubkey: Pubkey,
    /// Whether principal is set (true for agent signatures)
    pub has_principal: bool,
    /// Capability ID used (required if signer is AGENT)
    pub capability_id: Pubkey,
    /// Whether capability is set
    pub has_capability: bool,
    /// Human profile attestation ID (for verified signers)
    pub attestation_id: Pubkey,
    /// Whether attestation is set
    pub has_attestation: bool,
    /// How signature was captured
    pub signature_mode: SignatureMode,
    /// Offchain signature bytes (only for OffchainMessage mode)
    pub signature_bytes: [u8; 64],
    /// Whether signature_bytes is set
    pub has_signature_bytes: bool,
    /// Role of the signer (e.g., "issuer", "buyer")
    pub role: [u8; MAX_IDENTIFIER_LEN],
    /// Signature tier achieved
    pub tier: SignatureTier,
    /// Current signature status
    pub status: SignatureStatus,
    /// Slot when signed
    pub signed_at_slot: u64,
    /// Timestamp when signed
    pub signed_at_ts: i64,
    /// Slot when revoked (0 if not revoked)
    pub revoked_at_slot: u64,
    /// Timestamp when revoked
    pub revoked_at_ts: i64,
    /// Optional metadata (e.g., "Approved as Legal Counsel")
    pub metadata: [u8; MAX_SIG_METADATA_LEN],
    /// Whether metadata is set
    pub has_metadata: bool,
    /// Human score at time of signing (if verified)
    pub human_score_at_signing: u16,
    /// PDA bump
    pub bump: u8,
}

impl SignatureRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // document
        1 +  // signer_type
        32 + // signer_pubkey
        32 + // principal_pubkey
        1 +  // has_principal
        32 + // capability_id
        1 +  // has_capability
        32 + // attestation_id
        1 +  // has_attestation
        1 +  // signature_mode
        64 + // signature_bytes
        1 +  // has_signature_bytes
        MAX_IDENTIFIER_LEN + // role
        1 +  // tier
        1 +  // status
        8 +  // signed_at_slot
        8 +  // signed_at_ts
        8 +  // revoked_at_slot
        8 +  // revoked_at_ts
        MAX_SIG_METADATA_LEN + // metadata
        1 +  // has_metadata
        2 +  // human_score_at_signing
        1;   // bump

    /// Check if signature is valid (active and not revoked)
    pub fn is_valid(&self) -> bool {
        self.status == SignatureStatus::Active
    }
}

// =============================================================================
// REQUIRED SIGNER
// =============================================================================

/// Required signer specification for a document
#[account]
pub struct RequiredSigner {
    /// The document this requirement belongs to
    pub document: Pubkey,
    /// Role that must sign
    pub role: [u8; MAX_IDENTIFIER_LEN],
    /// Specific signer required (if any)
    pub required_signer: Pubkey,
    /// Whether specific signer is required
    pub has_required_signer: bool,
    /// Minimum signature tier required
    pub min_tier: SignatureTier,
    /// Whether this requirement has been satisfied
    pub is_satisfied: bool,
    /// Signature that satisfied this requirement (if any)
    pub satisfying_signature: Pubkey,
    /// Sequence number (for ordering)
    pub sequence: u8,
    /// PDA bump
    pub bump: u8,
}

impl RequiredSigner {
    pub const LEN: usize = 8 + // discriminator
        32 + // document
        MAX_IDENTIFIER_LEN + // role
        32 + // required_signer
        1 +  // has_required_signer
        1 +  // min_tier
        1 +  // is_satisfied
        32 + // satisfying_signature
        1 +  // sequence
        1;   // bump
}

// =============================================================================
// OFFCHAIN MESSAGE FORMAT (SIWS-style)
// =============================================================================

/// Canonical message format for offchain signing
/// Following Sign-In With Solana patterns for replay protection
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OffchainSigningMessage {
    /// Domain for scope (e.g., "humanrail.io")
    pub domain: [u8; 64],
    /// Document hash being signed
    pub doc_hash: [u8; 32],
    /// Role of signer
    pub role: [u8; MAX_IDENTIFIER_LEN],
    /// Signer public key
    pub signer: Pubkey,
    /// Unique nonce for this signature
    pub nonce: u64,
    /// When message was issued
    pub issued_at: i64,
    /// When message expires
    pub expires_at: i64,
    /// Chain ID for cross-chain protection
    pub chain_id: [u8; 16],
}

impl OffchainSigningMessage {
    /// Create canonical bytes for signing
    pub fn to_signing_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(256);
        bytes.extend_from_slice(&self.domain);
        bytes.extend_from_slice(&self.doc_hash);
        bytes.extend_from_slice(&self.role);
        bytes.extend_from_slice(self.signer.as_ref());
        bytes.extend_from_slice(&self.nonce.to_le_bytes());
        bytes.extend_from_slice(&self.issued_at.to_le_bytes());
        bytes.extend_from_slice(&self.expires_at.to_le_bytes());
        bytes.extend_from_slice(&self.chain_id);
        bytes
    }
}

// =============================================================================
// DOCUMENT SIGNING RECEIPT (for KYA integration)
// =============================================================================

/// Receipt emitted for every signature - integrates with receipts program
#[account]
pub struct DocumentSigningReceipt {
    /// The document that was signed
    pub document: Pubkey,
    /// The signature record
    pub signature_record: Pubkey,
    /// Principal who authorized (same as signer for human, different for agent)
    pub principal: Pubkey,
    /// Agent that signed (if agent signature)
    pub agent: Pubkey,
    /// Whether agent is set
    pub is_agent_signature: bool,
    /// Capability used (if agent signature)
    pub capability: Pubkey,
    /// Document hash at time of signing
    pub doc_hash: [u8; 32],
    /// Role signed as
    pub role: [u8; MAX_IDENTIFIER_LEN],
    /// Tier of signature
    pub tier: SignatureTier,
    /// Slot of signing
    pub slot: u64,
    /// Timestamp of signing
    pub timestamp: i64,
    /// PDA bump
    pub bump: u8,
}

impl DocumentSigningReceipt {
    pub const LEN: usize = 8 + // discriminator
        32 + // document
        32 + // signature_record
        32 + // principal
        32 + // agent
        1 +  // is_agent_signature
        32 + // capability
        32 + // doc_hash
        MAX_IDENTIFIER_LEN + // role
        1 +  // tier
        8 +  // slot
        8 +  // timestamp
        1;   // bump
}
