use crate::{
    error::HumanPayError,
    state::{ConfidentialInvoice, InvoiceStatus},
    utils::execute_transfer,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};

#[derive(Accounts)]
pub struct WithdrawInvoice<'info> {
    #[account(
        mut,
        constraint = invoice.merchant == merchant.key() @ HumanPayError::UnauthorizedMerchant,
        constraint = invoice.status == InvoiceStatus::Paid @ HumanPayError::InvalidInvoiceState
    )]
    pub invoice: Account<'info, ConfidentialInvoice>,

    #[account(
        mut,
        constraint = vault.key() == invoice.vault @ HumanPayError::InvalidInvoiceState
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = merchant_token_account.mint == mint.key() @ HumanPayError::InvalidMint
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<WithdrawInvoice>) -> Result<()> {
    // Take only the scalar data we need from the invoice and mint.
    // This avoids holding a &mut borrow across the CPI.
    let merchant_key = ctx.accounts.invoice.merchant;
    let mint_key = ctx.accounts.invoice.mint;
    let created_at_bytes = ctx.accounts.invoice.created_at.to_le_bytes();
    let bump = ctx.accounts.invoice.bump;
    let amount = ctx.accounts.invoice.amount;
    let decimals = ctx.accounts.mint.decimals;

    // Build signer seeds for vault authority (invoice PDA)
    let seeds: [&[u8]; 5] = [
        b"invoice".as_ref(),
        merchant_key.as_ref(),
        mint_key.as_ref(),
        created_at_bytes.as_ref(),
        &[bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[&seeds];

    // Transfer from vault to merchant
    execute_transfer(
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.merchant_token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.invoice.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
        decimals,
        Some(signer_seeds),
    )?;

    // Now we can safely take a mutable borrow and update state
    let invoice = &mut ctx.accounts.invoice;
    invoice.status = InvoiceStatus::Withdrawn;

    msg!(
        "Merchant {} withdrew {} from invoice",
        ctx.accounts.merchant.key(),
        amount
    );

    Ok(())
}
