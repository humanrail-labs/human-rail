use anchor_lang::prelude::*;

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus},
};

pub fn handler(ctx: Context<RevokeAgent>) -> Result<()> {
    let clock = Clock::get()?;
    let agent = &mut ctx.accounts.agent;

    // Cannot revoke already revoked agent
    require!(
        agent.status != AgentStatus::Revoked,
        AgentRegistryError::AgentRevoked
    );

    // WARNING: This is permanent and cannot be undone
    agent.status = AgentStatus::Revoked;
    agent.last_status_change = clock.unix_timestamp;

    emit!(AgentRevoked {
        agent: agent.key(),
        owner_principal: agent.owner_principal,
        timestamp: clock.unix_timestamp,
    });

    msg!("Agent permanently revoked: agent={}", agent.key());

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeAgent<'info> {
    /// Principal (owner) of the agent - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent profile to revoke
    #[account(
        mut,
        seeds = [
            b"agent",
            principal.key().as_ref(),
            &agent.nonce.to_le_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner_principal == principal.key() @ AgentRegistryError::Unauthorized
    )]
    pub agent: Account<'info, AgentProfile>,
}

#[event]
pub struct AgentRevoked {
    pub agent: Pubkey,
    pub owner_principal: Pubkey,
    pub timestamp: i64,
}
