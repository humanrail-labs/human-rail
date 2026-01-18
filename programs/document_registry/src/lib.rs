use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28");

#[program]
pub mod document_registry {
    use super::*;

    // =========================================================================
    // DOCUMENT MANAGEMENT
    // =========================================================================

    /// Register a new document for signing.
    /// Creates a document record with hash, schema, and optional URI.
    pub fn register_document(
        ctx: Context<RegisterDocument>,
        params: RegisterDocumentParams,
    ) -> Result<()> {
        instructions::register_document::handler(ctx, params)
    }

    /// Finalize a document - locks it from further modifications.
    /// Only the creator can finalize. Once final, signatures are binding.
    pub fn finalize_document(ctx: Context<FinalizeDocument>) -> Result<()> {
        instructions::finalize_document::handler(ctx)
    }

    /// Void a document - marks it as cancelled/invalid.
    /// Only creator can void. Voided documents cannot be signed.
    pub fn void_document(ctx: Context<VoidDocument>) -> Result<()> {
        instructions::void_document::handler(ctx)
    }

    // =========================================================================
    // MODE A: TRANSACTION-ATTESTED SIGNING
    // =========================================================================

    /// Sign a document via transaction attestation (Mode A).
    /// The signer's wallet signature on the transaction proves intent.
    /// This is the simplest and most common signing mode.
    pub fn sign_document_tx(
        ctx: Context<SignDocumentTx>,
        params: SignDocumentTxParams,
    ) -> Result<()> {
        instructions::sign_document_tx::handler(ctx, params)
    }

    /// Sign a document as a verified human (Tier 1).
    /// Requires a valid HumanProfile attestation.
    pub fn sign_document_verified(
        ctx: Context<SignDocumentVerified>,
        params: SignDocumentTxParams,
    ) -> Result<()> {
        instructions::sign_document_verified::handler(ctx, params)
    }

    /// Sign a document as an agent on behalf of a principal (Tier 2).
    /// Requires valid agent registration and capability delegation.
    pub fn sign_document_agent(
        ctx: Context<SignDocumentAgent>,
        params: SignDocumentAgentParams,
    ) -> Result<()> {
        instructions::sign_document_agent::handler(ctx, params)
    }

    /// Sign a document autonomously as an agent (Tier 2 Autonomous).
    /// The AGENT signs the transaction (not the principal).
    /// True autonomous execution within delegated constraints.
    pub fn sign_document_agent_autonomous(
        ctx: Context<SignDocumentAgentAutonomous>,
        params: SignDocumentAgentParams,
    ) -> Result<()> {
        instructions::sign_document_agent_autonomous::handler(ctx, params)
    }

    // =========================================================================
    // MODE B: OFFCHAIN MESSAGE VERIFICATION
    // =========================================================================

    /// Anchor an offchain-signed message onchain (Mode B).
    /// Verifies Ed25519 signature via instruction introspection.
    /// Use for portable signatures across systems.
    pub fn anchor_offchain_signature(
        ctx: Context<AnchorOffchainSignature>,
        params: AnchorOffchainParams,
    ) -> Result<()> {
        instructions::anchor_offchain_signature::handler(ctx, params)
    }

    // =========================================================================
    // SIGNATURE MANAGEMENT
    // =========================================================================

    /// Revoke a signature. Only the original signer can revoke.
    /// Revoked signatures remain on-chain but are marked invalid.
    pub fn revoke_signature(ctx: Context<RevokeSignature>) -> Result<()> {
        instructions::revoke_signature::handler(ctx)
    }

    /// Add a co-signer requirement to a document.
    /// Specifies required roles/signers for the document to be fully executed.
    pub fn add_required_signer(
        ctx: Context<AddRequiredSigner>,
        params: RequiredSignerParams,
    ) -> Result<()> {
        instructions::add_required_signer::handler(ctx, params)
    }

    // =========================================================================
    // QUERIES (CPI-friendly)
    // =========================================================================

    /// Verify a document has all required signatures.
    /// Returns error if any required signature is missing or revoked.
    pub fn verify_document_complete(ctx: Context<VerifyDocumentComplete>) -> Result<()> {
        instructions::verify_document_complete::handler(ctx)
    }
}

// =============================================================================
// INSTRUCTION PARAMETERS
// =============================================================================

/// Parameters for registering a new document
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterDocumentParams {
    /// SHA-256 hash of document content (32 bytes)
    pub doc_hash: [u8; 32],
    /// Hash algorithm used (for future-proofing)
    pub hash_algorithm: HashAlgorithm,
    /// Document schema identifier (e.g., "invoice_v1", "contract_v2")
    pub schema: [u8; 32],
    /// Optional URI pointing to document (IPFS, Arweave, HTTPS)
    pub uri: [u8; 128],
    /// Whether URI is set
    pub has_uri: bool,
    /// Optional metadata hash (for structured data alongside doc)
    pub metadata_hash: [u8; 32],
    /// Whether metadata hash is set
    pub has_metadata: bool,
    /// Optional: this document is a new version of another
    pub version_of: Option<Pubkey>,
}

/// Parameters for transaction-attested signing
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SignDocumentTxParams {
    /// Role of the signer (e.g., "issuer", "buyer", "witness")
    pub role: [u8; 32],
    /// Optional metadata about this signature
    pub signature_metadata: [u8; 64],
    /// Whether metadata is set
    pub has_metadata: bool,
}

/// Parameters for agent signing on behalf of principal
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SignDocumentAgentParams {
    /// Role of the signer
    pub role: [u8; 32],
    /// Capability nonce for PDA derivation
    pub capability_nonce: u64,
    /// Optional metadata
    pub signature_metadata: [u8; 64],
    /// Whether metadata is set
    pub has_metadata: bool,
}

/// Parameters for anchoring offchain signature
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AnchorOffchainParams {
    /// The signed message bytes
    pub message: Vec<u8>,
    /// Ed25519 signature bytes (64 bytes)
    pub signature: [u8; 64],
    /// Role of the signer
    pub role: [u8; 32],
    /// Domain for replay protection (e.g., "humanrail.io")
    pub domain: [u8; 64],
    /// Nonce for replay protection
    pub nonce: u64,
    /// Expiration timestamp
    pub expires_at: i64,
}

/// Parameters for adding required signer
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RequiredSignerParams {
    /// Role that must sign
    pub role: [u8; 32],
    /// Optional: specific signer pubkey required (if None, any signer with role)
    pub required_signer: Option<Pubkey>,
    /// Minimum signature tier required
    pub min_tier: SignatureTier,
}

/// Hash algorithm enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum HashAlgorithm {
    #[default]
    Sha256,
    Sha3_256,
    Blake3,
    Keccak256,
}

/// Signature tier levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default, Debug)]
pub enum SignatureTier {
    /// Tier 0: Basic wallet notarization
    #[default]
    WalletNotarization,
    /// Tier 1: Verified human signer with attestation
    VerifiedSigner,
    /// Tier 2: Agent signing with KYA delegation
    AgentOnBehalf,
}
