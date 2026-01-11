use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus},
};

/// Flag a capability for dispute review.
/// Can be called by principal to mark suspicious activity.
pub fn handler(ctx: Context<FlagDispute>, reason: [u8; 32]) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &mut ctx.accounts.capability;

    // Cannot dispute already revoked capability
    require!(
        capability.status != CapabilityStatus::Revoked,
        DelegationError::CapabilityRevoked
    );

    // Cannot dispute already disputed capability
    require!(
        capability.status != CapabilityStatus::Disputed,
        DelegationError::AlreadyDisputed
    );

    capability.status = CapabilityStatus::Disputed;
    capability.dispute_reason = reason;

    emit!(CapabilityDisputed {
        capability: capability.key(),
        principal: capability.principal,
        agent: capability.agent,
        flagged_by: ctx.accounts.principal.key(),
        reason,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Capability flagged for dispute: capability={}, agent={}",
        capability.key(),
        capability.agent
    );

    Ok(())
}

#[derive(Accounts)]
pub struct FlagDispute<'info> {
    /// Principal flagging the dispute - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The capability to flag
    #[account(
        mut,
        constraint = capability.principal == principal.key() @ DelegationError::Unauthorized
    )]
    pub capability: Account<'info, Capability>,
}

#[event]
pub struct CapabilityDisputed {
    pub capability: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub flagged_by: Pubkey,
    pub reason: [u8; 32],
    pub timestamp: i64,
}
