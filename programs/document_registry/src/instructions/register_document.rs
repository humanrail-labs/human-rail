use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, DocumentStatus},
    RegisterDocumentParams,
};

pub fn handler(ctx: Context<RegisterDocument>, params: RegisterDocumentParams) -> Result<()> {
    let clock = Clock::get()?;

    // Validate doc_hash is not empty
    require!(
        params.doc_hash != [0u8; 32],
        DocumentRegistryError::InvalidDocumentHash
    );

    let document = &mut ctx.accounts.document;
    document.doc_hash = params.doc_hash;
    document.hash_algorithm = params.hash_algorithm;
    document.schema = params.schema;
    document.creator = ctx.accounts.creator.key();
    document.status = DocumentStatus::Draft;
    document.created_at_slot = clock.slot;
    document.created_at_ts = clock.unix_timestamp;
    document.finalized_at_slot = 0;
    document.finalized_at_ts = 0;
    document.signature_count = 0;
    document.required_signer_count = 0;
    document.bump = ctx.bumps.document;

    // Handle optional URI
    if params.has_uri {
        document.uri = params.uri;
        document.has_uri = true;
    } else {
        document.uri = [0u8; 128];
        document.has_uri = false;
    }

    // Handle optional metadata
    if params.has_metadata {
        document.metadata_hash = params.metadata_hash;
        document.has_metadata = true;
    } else {
        document.metadata_hash = [0u8; 32];
        document.has_metadata = false;
    }

    // Handle versioning
    if let Some(prev_version) = params.version_of {
        document.version_of = prev_version;
        document.is_versioned = true;
        // Version number would ideally be fetched from previous doc
        document.version_number = 2; // Simplified - in production, query prev version
    } else {
        document.version_of = Pubkey::default();
        document.is_versioned = false;
        document.version_number = 1;
    }

    emit!(DocumentRegistered {
        document: document.key(),
        doc_hash: document.doc_hash,
        schema: document.schema,
        creator: document.creator,
        version_number: document.version_number,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document registered: hash={:?}, creator={}",
        &document.doc_hash[..8],
        document.creator
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: RegisterDocumentParams)]
pub struct RegisterDocument<'info> {
    /// Creator of the document record
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The document PDA - keyed by doc_hash
    #[account(
        init,
        payer = creator,
        space = Document::LEN,
        seeds = [b"document", params.doc_hash.as_ref()],
        bump
    )]
    pub document: Account<'info, Document>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct DocumentRegistered {
    pub document: Pubkey,
    pub doc_hash: [u8; 32],
    pub schema: [u8; 32],
    pub creator: Pubkey,
    pub version_number: u32,
    pub slot: u64,
    pub timestamp: i64,
}
