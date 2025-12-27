use anchor_lang::prelude::*;

declare_id!("6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe");

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

#[program]
pub mod human_pay {
    use super::*;

    /// Create a new confidential invoice.
    /// The merchant specifies amount, mint, and minimum human score requirement.
    pub fn create_confidential_invoice(
        ctx: Context<CreateConfidentialInvoice>,
        params: CreateInvoiceParams,
    ) -> Result<()> {
        instructions::create_invoice::handler(ctx, params)
    }

    /// Pay an existing confidential invoice.
    /// Verifies payer meets human requirements before processing transfer.
    pub fn pay_confidential_invoice(ctx: Context<PayConfidentialInvoice>) -> Result<()> {
        instructions::pay_invoice::handler(ctx)
    }

    /// Cancel an unpaid invoice (merchant only).
    pub fn cancel_invoice(ctx: Context<CancelInvoice>) -> Result<()> {
        instructions::cancel_invoice::handler(ctx)
    }

    /// Withdraw funds from a paid invoice (merchant only).
    pub fn withdraw_invoice(ctx: Context<WithdrawInvoice>) -> Result<()> {
        instructions::withdraw_invoice::handler(ctx)
    }
}

/// Parameters for creating a new invoice
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateInvoiceParams {
    /// Invoice amount in token base units
    pub amount: u64,
    /// Minimum human score required from payer (0-10000)
    pub human_requirements: u16,
    /// Optional expiration timestamp (0 for no expiry)
    pub expires_at: i64,
    /// Optional memo/reference for the invoice
    pub memo: [u8; 32],
    /// Unique nonce for PDA derivation (e.g., timestamp or counter)
    pub nonce: u64,
}
