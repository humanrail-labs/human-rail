use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, UsageRecord},
};

/// Record capability usage after successful action.
/// Updates spend tracking and cooldowns.
pub fn handler(ctx: Context<RecordUsage>, amount_used: u64) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &mut ctx.accounts.capability;

    // Ensure capability is still active
    require!(
        capability.status == CapabilityStatus::Active,
        DelegationError::CapabilityNotActive
    );

    // Reset daily if needed (MUST happen before limit checks)
    capability.maybe_reset_daily(clock.unix_timestamp);

    // === C-04 FIX: ENFORCE LIMITS BEFORE UPDATING ===

    // Check per-transaction limit
    require!(
        amount_used <= capability.per_tx_limit,
        DelegationError::PerTxLimitExceeded
    );

    // Check daily limit (after daily reset)
    require!(
        capability.daily_spent.saturating_add(amount_used) <= capability.daily_limit,
        DelegationError::DailyLimitExceeded
    );

    // Check total lifetime limit
    require!(
        capability.total_spent.saturating_add(amount_used) <= capability.total_limit,
        DelegationError::TotalLimitExceeded
    );

    // === END C-04 FIX ===

    // Update tracking
    capability.daily_spent = capability.daily_spent.saturating_add(amount_used);
    capability.total_spent = capability.total_spent.saturating_add(amount_used);
    capability.use_count = capability.use_count.saturating_add(1);
    capability.last_used_at = clock.unix_timestamp;

    // Create usage record
    let usage = &mut ctx.accounts.usage_record;
    usage.capability = capability.key();
    usage.agent = capability.agent;
    usage.amount = amount_used;
    usage.action_type = 0; // Could be parameterized
    usage.destination = Pubkey::default(); // Could be parameterized
    usage.used_at = clock.unix_timestamp;
    usage.tx_signature = [0u8; 32]; // Would need to be passed in
    usage.sequence = capability.use_count;
    usage.bump = ctx.bumps.usage_record;

    emit!(CapabilityUsed {
        capability: capability.key(),
        agent: capability.agent,
        amount: amount_used,
        daily_spent: capability.daily_spent,
        total_spent: capability.total_spent,
        use_count: capability.use_count,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Usage recorded: capability={}, amount={}, total={}",
        capability.key(),
        amount_used,
        capability.total_spent
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RecordUsage<'info> {
    /// The capability being used
    #[account(
        mut,
        constraint = capability.status == CapabilityStatus::Active @ DelegationError::CapabilityNotActive
    )]
    pub capability: Account<'info, Capability>,

    /// Agent using the capability - must sign
    #[account(
        mut,
        constraint = agent.key() == capability.agent @ DelegationError::AgentMismatch
    )]
    pub agent: Signer<'info>,

    /// Usage record for audit trail
    #[account(
        init,
        payer = agent,
        space = UsageRecord::LEN,
        seeds = [
            b"usage",
            capability.key().as_ref(),
            &capability.use_count.saturating_add(1).to_le_bytes()
        ],
        bump
    )]
    pub usage_record: Account<'info, UsageRecord>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CapabilityUsed {
    pub capability: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub daily_spent: u64,
    pub total_spent: u64,
    pub use_count: u64,
    pub timestamp: i64,
}
