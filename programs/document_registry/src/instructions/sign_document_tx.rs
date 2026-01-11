use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{
        Document, DocumentSigningReceipt, SignatureMode, SignatureRecord,
        SignatureStatus, SignerType, MAX_IDENTIFIER_LEN,
    },
    SignDocumentTxParams, SignatureTier,
};

/// Mode A: Transaction-attested signing (Tier 0 - Wallet Notarization)
/// The signer's wallet signature on the Solana transaction proves intent.
pub fn handler(ctx: Context<SignDocumentTx>, params: SignDocumentTxParams) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;

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

    // Create signature record
    let signature = &mut ctx.accounts.signature_record;
    signature.document = document.key();
    signature.signer_type = SignerType::Human;
    signature.signer_pubkey = ctx.accounts.signer.key();
    signature.principal_pubkey = ctx.accounts.signer.key(); // Same for human
    signature.has_principal = false;
    signature.capability_id = Pubkey::default();
    signature.has_capability = false;
    signature.attestation_id = Pubkey::default();
    signature.has_attestation = false;
    signature.signature_mode = SignatureMode::TxApproval;
    signature.signature_bytes = [0u8; 64];
    signature.has_signature_bytes = false;
    signature.role = params.role;
    signature.tier = SignatureTier::WalletNotarization;
    signature.status = SignatureStatus::Active;
    signature.signed_at_slot = clock.slot;
    signature.signed_at_ts = clock.unix_timestamp;
    signature.revoked_at_slot = 0;
    signature.revoked_at_ts = 0;
    signature.human_score_at_signing = 0;
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
    receipt.tier = SignatureTier::WalletNotarization;
    receipt.slot = clock.slot;
    receipt.timestamp = clock.unix_timestamp;
    receipt.bump = ctx.bumps.signing_receipt;

    emit!(DocumentSigned {
        document: document.key(),
        signature_record: signature.key(),
        signer: signature.signer_pubkey,
        signer_type: signature.signer_type,
        role: params.role,
        tier: SignatureTier::WalletNotarization,
        signature_mode: SignatureMode::TxApproval,
        document_status: document.status,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document signed (Tier 0): signer={}, role={:?}",
        signature.signer_pubkey,
        &params.role[..8]
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: SignDocumentTxParams)]
pub struct SignDocumentTx<'info> {
    /// The signer - their tx signature proves intent
    #[account(mut)]
    pub signer: Signer<'info>,

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

    pub system_program: Program<'info, System>,
}

#[event]
pub struct DocumentSigned {
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub signer: Pubkey,
    pub signer_type: SignerType,
    pub role: [u8; 32],
    pub tier: SignatureTier,
    pub signature_mode: SignatureMode,
    pub document_status: crate::state::DocumentStatus,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
