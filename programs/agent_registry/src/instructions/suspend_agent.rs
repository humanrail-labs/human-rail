use anchor_lang::prelude::*;

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus},
};

pub fn handler(ctx: Context<SuspendAgent>) -> Result<()> {
    let clock = Clock::get()?;
    let agent = &mut ctx.accounts.agent;

    // Cannot suspend revoked agent
    require!(
        agent.status != AgentStatus::Revoked,
        AgentRegistryError::AgentRevoked
    );

    // Cannot suspend already suspended agent
    require!(
        agent.status != AgentStatus::Suspended,
        AgentRegistryError::AgentSuspended
    );

    agent.status = AgentStatus::Suspended;
    agent.last_status_change = clock.unix_timestamp;

    emit!(AgentSuspended {
        agent: agent.key(),
        owner_principal: agent.owner_principal,
        timestamp: clock.unix_timestamp,
    });

    msg!("Agent suspended: agent={}", agent.key());

    Ok(())
}

#[derive(Accounts)]
pub struct SuspendAgent<'info> {
    /// Principal (owner) of the agent - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent profile to suspend
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
pub struct AgentSuspended {
    pub agent: Pubkey,
    pub owner_principal: Pubkey,
    pub timestamp: i64,
}
