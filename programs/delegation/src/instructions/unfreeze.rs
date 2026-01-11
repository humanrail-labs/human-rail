use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::EmergencyFreezeRecord,
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
    /// Principal who initiated the freeze - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent to unfreeze
    /// CHECK: Validated via freeze_record constraint
    pub agent: UncheckedAccount<'info>,

    /// Freeze record to update
    #[account(
        mut,
        seeds = [b"freeze", agent.key().as_ref()],
        bump = freeze_record.bump,
        constraint = freeze_record.frozen_by == principal.key() @ DelegationError::Unauthorized
    )]
    pub freeze_record: Account<'info, EmergencyFreezeRecord>,
}

#[event]
pub struct AgentUnfrozen {
    pub agent: Pubkey,
    pub unfrozen_by: Pubkey,
    pub timestamp: i64,
}
