use anchor_lang::prelude::*;

use crate::{
    error::AgentRegistryError,
    state::{AgentProfile, AgentStatus},
};

/// Verify an agent is active and valid.
/// Designed for CPI calls from other programs (delegation, human_pay, data_blink).
/// This instruction does not modify state - it only validates.
pub fn handler(ctx: Context<VerifyAgent>) -> Result<()> {
    let agent = &ctx.accounts.agent;

    // Check agent is active
    require!(
        agent.status == AgentStatus::Active,
        AgentRegistryError::AgentNotActive
    );

    msg!(
        "Agent verified: agent={}, owner={}, signing_key={}",
        agent.key(),
        agent.owner_principal,
        agent.signing_key
    );

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    /// The agent profile to verify
    pub agent: Account<'info, AgentProfile>,
}
