use anchor_lang::prelude::*;

use crate::error::DataBlinkError;
use crate::state::{Task, TaskResponse, WorkerStats};
use human_registry::state_v2::HumanProfile;

// Program scope bit for data_blink
pub const PROGRAM_SCOPE_DATA_BLINK: u64 = 1 << 1;

// Program IDs for cross-program validation
use anchor_lang::pubkey;
pub const AGENT_REGISTRY_PROGRAM_ID: Pubkey =
    pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");
pub const DELEGATION_PROGRAM_ID: Pubkey = pubkey!("HRmukQDzeju62kb1frapSX37GvH1qwwrjC2XdezWfS5Z");

/// Agent autonomously submits a task response on behalf of principal.
/// Key features:
/// - Agent signs (true autonomy)
/// - Capability validated for data_blink scope
/// - Receipt emitted for accountability
pub fn handler(
    ctx: Context<AgentSubmitResponse>,
    choice: u8,
    response_data: [u8; 32],
    response_nonce: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let task = &mut ctx.accounts.task;
    let capability = &ctx.accounts.capability;
    let agent = &ctx.accounts.agent_profile;

    // Validate task is open
    require!(task.is_open, DataBlinkError::TaskClosed);

    // Validate max responses not reached
    if task.max_responses > 0 {
        require!(
            task.response_count < task.max_responses,
            DataBlinkError::MaxResponsesReached
        );
    }

    // === H-10 FIX: Check budget has remaining funds ===
    let remaining_budget = task.total_budget.saturating_sub(task.consumed_budget);
    require!(
        remaining_budget >= task.reward_per_response,
        DataBlinkError::BudgetExhausted
    );

    // === H-11 FIX: Enforce single response when allow_multiple_responses is false ===
    if !task.allow_multiple_responses {
        require!(
            response_nonce == 0,
            DataBlinkError::MultipleResponsesNotAllowed
        );
    }
    // === CAPABILITY VALIDATION (KYA Core) ===

    // Validate agent is active
    require!(
        agent.status == AgentStatus::Active,
        DataBlinkError::AgentNotActive
    );

    // Validate capability is active
    require!(
        capability.status == CapabilityStatus::Active,
        DataBlinkError::CapabilityNotActive
    );

    // Validate capability belongs to this agent
    require!(
        capability.agent == agent.key(),
        DataBlinkError::CapabilityAgentMismatch
    );

    // Validate principal owns this agent
    require!(
        agent.owner_principal == capability.principal,
        DataBlinkError::PrincipalMismatch
    );

    // Validate capability not expired
    require!(
        clock.unix_timestamp >= capability.valid_from,
        DataBlinkError::CapabilityNotYetValid
    );
    require!(
        clock.unix_timestamp < capability.expires_at,
        DataBlinkError::CapabilityExpired
    );

    // Validate program scope (data_blink allowed)
    require!(
        capability.allowed_programs & PROGRAM_SCOPE_DATA_BLINK != 0,
        DataBlinkError::ProgramNotAllowed
    );

    // === H-14 FIX: Validate principal's human score ===
    require!(
        ctx.accounts.principal_profile.human_score >= task.human_requirements,
        DataBlinkError::InsufficientHumanScore
    );

    // === EXECUTE RESPONSE ===

    // Create response record
    let response = &mut ctx.accounts.task_response;
    response.task = task.key();
    response.worker = ctx.accounts.principal.key(); // Credit goes to principal
    response.choice = choice;
    response.response_data = response_data;
    response.human_score_at_submission = ctx.accounts.principal_profile.human_score;
    response.reward_amount = task.reward_per_response;
    response.is_claimed = false;
    response.submitted_at = clock.unix_timestamp;
    response.claimed_at = 0;
    response.bump = ctx.bumps.task_response;

    // Update task
    task.response_count = task.response_count.saturating_add(1);
    task.consumed_budget = task
        .consumed_budget
        .saturating_add(task.reward_per_response);

    // Update worker stats
    let stats = &mut ctx.accounts.worker_stats;
    if stats.first_participation == 0 {
        stats.worker = ctx.accounts.principal.key();
        stats.first_participation = clock.unix_timestamp;
        stats.bump = ctx.bumps.worker_stats;
    }
    stats.tasks_completed = stats.tasks_completed.saturating_add(1);
    stats.total_rewards_earned = stats
        .total_rewards_earned
        .saturating_add(task.reward_per_response);
    stats.last_activity = clock.unix_timestamp;

    // === EMIT RECEIPT FOR ACCOUNTABILITY ===

    emit!(AgentTaskResponseSubmitted {
        task: task.key(),
        task_response: response.key(),
        principal: ctx.accounts.principal.key(),
        agent: agent.key(),
        capability: capability.key(),
        choice,
        reward_amount: task.reward_per_response,
        task_response_count: task.response_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent task response submitted: agent={}, task={}, choice={}",
        agent.key(),
        task.key(),
        choice
    );

    Ok(())
}

// =============================================================================
// H-03 WARNING: CPI Deserialization Mirrors
// These enums MUST match `humanrail-common` exactly. Do not modify without
// updating common crate + regenerating. See scripts/check-enum-drift.sh
// =============================================================================
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum AgentStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum CapabilityStatus {
    #[default]
    Active,
    Revoked,
    Expired,
    Frozen,
    Disputed,
}

#[account]
pub struct AgentProfile {
    pub owner_principal: Pubkey,
    pub signing_key: Pubkey,
    pub name: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub tee_measurement: [u8; 32],
    pub has_tee_measurement: bool,
    pub status: AgentStatus,
    pub created_at: i64,
    pub last_status_change: i64,
    pub last_metadata_update: i64,
    pub capability_count: u32,
    pub action_count: u64,
    pub nonce: u64,
    pub bump: u8,
}

#[account]
pub struct Capability {
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub allowed_programs: u64,
    pub allowed_assets: u64,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub total_limit: u64,
    pub max_slippage_bps: u16,
    pub max_fee: u64,
    pub valid_from: i64,
    pub expires_at: i64,
    pub cooldown_seconds: u32,
    pub risk_tier: u8,
    pub status: CapabilityStatus,
    pub issued_at: i64,
    pub last_used_at: i64,
    pub daily_spent: u64,
    pub current_day: u32,
    pub total_spent: u64,
    pub use_count: u64,
    pub enforce_allowlist: bool,
    pub allowlist_count: u8,
    pub destination_allowlist: [Pubkey; 10],
    pub dispute_reason: [u8; 32],
    pub nonce: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(choice: u8, response_data: [u8; 32], response_nonce: u64)]
pub struct AgentSubmitResponse<'info> {
    /// The agent executing the response - AGENT SIGNS (true autonomy)
    #[account(mut)]
    pub agent_signer: Signer<'info>,

    /// The agent profile
    #[account(
        owner = AGENT_REGISTRY_PROGRAM_ID @ DataBlinkError::InvalidProgram,
        constraint = agent_profile.signing_key == agent_signer.key() @ DataBlinkError::AgentSignerMismatch,
        constraint = agent_profile.status == AgentStatus::Active @ DataBlinkError::AgentNotActive
    )]
    pub agent_profile: Box<Account<'info, AgentProfile>>,

    /// The principal who delegated to this agent
    /// CHECK: Validated via capability.principal
    pub principal: UncheckedAccount<'info>,

    /// The capability credential
    #[account(
        owner = DELEGATION_PROGRAM_ID @ DataBlinkError::InvalidProgram,
        constraint = capability.agent == agent_profile.key() @ DataBlinkError::CapabilityAgentMismatch,
        constraint = capability.principal == principal.key() @ DataBlinkError::PrincipalMismatch
    )]
    pub capability: Box<Account<'info, Capability>>,

    /// The task being responded to
    #[account(
        mut,
        seeds = [b"task", task.creator.as_ref(), &task.nonce.to_le_bytes()],
        bump = task.bump
    )]
    pub task: Account<'info, Task>,

    /// Task response record
    #[account(
        init,
        payer = agent_signer,
        space = TaskResponse::LEN,
        seeds = [
            b"response",
            task.key().as_ref(),
            principal.key().as_ref(),
            &response_nonce.to_le_bytes()
        ],
        bump
    )]
    pub task_response: Account<'info, TaskResponse>,

    /// Principal human profile for human score verification
    #[account(
        seeds = [b"human_profile", principal.key().as_ref()],
        bump = principal_profile.bump,
        seeds::program = human_registry::ID
    )]
    pub principal_profile: Account<'info, HumanProfile>,

    /// Worker stats for the principal
    #[account(
        init_if_needed,
        payer = agent_signer,
        space = WorkerStats::LEN,
        seeds = [b"worker_stats", principal.key().as_ref()],
        bump
    )]
    pub worker_stats: Account<'info, WorkerStats>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentTaskResponseSubmitted {
    pub task: Pubkey,
    pub task_response: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub capability: Pubkey,
    pub choice: u8,
    pub reward_amount: u64,
    pub task_response_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
