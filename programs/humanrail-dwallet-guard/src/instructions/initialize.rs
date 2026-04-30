use anchor_lang::prelude::*;
use crate::state::GuardedDwallet;
use crate::error::GuardError;

pub const HUMANRAIL_HUMAN_REGISTRY_PROGRAM_ID: Pubkey = pubkey!("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo");
pub const HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID: Pubkey = pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");
pub const HUMANRAIL_DELEGATION_PROGRAM_ID: Pubkey = pubkey!("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT");

#[derive(Accounts)]
#[instruction(
    allowed_chain_id: u32,
    allowed_asset_hash: [u8; 32],
    allowed_recipient_hash: [u8; 32],
    per_tx_limit: u64,
    daily_limit: u64,
    total_limit: u64,
    expires_at: i64,
)]
pub struct InitializeGuardedDwallet<'info> {
    #[account(mut)]
    pub principal: Signer<'info>,

    #[account(
        init,
        payer = principal,
        space = 8 + GuardedDwallet::LEN,
        seeds = [
            b"guarded_dwallet",
            principal.key().as_ref(),
            agent.key.as_ref(),
            dwallet.key.as_ref(),
        ],
        bump,
    )]
    pub guarded_dwallet: Account<'info, GuardedDwallet>,

    /// CHECK: Human Registry account; owner verified below
    #[account(owner = HUMANRAIL_HUMAN_REGISTRY_PROGRAM_ID @ GuardError::InvalidHumanProfile)]
    pub human_profile: AccountInfo<'info>,

    /// CHECK: Agent Registry account; owner verified below
    #[account(owner = HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID @ GuardError::InvalidAgent)]
    pub agent: AccountInfo<'info>,

    /// CHECK: Delegation capability account; owner verified below
    #[account(owner = HUMANRAIL_DELEGATION_PROGRAM_ID @ GuardError::InvalidCapability)]
    pub humanrail_capability: AccountInfo<'info>,

    /// CHECK: Ika dWallet pubkey — stored as reference only
    pub dwallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeGuardedDwallet>,
    allowed_chain_id: u32,
    allowed_asset_hash: [u8; 32],
    allowed_recipient_hash: [u8; 32],
    per_tx_limit: u64,
    daily_limit: u64,
    total_limit: u64,
    expires_at: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    // 1. Expiry must be in the future
    require!(expires_at > clock.unix_timestamp, GuardError::InvalidExpiry);

    // 2. Limits must be sane
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
        "Initialized GuardedDwallet for principal={} agent={} dwallet={}",
        guarded.principal,
        guarded.agent,
        guarded.dwallet
    );

    Ok(())
}
