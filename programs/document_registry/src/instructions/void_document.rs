use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, DocumentStatus},
};

pub fn handler(ctx: Context<VoidDocument>) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;

    // Only creator can void
    require!(
        document.creator == ctx.accounts.creator.key(),
        DocumentRegistryError::NotDocumentCreator
    );

    // Cannot void already voided documents
    require!(
        document.status != DocumentStatus::Void,
        DocumentRegistryError::DocumentAlreadyVoided
    );

    let previous_status = document.status;
    document.status = DocumentStatus::Void;

    emit!(DocumentVoided {
        document: document.key(),
        doc_hash: document.doc_hash,
        creator: document.creator,
        previous_status,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document voided: hash={:?}, had {} signatures",
        &document.doc_hash[..8],
        document.signature_count
    );

    Ok(())
}

#[derive(Accounts)]
pub struct VoidDocument<'info> {
    /// Creator of the document
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The document to void
    #[account(
        mut,
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump,
        constraint = document.creator == creator.key() @ DocumentRegistryError::NotDocumentCreator
    )]
    pub document: Account<'info, Document>,
}

#[event]
pub struct DocumentVoided {
    pub document: Pubkey,
    pub doc_hash: [u8; 32],
    pub creator: Pubkey,
    pub previous_status: DocumentStatus,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
