use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, RevocationEntry},
};

pub fn handler(ctx: Context<RevokeCapability>) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &mut ctx.accounts.capability;

    // Cannot revoke already revoked capability
    require!(
        capability.status != CapabilityStatus::Revoked,
        DelegationError::CapabilityRevoked
    );

    capability.status = CapabilityStatus::Revoked;

    // Create revocation entry
    let revocation = &mut ctx.accounts.revocation_entry;
    revocation.capability = capability.key();
    revocation.revoked_by = ctx.accounts.principal.key();
    revocation.revoked_at = clock.unix_timestamp;
    revocation.reason_hash = [0u8; 32]; // Could be parameterized
    revocation.bump = ctx.bumps.revocation_entry;

    emit!(CapabilityRevoked {
        capability: capability.key(),
        principal: capability.principal,
        agent: capability.agent,
        revoked_by: ctx.accounts.principal.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Capability revoked: capability={}, agent={}",
        capability.key(),
        capability.agent
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeCapability<'info> {
    /// Principal who issued the capability - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The capability to revoke
    #[account(
        mut,
        seeds = [
            b"capability",
            principal.key().as_ref(),
            capability.agent.as_ref(),
            &capability.nonce.to_le_bytes()
        ],
        bump = capability.bump,
        constraint = capability.principal == principal.key() @ DelegationError::Unauthorized
    )]
    pub capability: Account<'info, Capability>,

    /// Revocation entry for audit trail
    #[account(
        init,
        payer = principal,
        space = RevocationEntry::LEN,
        seeds = [b"revocation", capability.key().as_ref()],
        bump
    )]
    pub revocation_entry: Account<'info, RevocationEntry>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CapabilityRevoked {
    pub capability: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}
