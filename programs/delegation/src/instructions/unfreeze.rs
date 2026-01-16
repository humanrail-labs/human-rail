use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, EmergencyFreezeRecord},
};

pub fn handler(ctx: Context<Unfreeze>) -> Result<()> {
    let clock = Clock::get()?;
    let freeze_record = &mut ctx.accounts.freeze_record;

    require!(
        freeze_record.is_active,
        DelegationError::AgentNotFrozen
    );

    freeze_record.is_active = false;
    freeze_record.unfrozen_at = clock.unix_timestamp;

    emit!(AgentUnfrozen {
        agent: freeze_record.agent,
        unfrozen_by: ctx.accounts.principal.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent unfrozen: agent={}, by={}",
        freeze_record.agent,
        ctx.accounts.principal.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Unfreeze<'info> {
    /// Principal who initiated the freeze - must sign and own the capability
    #[account(mut)]
    pub principal: Signer<'info>,

    /// Capability proving principal→agent relationship
    #[account(
        constraint = capability.principal == principal.key() @ DelegationError::Unauthorized,
        constraint = capability.agent == agent.key() @ DelegationError::AgentMismatch,
    )]
    pub capability: Account<'info, Capability>,

    /// The agent to unfreeze - must match capability.agent
    /// CHECK: Validated via capability.agent constraint above
    pub agent: UncheckedAccount<'info>,

    /// Freeze record to update - principal-specific
    /// Seeds: [b"freeze", principal, agent]
    #[account(
        mut,
        seeds = [b"freeze", principal.key().as_ref(), agent.key().as_ref()],
        bump,
        constraint = freeze_record.frozen_by == principal.key() @ DelegationError::Unauthorized,
        close = principal
    )]
    pub freeze_record: Account<'info, EmergencyFreezeRecord>,
}

#[event]
pub struct AgentUnfrozen {
    pub agent: Pubkey,
    pub unfrozen_by: Pubkey,
    pub timestamp: i64,
}
