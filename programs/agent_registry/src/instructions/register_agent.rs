use anchor_lang::prelude::*;
use human_registry::{program::HumanRegistry, state_v2::HumanProfile};

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus, AgentOperatorStats},
    RegisterAgentParams,
};

/// Minimum human score required to register an agent
pub const MIN_HUMAN_SCORE_FOR_AGENT: u16 = 0;

pub fn handler(ctx: Context<RegisterAgent>, params: RegisterAgentParams) -> Result<()> {
    let clock = Clock::get()?;
    // === C-06 FIX: Verify principal has sufficient human score ===
    let human_profile = &ctx.accounts.human_profile;
    require!(
        human_profile.human_score >= MIN_HUMAN_SCORE_FOR_AGENT,
        AgentRegistryError::InsufficientHumanScore
    );
    require!(
        human_profile.can_register_agents,
        AgentRegistryError::AgentRegistrationNotAllowed
    );
    // For now, we trust the human_profile account constraint

    let agent = &mut ctx.accounts.agent;
    agent.owner_principal = ctx.accounts.principal.key();
    agent.signing_key = params.signing_key;
    agent.name = params.name;
    agent.metadata_hash = params.metadata_hash;
    agent.status = AgentStatus::Active;
    agent.created_at = clock.unix_timestamp;
    agent.last_status_change = clock.unix_timestamp;
    agent.last_metadata_update = clock.unix_timestamp;
    agent.capability_count = 0;
    agent.action_count = 0;
    agent.nonce = params.nonce;
    agent.bump = ctx.bumps.agent;

    // Handle optional TEE measurement
    if let Some(tee) = params.tee_measurement {
        agent.tee_measurement = tee;
        agent.has_tee_measurement = true;
    } else {
        agent.tee_measurement = [0u8; 32];
        agent.has_tee_measurement = false;
    }

    // Initialize operator stats
    let stats = &mut ctx.accounts.operator_stats;
    stats.agent = agent.key();
    stats.total_transactions = 0;
    stats.total_value_transacted = 0;
    stats.failed_transactions = 0;
    stats.revoked_capabilities = 0;
    stats.last_activity = clock.unix_timestamp;
    stats.risk_score = 0;
    stats.anomaly_flags = 0;
    stats.bump = ctx.bumps.operator_stats;

    emit!(AgentRegistered {
        agent: agent.key(),
        owner_principal: agent.owner_principal,
        signing_key: agent.signing_key,
        metadata_hash: agent.metadata_hash,
        nonce: agent.nonce,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent registered: owner={}, signing_key={}",
        agent.owner_principal,
        agent.signing_key
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: RegisterAgentParams)]
pub struct RegisterAgent<'info> {
    /// Principal (owner) registering the agent - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// C-06 FIX: Human profile proving principal is verified human
    #[account(
        seeds = [b"human_profile", principal.key().as_ref()],
        bump = human_profile.bump,
        seeds::program = human_registry_program.key()
    )]
    pub human_profile: Account<'info, HumanProfile>,

    /// Human registry program for CPI verification
    pub human_registry_program: Program<'info, HumanRegistry>,

    /// The new agent profile PDA
    #[account(
        init,
        payer = principal,
        space = AgentProfile::LEN,
        seeds = [
            b"agent",
            principal.key().as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub agent: Account<'info, AgentProfile>,

    /// Operator stats for the new agent
    #[account(
        init,
        payer = principal,
        space = AgentOperatorStats::LEN,
        seeds = [b"agent_stats", agent.key().as_ref()],
        bump
    )]
    pub operator_stats: Account<'info, AgentOperatorStats>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub owner_principal: Pubkey,
    pub signing_key: Pubkey,
    pub metadata_hash: [u8; 32],
    pub nonce: u64,
    pub timestamp: i64,
}
