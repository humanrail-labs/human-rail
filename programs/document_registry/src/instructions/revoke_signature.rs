use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, SignatureRecord, SignatureStatus, SignerType},
};

pub fn handler(ctx: Context<RevokeSignature>) -> Result<()> {
    let clock = Clock::get()?;
    let signature = &mut ctx.accounts.signature_record;

    // Cannot revoke already revoked signature
    require!(
        signature.status != SignatureStatus::Revoked,
        DocumentRegistryError::SignatureAlreadyRevoked
    );

    // Verify the revoker is the original signer
    // For human signatures, signer must match
    // For agent signatures, the principal can revoke
    let is_authorized = match signature.signer_type {
        SignerType::Human => signature.signer_pubkey == ctx.accounts.revoker.key(),
        SignerType::Agent => {
            // Either the agent's signing key OR the principal can revoke
            signature.signer_pubkey == ctx.accounts.revoker.key()
                || (signature.has_principal
                    && signature.principal_pubkey == ctx.accounts.revoker.key())
        }
        SignerType::Organization => signature.signer_pubkey == ctx.accounts.revoker.key(),
    };

    require!(is_authorized, DocumentRegistryError::NotSignatureOwner);

    signature.status = SignatureStatus::Revoked;
    signature.revoked_at_slot = clock.slot;
    signature.revoked_at_ts = clock.unix_timestamp;

    emit!(SignatureRevoked {
        document: signature.document,
        signature_record: signature.key(),
        signer: signature.signer_pubkey,
        revoked_by: ctx.accounts.revoker.key(),
        signer_type: signature.signer_type,
        role: signature.role,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Signature revoked: signer={}, by={}",
        signature.signer_pubkey,
        ctx.accounts.revoker.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeSignature<'info> {
    /// The entity revoking the signature (signer or principal for agent sigs)
    #[account(mut)]
    pub revoker: Signer<'info>,

    /// The document (for verification)
    #[account(
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump
    )]
    pub document: Account<'info, Document>,

    /// The signature record to revoke
    #[account(
        mut,
        seeds = [
            b"signature",
            document.key().as_ref(),
            signature_record.signer_pubkey.as_ref(),
            signature_record.role.as_ref()
        ],
        bump = signature_record.bump,
        constraint = signature_record.document == document.key() @ DocumentRegistryError::InvalidAccountData
    )]
    pub signature_record: Account<'info, SignatureRecord>,
}

#[event]
pub struct SignatureRevoked {
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub signer: Pubkey,
    pub revoked_by: Pubkey,
    pub signer_type: SignerType,
    pub role: [u8; 32],
    pub slot: u64,
    pub timestamp: i64,
}
