use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, MAX_DESTINATION_ALLOWLIST},
    IssueCapabilityParams,
};

pub fn handler(ctx: Context<IssueCapability>, params: IssueCapabilityParams) -> Result<()> {
    let clock = Clock::get()?;

    // P1-3 FIX: Validate agent is a real AgentProfile (not arbitrary pubkey)
    let agent_info = &ctx.accounts.agent;
    require!(
        !agent_info.data_is_empty(),
        DelegationError::InvalidAgentProfile
    );
    require!(
        agent_info.owner == &agent_registry::ID,
        DelegationError::InvalidAgentProfile
    );

    // Validate parameters
    require!(
        params.expires_at > clock.unix_timestamp,
        DelegationError::InvalidExpiry
    );
    require!(
        params.valid_from < params.expires_at,
        DelegationError::InvalidExpiry
    );
    require!(
        params.per_tx_limit <= params.daily_limit,
        DelegationError::InvalidLimits
    );
    require!(
        params.daily_limit <= params.total_limit,
        DelegationError::InvalidLimits
    );
    require!(
        params.destination_allowlist.len() <= MAX_DESTINATION_ALLOWLIST,
        DelegationError::TooManyDestinations
    );

    let capability = &mut ctx.accounts.capability;
    capability.principal = ctx.accounts.principal.key();
    capability.agent = ctx.accounts.agent.key();
    capability.allowed_programs = params.allowed_programs;
    capability.allowed_assets = params.allowed_assets;
    capability.per_tx_limit = params.per_tx_limit;
    capability.daily_limit = params.daily_limit;
    capability.total_limit = params.total_limit;
    capability.max_slippage_bps = params.max_slippage_bps;
    capability.max_fee = params.max_fee;
    capability.valid_from = params.valid_from;
    capability.expires_at = params.expires_at;
    capability.cooldown_seconds = params.cooldown_seconds;
    capability.risk_tier = params.risk_tier;
    capability.status = CapabilityStatus::Active;
    capability.issued_at = clock.unix_timestamp;
    capability.last_used_at = 0;
    capability.daily_spent = 0;
    capability.current_day = Capability::get_day_number(clock.unix_timestamp);
    capability.total_spent = 0;
    capability.use_count = 0;
    capability.nonce = params.nonce;
    capability.bump = ctx.bumps.capability;
    capability.dispute_reason = [0u8; 32];

    // Copy destination allowlist
    capability.enforce_allowlist = !params.destination_allowlist.is_empty();
    capability.allowlist_count = params.destination_allowlist.len() as u8;
    capability.destination_allowlist = [Pubkey::default(); MAX_DESTINATION_ALLOWLIST];
    for (i, dest) in params.destination_allowlist.iter().enumerate() {
        capability.destination_allowlist[i] = *dest;
    }

    emit!(CapabilityIssued {
        capability: capability.key(),
        principal: capability.principal,
        agent: capability.agent,
        allowed_programs: capability.allowed_programs,
        per_tx_limit: capability.per_tx_limit,
        daily_limit: capability.daily_limit,
        total_limit: capability.total_limit,
        valid_from: capability.valid_from,
        expires_at: capability.expires_at,
        nonce: capability.nonce,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Capability issued: principal={}, agent={}, expires={}",
        capability.principal,
        capability.agent,
        capability.expires_at
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: IssueCapabilityParams)]
pub struct IssueCapability<'info> {
    /// Principal issuing the capability - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// Agent receiving the capability
    /// CHECK: Validated by principal's signature (they choose which agent to delegate to)
    pub agent: UncheckedAccount<'info>,

    /// The new capability credential PDA
    #[account(
        init,
        payer = principal,
        space = Capability::LEN,
        seeds = [
            b"capability",
            principal.key().as_ref(),
            agent.key().as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub capability: Account<'info, Capability>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CapabilityIssued {
    pub capability: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub allowed_programs: u64,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub total_limit: u64,
    pub valid_from: i64,
    pub expires_at: i64,
    pub nonce: u64,
    pub timestamp: i64,
}
