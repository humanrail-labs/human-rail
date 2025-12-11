use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use human_registry::{program::HumanRegistry, state::HumanProfile};
use crate::{
    error::HumanPayError,
    state::{ConfidentialInvoice, InvoiceStatus},
    utils::{execute_transfer, is_expired},
};

#[derive(Accounts)]
pub struct PayConfidentialInvoice<'info> {
    #[account(
        mut,
        constraint = invoice.status == InvoiceStatus::Open @ HumanPayError::InvalidInvoiceState,
        constraint = invoice.mint == mint.key() @ HumanPayError::InvalidMint
    )]
    pub invoice: Account<'info, ConfidentialInvoice>,

    #[account(
        mut,
        constraint = vault.key() == invoice.vault @ HumanPayError::InvalidInvoiceState
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// Payer's human profile for verification
    #[account(
        seeds = [b"human_profile", payer.key().as_ref()],
        bump = payer_profile.bump,
        seeds::program = human_registry_program.key()
    )]
    pub payer_profile: Account<'info, HumanProfile>,

    #[account(
        mut,
        constraint = payer_token_account.mint == mint.key() @ HumanPayError::InvalidMint
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub human_registry_program: Program<'info, HumanRegistry>,
    pub token_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<PayConfidentialInvoice>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;
    let payer_profile = &ctx.accounts.payer_profile;
    let clock = Clock::get()?;

    // Check expiration
    require!(
        !is_expired(invoice.expires_at, clock.unix_timestamp),
        HumanPayError::InvoiceExpired
    );

    // Verify payer meets human requirements
    require!(
        payer_profile.human_score >= invoice.human_requirements,
        HumanPayError::InsufficientHumanScore
    );

    // Check payer has sufficient balance
    require!(
        ctx.accounts.payer_token_account.amount >= invoice.amount,
        HumanPayError::InsufficientBalance
    );

    // Execute the transfer to vault
    execute_transfer(
        ctx.accounts.payer_token_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        invoice.amount,
        ctx.accounts.mint.decimals,
        None,
    )?;

    // Update invoice state
    invoice.payer = ctx.accounts.payer.key();
    invoice.status = InvoiceStatus::Paid;
    invoice.paid_at = clock.unix_timestamp;

    msg!(
        "Invoice paid: payer={}, amount={}, human_score={}",
        ctx.accounts.payer.key(),
        invoice.amount,
        payer_profile.human_score
    );

    Ok(())
}
