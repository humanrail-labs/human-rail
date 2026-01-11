use anchor_lang::prelude::*;

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus},
};

pub fn handler(ctx: Context<UpdateAgentMetadata>, new_metadata_hash: [u8; 32]) -> Result<()> {
    let clock = Clock::get()?;
    let agent = &mut ctx.accounts.agent;

    // Cannot update revoked agent
    require!(
        agent.status != AgentStatus::Revoked,
        AgentRegistryError::AgentRevoked
    );

    let old_hash = agent.metadata_hash;
    agent.metadata_hash = new_metadata_hash;
    agent.last_metadata_update = clock.unix_timestamp;

    emit!(AgentMetadataUpdated {
        agent: agent.key(),
        owner_principal: agent.owner_principal,
        old_metadata_hash: old_hash,
        new_metadata_hash,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent metadata updated: agent={}",
        agent.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateAgentMetadata<'info> {
    /// Principal (owner) of the agent - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent profile to update
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
pub struct AgentMetadataUpdated {
    pub agent: Pubkey,
    pub owner_principal: Pubkey,
    pub old_metadata_hash: [u8; 32],
    pub new_metadata_hash: [u8; 32],
    pub timestamp: i64,
}
