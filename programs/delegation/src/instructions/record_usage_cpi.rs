use anchor_lang::AccountDeserialize;
use anchor_lang::prelude::*;
use anchor_lang::pubkey;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, EmergencyFreezeRecord, UsageRecord},
};

/// Agent profile structure for CPI validation
/// Must match agent_registry::state::AgentProfile layout
#[derive(Clone)]
pub struct AgentProfileRef<'info> {
    pub info: AccountInfo<'info>,
}

impl<'info> AgentProfileRef<'info> {
    pub fn signing_key(&self) -> Result<Pubkey> {
        // AgentProfile layout: discriminator(8) + owner_principal(32) + signing_key(32)
        let data = self.info.try_borrow_data()?;
        if data.len() < 72 {
            return Err(DelegationError::InvalidAgentProfile.into());
        }
        Ok(Pubkey::try_from(&data[40..72]).unwrap())
    }
}

/// Record capability usage via CPI from authorized programs.
/// Unlike record_usage, this validates via agent_signer matching agent_profile.signing_key,
/// allowing CPI calls where the agent's signing key signed the outer transaction.
pub fn handler(ctx: Context<RecordUsageCpi>, amount_used: u64) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &mut ctx.accounts.capability;

    // Ensure capability is still active
    require!(
        capability.status == CapabilityStatus::Active,
        DelegationError::CapabilityNotActive
    );

    // Validate agent_signer matches agent_profile.signing_key
    let agent_data = ctx.accounts.agent_profile.try_borrow_data()?;
    require!(
        agent_data.len() >= 72,
        DelegationError::InvalidAgentProfile
    );
    let signing_key = Pubkey::try_from(&agent_data[40..72]).unwrap();
    drop(agent_data);
    require!(
        ctx.accounts.agent_signer.key() == signing_key,
        DelegationError::AgentSignerMismatch
    );

    // H-05 + F3 FIX: MANDATORY freeze check (non-bypassable)
    // Matches validate_capability.rs pattern: UncheckedAccount + manual deser
    let agent_frozen = {
        let freeze_info = &ctx.accounts.freeze_record;
        if !freeze_info.data_is_empty() {
            let data = freeze_info.try_borrow_data()?;
            match EmergencyFreezeRecord::try_deserialize(&mut &data[..]) {
                Ok(record) => record.is_active,
                Err(_) => false,
            }
        } else {
            false
        }
    };
    require!(
        !agent_frozen,
        DelegationError::AgentFrozen
    );

    // Reset daily if needed (MUST happen before limit checks)
    capability.maybe_reset_daily(clock.unix_timestamp);

    // Check per-transaction limit
    require!(
        amount_used <= capability.per_tx_limit,
        DelegationError::PerTxLimitExceeded
    );

    // Check daily limit (after daily reset)
    require!(
        capability.daily_spent.checked_add(amount_used).ok_or(DelegationError::LimitOverflow)? <= capability.daily_limit,
        DelegationError::DailyLimitExceeded
    );

    // Check total lifetime limit
    require!(
        capability.total_spent.checked_add(amount_used).ok_or(DelegationError::LimitOverflow)? <= capability.total_limit,
        DelegationError::TotalLimitExceeded
    );

    // Update tracking
    capability.daily_spent = capability.daily_spent.saturating_add(amount_used);
    capability.total_spent = capability.total_spent.saturating_add(amount_used);
    capability.use_count = capability.use_count.saturating_add(1);
    capability.last_used_at = clock.unix_timestamp;

    // Create usage record
    let usage = &mut ctx.accounts.usage_record;
    usage.capability = capability.key();
    usage.agent = capability.agent;
    usage.amount = amount_used;
    usage.action_type = 0;
    usage.destination = Pubkey::default();
    usage.used_at = clock.unix_timestamp;
    usage.tx_signature = [0u8; 32];
    usage.sequence = capability.use_count;
    usage.bump = ctx.bumps.usage_record;

    emit!(CapabilityUsedCpi {
        capability: capability.key(),
        agent: capability.agent,
        amount: amount_used,
        daily_spent: capability.daily_spent,
        total_spent: capability.total_spent,
        use_count: capability.use_count,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "CPI usage recorded: capability={}, amount={}, total={}",
        capability.key(),
        amount_used,
        capability.total_spent
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RecordUsageCpi<'info> {
    /// The capability being used
    #[account(
        mut,
        constraint = capability.status == CapabilityStatus::Active @ DelegationError::CapabilityNotActive,
        constraint = capability.agent == agent_profile.key() @ DelegationError::AgentMismatch
    )]
    pub capability: Account<'info, Capability>,

    /// Agent's signing key - must sign (propagates through CPI)
    pub agent_signer: Signer<'info>,

    /// Agent profile account - validates agent_signer is authorized
    /// CHECK: Validated manually - must be owned by agent_registry and signing_key must match
    #[account(
        owner = agent_registry_program.key() @ DelegationError::InvalidAgentProfile,
    )]
    pub agent_profile: UncheckedAccount<'info>,

    /// Freeze record PDA — MANDATORY. Same pattern as validate_capability.
    /// CHECK: PDA address verified by seeds constraint. Data parsed manually.
    #[account(
        seeds = [b"freeze", capability.principal.as_ref(), capability.agent.as_ref()],
        bump,
    )]
    pub freeze_record: UncheckedAccount<'info>,

    /// Usage record for audit trail
    #[account(
        init,
        payer = payer,
        space = UsageRecord::LEN,
        seeds = [
            b"usage",
            capability.key().as_ref(),
            &capability.use_count.saturating_add(1).to_le_bytes()
        ],
        bump
    )]
    pub usage_record: Account<'info, UsageRecord>,

    /// Payer for usage record rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Agent registry program for ownership validation
    /// CHECK: Validated by constraint
    #[account(
        constraint = agent_registry_program.key() == AGENT_REGISTRY_PROGRAM_ID @ DelegationError::InvalidProgram
    )]
    pub agent_registry_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Agent registry program ID
pub const AGENT_REGISTRY_PROGRAM_ID: Pubkey = pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");

#[event]
pub struct CapabilityUsedCpi {
    pub capability: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub daily_spent: u64,
    pub total_spent: u64,
    pub use_count: u64,
    pub timestamp: i64,
}
