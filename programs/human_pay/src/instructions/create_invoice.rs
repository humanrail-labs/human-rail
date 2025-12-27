use crate::{
    error::HumanPayError,
    state::{ConfidentialInvoice, InvoiceStatus},
    CreateInvoiceParams,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};

#[derive(Accounts)]
#[instruction(params: CreateInvoiceParams)]
pub struct CreateConfidentialInvoice<'info> {
    #[account(
        init,
        payer = merchant,
        space = ConfidentialInvoice::LEN,
        seeds = [
            b"invoice",
            merchant.key().as_ref(),
            mint.key().as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub invoice: Account<'info, ConfidentialInvoice>,

    #[account(
        init,
        payer = merchant,
        token::mint = mint,
        token::authority = invoice,
        seeds = [b"vault", invoice.key().as_ref()],
        bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateConfidentialInvoice>, params: CreateInvoiceParams) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;
    let clock = Clock::get()?;

    // Validate expiration if set
    if params.expires_at != 0 {
        require!(
            params.expires_at > clock.unix_timestamp,
            HumanPayError::InvalidExpiration
        );
    }

    // Initialize invoice
    invoice.merchant = ctx.accounts.merchant.key();
    invoice.payer = Pubkey::default();
    invoice.amount = params.amount;
    invoice.mint = ctx.accounts.mint.key();
    invoice.human_requirements = params.human_requirements;
    invoice.status = InvoiceStatus::Open;
    invoice.created_at = clock.unix_timestamp;
    invoice.expires_at = params.expires_at;
    invoice.paid_at = 0;
    invoice.memo = params.memo;
    invoice.vault = ctx.accounts.vault.key();
    invoice.bump = ctx.bumps.invoice;
    invoice.vault_bump = ctx.bumps.vault;

    msg!(
        "Created invoice: amount={}, mint={}, nonce={}, human_req={}",
        params.amount,
        ctx.accounts.mint.key(),
        params.nonce,
        params.human_requirements
    );

    Ok(())
}
