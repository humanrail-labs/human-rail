use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{Document, DocumentStatus, RequiredSigner, MAX_REQUIRED_SIGNERS},
    RequiredSignerParams,
};

pub fn handler(ctx: Context<AddRequiredSigner>, params: RequiredSignerParams) -> Result<()> {
    let document = &mut ctx.accounts.document;

    // Only creator can add required signers
    require!(
        document.creator == ctx.accounts.creator.key(),
        DocumentRegistryError::NotDocumentCreator
    );

    // Can only add requirements to drafts
    require!(
        document.status == DocumentStatus::Draft,
        DocumentRegistryError::DocumentAlreadyFinalized
    );

    // Check max required signers
    require!(
        (document.required_signer_count as usize) < MAX_REQUIRED_SIGNERS,
        DocumentRegistryError::TooManyRequiredSigners
    );

    let required_signer = &mut ctx.accounts.required_signer;
    required_signer.document = document.key();
    required_signer.role = params.role;
    required_signer.min_tier = params.min_tier;
    required_signer.is_satisfied = false;
    required_signer.satisfying_signature = Pubkey::default();
    required_signer.sequence = document.required_signer_count;
    required_signer.bump = ctx.bumps.required_signer;

    // Handle optional specific signer requirement
    if let Some(signer) = params.required_signer {
        required_signer.required_signer = signer;
        required_signer.has_required_signer = true;
    } else {
        required_signer.required_signer = Pubkey::default();
        required_signer.has_required_signer = false;
    }

    // Increment document's required signer count
    document.required_signer_count = document.required_signer_count.saturating_add(1);

    emit!(RequiredSignerAdded {
        document: document.key(),
        required_signer: required_signer.key(),
        role: params.role,
        min_tier: params.min_tier,
        specific_signer: params.required_signer,
        sequence: required_signer.sequence,
    });

    msg!(
        "Required signer added: role={:?}, tier={:?}",
        &params.role[..8],
        params.min_tier
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: RequiredSignerParams)]
pub struct AddRequiredSigner<'info> {
    /// Document creator
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The document to add requirement to
    #[account(
        mut,
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump,
        constraint = document.creator == creator.key() @ DocumentRegistryError::NotDocumentCreator
    )]
    pub document: Account<'info, Document>,

    /// The required signer specification PDA
    #[account(
        init,
        payer = creator,
        space = RequiredSigner::LEN,
        seeds = [
            b"required_signer",
            document.key().as_ref(),
            params.role.as_ref()
        ],
        bump
    )]
    pub required_signer: Account<'info, RequiredSigner>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct RequiredSignerAdded {
    pub document: Pubkey,
    pub required_signer: Pubkey,
    pub role: [u8; 32],
    pub min_tier: crate::SignatureTier,
    pub specific_signer: Option<Pubkey>,
    pub sequence: u8,
}
