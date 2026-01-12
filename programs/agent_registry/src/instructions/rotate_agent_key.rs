use anchor_lang::prelude::*;

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus, KeyRotation, KEY_ROTATION_GRACE_PERIOD},
};

pub fn handler(ctx: Context<RotateAgentKey>, new_signing_key: Pubkey) -> Result<()> {
    let clock = Clock::get()?;
    let agent = &mut ctx.accounts.agent;

    // Cannot rotate key for revoked agent
    require!(
        agent.status != AgentStatus::Revoked,
        AgentRegistryError::AgentRevoked
    );

    // Validate new key is different
    require!(
        new_signing_key != agent.signing_key,
        AgentRegistryError::InvalidSigningKey
    );

    let old_key = agent.signing_key;
    
    // Create key rotation record
    let rotation = &mut ctx.accounts.key_rotation;
    rotation.agent = agent.key();
    rotation.old_key = old_key;
    rotation.new_key = new_signing_key;
    rotation.rotated_at = clock.unix_timestamp;
    rotation.old_key_expires_at = clock.unix_timestamp + KEY_ROTATION_GRACE_PERIOD;
    rotation.sequence = agent.action_count as u32; // Use action count as sequence
    rotation.bump = ctx.bumps.key_rotation;

    // Update agent with new key
    agent.signing_key = new_signing_key;

    emit!(AgentKeyRotated {
        agent: agent.key(),
        owner_principal: agent.owner_principal,
        old_key,
        new_key: new_signing_key,
        grace_period_expires: rotation.old_key_expires_at,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent key rotated: agent={}, old_key={}, new_key={}",
        agent.key(),
        old_key,
        new_signing_key
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RotateAgentKey<'info> {
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

    /// Key rotation record
    #[account(
        init,
        payer = principal,
        space = KeyRotation::LEN,
        seeds = [
            b"key_rotation",
            agent.key().as_ref(),
            &agent.action_count.to_le_bytes()
        ],
        bump
    )]
    pub key_rotation: Account<'info, KeyRotation>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentKeyRotated {
    pub agent: Pubkey,
    pub owner_principal: Pubkey,
    pub old_key: Pubkey,
    pub new_key: Pubkey,
    pub grace_period_expires: i64,
    pub timestamp: i64,
}
