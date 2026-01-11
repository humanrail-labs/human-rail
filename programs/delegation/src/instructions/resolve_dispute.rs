use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus},
    DisputeResolution,
};

/// Resolve a dispute on a capability.
/// Principal decides outcome: cleared, revoked, or modified.
pub fn handler(ctx: Context<ResolveDispute>, resolution: DisputeResolution) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &mut ctx.accounts.capability;

    // Can only resolve disputed capabilities
    require!(
        capability.status == CapabilityStatus::Disputed,
        DelegationError::NotDisputed
    );

    match resolution {
        DisputeResolution::Cleared => {
            capability.status = CapabilityStatus::Active;
            capability.dispute_reason = [0u8; 32];
        }
        DisputeResolution::Revoked => {
            capability.status = CapabilityStatus::Revoked;
        }
        DisputeResolution::Modified => {
            // For now, just clear the dispute - modifications would need additional params
            capability.status = CapabilityStatus::Active;
            capability.dispute_reason = [0u8; 32];
        }
    }

    emit!(DisputeResolved {
        capability: capability.key(),
        principal: capability.principal,
        agent: capability.agent,
        resolution,
        new_status: capability.status,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Dispute resolved: capability={}, resolution={:?}",
        capability.key(),
        resolution
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    /// Principal resolving the dispute - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The capability under dispute
    #[account(
        mut,
        constraint = capability.principal == principal.key() @ DelegationError::Unauthorized
    )]
    pub capability: Account<'info, Capability>,
}

#[event]
pub struct DisputeResolved {
    pub capability: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub resolution: DisputeResolution,
    pub new_status: CapabilityStatus,
    pub timestamp: i64,
}
