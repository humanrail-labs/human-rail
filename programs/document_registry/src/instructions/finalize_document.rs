use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, DocumentStatus},
};

pub fn handler(ctx: Context<FinalizeDocument>) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;

    // Only creator can finalize
    require!(
        document.creator == ctx.accounts.creator.key(),
        DocumentRegistryError::NotDocumentCreator
    );

    // Can only finalize drafts
    require!(
        document.status == DocumentStatus::Draft,
        DocumentRegistryError::DocumentAlreadyFinalized
    );

    document.status = DocumentStatus::Final;
    document.finalized_at_slot = clock.slot;
    document.finalized_at_ts = clock.unix_timestamp;

    emit!(DocumentFinalized {
        document: document.key(),
        doc_hash: document.doc_hash,
        creator: document.creator,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document finalized: hash={:?}, signatures={}",
        &document.doc_hash[..8],
        document.signature_count
    );

    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeDocument<'info> {
    /// Creator of the document
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The document to finalize
    #[account(
        mut,
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump,
        constraint = document.creator == creator.key() @ DocumentRegistryError::NotDocumentCreator
    )]
    pub document: Account<'info, Document>,
}

#[event]
pub struct DocumentFinalized {
    pub document: Pubkey,
    pub doc_hash: [u8; 32],
    pub creator: Pubkey,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
