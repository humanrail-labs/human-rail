use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, RequiredSigner, SignatureRecord, SignatureStatus},
    SignatureTier,
};

/// Verify a document has all required signatures.
/// Designed for CPI calls from other programs that need to verify completion.
pub fn handler(ctx: Context<VerifyDocumentComplete>) -> Result<()> {
    let document = &ctx.accounts.document;
    let required_signer = &ctx.accounts.required_signer;
    let signature = &ctx.accounts.signature_record;

    // Verify signature is for this document
    require!(
        signature.document == document.key(),
        DocumentRegistryError::InvalidAccountData
    );

    // Verify signature is active
    require!(
        signature.status == SignatureStatus::Active,
        DocumentRegistryError::SignatureAlreadyRevoked
    );

    // Verify role matches requirement
    require!(
        signature.role == required_signer.role,
        DocumentRegistryError::InvalidRole
    );

    // Verify tier meets minimum requirement
    require!(
        signature.tier >= required_signer.min_tier,
        DocumentRegistryError::InsufficientSignatureTier
    );

    // If specific signer is required, verify it matches
    if required_signer.has_required_signer {
        // For agent signatures, check principal; for human, check signer
        let actual_signer = if signature.has_principal {
            signature.principal_pubkey
        } else {
            signature.signer_pubkey
        };

        require!(
            actual_signer == required_signer.required_signer,
            DocumentRegistryError::WrongSigner
        );
    }

    emit!(DocumentVerified {
        document: document.key(),
        required_signer: required_signer.key(),
        signature_record: signature.key(),
        role: required_signer.role,
        tier: signature.tier,
        min_tier_required: required_signer.min_tier,
    });

    msg!(
        "Document requirement verified: role={:?}, tier={:?}",
        &required_signer.role[..8],
        signature.tier
    );

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyDocumentComplete<'info> {
    /// The document to verify
    #[account(
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump
    )]
    pub document: Account<'info, Document>,

    /// The required signer specification
    #[account(
        seeds = [
            b"required_signer",
            document.key().as_ref(),
            required_signer.role.as_ref()
        ],
        bump = required_signer.bump,
        constraint = required_signer.document == document.key() @ DocumentRegistryError::InvalidAccountData
    )]
    pub required_signer: Account<'info, RequiredSigner>,

    /// The signature that should satisfy the requirement
    #[account(
        seeds = [
            b"signature",
            document.key().as_ref(),
            signature_record.signer_pubkey.as_ref(),
            signature_record.role.as_ref()
        ],
        bump = signature_record.bump
    )]
    pub signature_record: Account<'info, SignatureRecord>,
}

#[event]
pub struct DocumentVerified {
    pub document: Pubkey,
    pub required_signer: Pubkey,
    pub signature_record: Pubkey,
    pub role: [u8; 32],
    pub tier: SignatureTier,
    pub min_tier_required: SignatureTier,
}
