use crate::{
    error::HumanPayError,
    state::{ConfidentialInvoice, InvoiceStatus},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelInvoice<'info> {
    #[account(
        mut,
        constraint = invoice.merchant == merchant.key() @ HumanPayError::UnauthorizedMerchant,
        constraint = invoice.status == InvoiceStatus::Open @ HumanPayError::InvalidInvoiceState
    )]
    pub invoice: Account<'info, ConfidentialInvoice>,

    pub merchant: Signer<'info>,
}

pub fn handler(ctx: Context<CancelInvoice>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;

    invoice.status = InvoiceStatus::Cancelled;

    msg!(
        "Invoice cancelled by merchant: {}",
        ctx.accounts.merchant.key()
    );

    Ok(())
}
