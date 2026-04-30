use anchor_lang::prelude::*;

pub mod error;
pub mod ika_cpi;
pub mod instructions;
pub mod state;

// TODO: Replace with actual program ID after deployment on devnet.
// This is a placeholder pubkey for local development and skeleton review.
declare_id!("DwGuaRDhS915dvfSwzb5hMmA7nBq1AjWJYfAnP6xvXPy");

#[program]
pub mod humanrail_dwallet_guard {
    use super::*;

    /// Initialize a GuardedDwallet policy account.
    pub fn initialize_guarded_dwallet(
        ctx: Context<instructions::initialize::InitializeGuardedDwallet>,
        allowed_chain_id: u32,
        allowed_asset_hash: [u8; 32],
        allowed_recipient_hash: [u8; 32],
        per_tx_limit: u64,
        daily_limit: u64,
        total_limit: u64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            allowed_chain_id,
            allowed_asset_hash,
            allowed_recipient_hash,
            per_tx_limit,
            daily_limit,
            total_limit,
            expires_at,
        )
    }

    /// Freeze the guarded dWallet policy. Only the principal can freeze.
    pub fn freeze_guarded_dwallet(
        ctx: Context<instructions::freeze::FreezeGuardedDwallet>,
    ) -> Result<()> {
        instructions::freeze::handler(ctx)
    }

    /// Unfreeze the guarded dWallet policy. Only the principal can unfreeze.
    pub fn unfreeze_guarded_dwallet(
        ctx: Context<instructions::unfreeze::UnfreezeGuardedDwallet>,
    ) -> Result<()> {
        instructions::unfreeze::handler(ctx)
    }

    /// Approve a guarded message signing request.
    ///
    /// Checks policy limits, updates spend counters if approved,
    /// creates a GuardSigningRequest record, and CPI-calls Ika approve_message.
    ///
    /// If policy fails, the request is recorded as rejected and no Ika CPI is made.
    pub fn approve_guarded_message(
        ctx: Context<instructions::approve::ApproveGuardedMessage>,
        request_id: [u8; 32],
        message_digest: [u8; 32],
        message_metadata_digest: [u8; 32],
        destination_chain_id: u32,
        asset_hash: [u8; 32],
        recipient_hash: [u8; 32],
        amount: u64,
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        message_approval_bump: u8,
    ) -> Result<()> {
        instructions::approve::handler(
            ctx,
            request_id,
            message_digest,
            message_metadata_digest,
            destination_chain_id,
            asset_hash,
            recipient_hash,
            amount,
            user_pubkey,
            signature_scheme,
            message_approval_bump,
        )
    }
}
