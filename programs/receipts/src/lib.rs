use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM");

#[program]
pub mod receipts {
    use super::*;

    /// Emit a receipt for an agent action.
    /// Creates an immutable, timestamped record of what happened.
    pub fn emit_receipt(
        ctx: Context<EmitReceipt>,
        params: EmitReceiptParams,
    ) -> Result<()> {
        instructions::emit_receipt::handler(ctx, params)
    }

    /// Query receipt by ID. Returns receipt data for verification.
    /// Designed for CPI calls from verifier programs.
    pub fn verify_receipt(ctx: Context<VerifyReceipt>) -> Result<()> {
        instructions::verify_receipt::handler(ctx)
    }

    /// Batch emit multiple receipts in a single transaction.
    /// More efficient for high-throughput agent operations.
    pub fn batch_emit(
        ctx: Context<BatchEmit>,
        receipts: Vec<EmitReceiptParams>,
        nonce: u64,
    ) -> Result<()> {
        instructions::batch_emit::handler(ctx, receipts, nonce)
    }
}

/// Parameters for emitting a receipt
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EmitReceiptParams {
    /// Principal ID (human who authorized)
    pub principal_id: Pubkey,
    /// Agent ID (AI that executed)
    pub agent_id: Pubkey,
    /// Capability ID that was used
    pub capability_id: Pubkey,
    /// Hash of the action request
    pub action_hash: [u8; 32],
    /// Hash of the action result
    pub result_hash: [u8; 32],
    /// Action type (program-specific encoding)
    pub action_type: u8,
    /// Value transferred/affected
    pub value: u64,
    /// Destination of the action
    pub destination: Pubkey,
    /// Optional off-chain reference URI
    pub offchain_ref: [u8; 64],
    /// Unique nonce for PDA derivation
    pub nonce: u64,
}
