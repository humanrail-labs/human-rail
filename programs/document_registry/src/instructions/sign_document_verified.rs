use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{
        Document, DocumentSigningReceipt, SignatureMode, SignatureRecord,
        SignatureStatus, SignerType, MAX_IDENTIFIER_LEN,
    },
    SignDocumentTxParams, SignatureTier,
};

/// Minimum human score required for verified signing
pub const MIN_VERIFIED_SIGNING_SCORE: u16 = 50;

/// Tier 1: Verified Human Signing
/// Requires the signer to have a valid HumanProfile with sufficient attestations.
pub fn handler(ctx: Context<SignDocumentVerified>, params: SignDocumentTxParams) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;
    let human_profile = &ctx.accounts.human_profile;

    // Validate document can be signed
    require!(
        document.can_be_signed(),
        DocumentRegistryError::DocumentVoided
    );

    // Validate role is not empty
    require!(
        params.role != [0u8; MAX_IDENTIFIER_LEN],
        DocumentRegistryError::InvalidRole
    );

    // Validate human profile has sufficient score
    require!(
        human_profile.human_score >= MIN_VERIFIED_SIGNING_SCORE,
        DocumentRegistryError::InsufficientHumanScore
    );

    // Create signature record
    let signature = &mut ctx.accounts.signature_record;
    signature.document = document.key();
    signature.signer_type = SignerType::Human;
    signature.signer_pubkey = ctx.accounts.signer.key();
    signature.principal_pubkey = ctx.accounts.signer.key();
    signature.has_principal = false;
    signature.capability_id = Pubkey::default();
    signature.has_capability = false;
    signature.attestation_id = human_profile.key(); // Link to attestation
    signature.has_attestation = true;
    signature.signature_mode = SignatureMode::TxApproval;
    signature.signature_bytes = [0u8; 64];
    signature.has_signature_bytes = false;
    signature.role = params.role;
    signature.tier = SignatureTier::VerifiedSigner;
    signature.status = SignatureStatus::Active;
    signature.signed_at_slot = clock.slot;
    signature.signed_at_ts = clock.unix_timestamp;
    signature.revoked_at_slot = 0;
    signature.revoked_at_ts = 0;
    signature.human_score_at_signing = human_profile.human_score;
    signature.bump = ctx.bumps.signature_record;

    // Handle optional metadata
    if params.has_metadata {
        signature.metadata = params.signature_metadata;
        signature.has_metadata = true;
    } else {
        signature.metadata = [0u8; 64];
        signature.has_metadata = false;
    }

    // Update document signature count
    document.signature_count = document.signature_count.saturating_add(1);

    // Create receipt for audit trail
    let receipt = &mut ctx.accounts.signing_receipt;
    receipt.document = document.key();
    receipt.signature_record = signature.key();
    receipt.principal = ctx.accounts.signer.key();
    receipt.agent = Pubkey::default();
    receipt.is_agent_signature = false;
    receipt.capability = Pubkey::default();
    receipt.doc_hash = document.doc_hash;
    receipt.role = params.role;
    receipt.tier = SignatureTier::VerifiedSigner;
    receipt.slot = clock.slot;
    receipt.timestamp = clock.unix_timestamp;
    receipt.bump = ctx.bumps.signing_receipt;

    emit!(VerifiedDocumentSigned {
        document: document.key(),
        signature_record: signature.key(),
        signer: signature.signer_pubkey,
        human_profile: human_profile.key(),
        human_score: human_profile.human_score,
        is_unique: human_profile.is_unique,
        role: params.role,
        tier: SignatureTier::VerifiedSigner,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document signed (Tier 1 Verified): signer={}, score={}, unique={}",
        signature.signer_pubkey,
        human_profile.human_score,
        human_profile.is_unique
    );

    Ok(())
}

/// HumanProfile account structure (imported from human_registry)
/// This is a local definition to avoid circular dependencies
#[account]
pub struct HumanProfile {
    pub wallet: Pubkey,
    pub human_score: u16,
    pub is_unique: bool,
    pub attestation_count: u32,
    pub last_attestation_at: i64,
    pub last_attestation_hash: [u8; 32],
    // Note: attestations Vec omitted for size calculation simplicity
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(params: SignDocumentTxParams)]
pub struct SignDocumentVerified<'info> {
    /// The signer - their tx signature proves intent
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The signer's human profile (from human_registry)
    /// Validates they are a verified human
    #[account(
        seeds = [b"human_profile", signer.key().as_ref()],
        bump,
        seeds::program = human_registry_program.key()
    )]
    pub human_profile: Account<'info, HumanProfile>,

    /// The document being signed
    #[account(
        mut,
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump
    )]
    pub document: Account<'info, Document>,

    /// The signature record PDA
    #[account(
        init,
        payer = signer,
        space = SignatureRecord::LEN,
        seeds = [
            b"signature",
            document.key().as_ref(),
            signer.key().as_ref(),
            params.role.as_ref()
        ],
        bump
    )]
    pub signature_record: Account<'info, SignatureRecord>,

    /// Receipt for audit trail
    #[account(
        init,
        payer = signer,
        space = DocumentSigningReceipt::LEN,
        seeds = [
            b"signing_receipt",
            document.key().as_ref(),
            signer.key().as_ref(),
            params.role.as_ref()
        ],
        bump
    )]
    pub signing_receipt: Account<'info, DocumentSigningReceipt>,

    /// Human Registry program for CPI verification
    /// CHECK: Verified by known program ID
    #[account(address = crate::HUMAN_REGISTRY_PROGRAM_ID)]
    pub human_registry_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Known Human Registry program ID
pub const HUMAN_REGISTRY_PROGRAM_ID: Pubkey = 
    anchor_lang::solana_program::pubkey!("Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR");

#[event]
pub struct VerifiedDocumentSigned {
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub signer: Pubkey,
    pub human_profile: Pubkey,
    pub human_score: u16,
    pub is_unique: bool,
    pub role: [u8; 32],
    pub tier: SignatureTier,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
