use anchor_lang::prelude::*;
use crate::error::GuardError;
use crate::InitializeGuardedDwalletDemo;

/// Devnet-only initializer that skips HumanRail owner checks.
/// This allows testing the GuardedDwallet lifecycle without requiring
/// a fully attested human profile with canRegisterAgents=true.
/// NOT for production use.
pub fn handler(
    ctx: Context<InitializeGuardedDwalletDemo>,
    allowed_chain_id: u32,
    allowed_asset_hash: [u8; 32],
    allowed_recipient_hash: [u8; 32],
    per_tx_limit: u64,
    daily_limit: u64,
    total_limit: u64,
    expires_at: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Same validation as the real initializer
    require!(expires_at > clock.unix_timestamp, GuardError::InvalidExpiry);
    require!(per_tx_limit > 0, GuardError::InvalidLimitConfig);
    require!(daily_limit > 0, GuardError::InvalidLimitConfig);
    require!(per_tx_limit <= daily_limit, GuardError::InvalidLimitConfig);
    if total_limit > 0 {
        require!(daily_limit <= total_limit, GuardError::InvalidLimitConfig);
    }

    let guarded = &mut ctx.accounts.guarded_dwallet;
    guarded.version = 1;
    guarded.principal = ctx.accounts.principal.key();
    guarded.human_profile = ctx.accounts.human_profile.key();
    guarded.agent = ctx.accounts.agent.key();
    guarded.humanrail_capability = ctx.accounts.humanrail_capability.key();
    guarded.dwallet = ctx.accounts.dwallet.key();
    guarded.allowed_chain_id = allowed_chain_id;
    guarded.allowed_asset_hash = allowed_asset_hash;
    guarded.allowed_recipient_hash = allowed_recipient_hash;
    guarded.per_tx_limit = per_tx_limit;
    guarded.daily_limit = daily_limit;
    guarded.total_limit = total_limit;
    guarded.daily_spent = 0;
    guarded.total_spent = 0;
    guarded.last_spend_day = 0;
    guarded.expires_at = expires_at;
    guarded.frozen = false;
    guarded.bump = ctx.bumps.guarded_dwallet;

    msg!(
        "[DEMO] Initialized GuardedDwallet for principal={} agent={} dwallet={}",
        guarded.principal,
        guarded.agent,
        guarded.dwallet
    );

    Ok(())
}
