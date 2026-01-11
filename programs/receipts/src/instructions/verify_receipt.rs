use anchor_lang::prelude::*;

use crate::state::ActionReceipt;

/// Verify a receipt exists and return its data.
/// Designed for CPI calls from verifier programs.
pub fn handler(ctx: Context<VerifyReceipt>) -> Result<()> {
    let receipt = &ctx.accounts.receipt;

    msg!(
        "Receipt verified: principal={}, agent={}, capability={}, value={}, timestamp={}",
        receipt.principal_id,
        receipt.agent_id,
        receipt.capability_id,
        receipt.value,
        receipt.timestamp
    );

    emit!(ReceiptVerified {
        receipt: receipt.key(),
        principal_id: receipt.principal_id,
        agent_id: receipt.agent_id,
        capability_id: receipt.capability_id,
        action_hash: receipt.action_hash,
        result_hash: receipt.result_hash,
        value: receipt.value,
        timestamp: receipt.timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyReceipt<'info> {
    /// The receipt to verify
    pub receipt: Account<'info, ActionReceipt>,
}

#[event]
pub struct ReceiptVerified {
    pub receipt: Pubkey,
    pub principal_id: Pubkey,
    pub agent_id: Pubkey,
    pub capability_id: Pubkey,
    pub action_hash: [u8; 32],
    pub result_hash: [u8; 32],
    pub value: u64,
    pub timestamp: i64,
}
