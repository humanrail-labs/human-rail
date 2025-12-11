use anchor_lang::prelude::*;

/// Maximum length for metadata URI
pub const MAX_URI_LENGTH: usize = 200;

/// Task account for human work distribution
#[account]
pub struct Task {
    /// Creator who funded and manages the task
    pub creator: Pubkey,
    /// Token mint for rewards
    pub reward_mint: Pubkey,
    /// Reward per valid response in token base units
    pub reward_per_response: u64,
    /// Total budget allocated for this task
    pub total_budget: u64,
    /// Budget consumed by responses
    pub consumed_budget: u64,
    /// Minimum human score required (0-10000)
    pub human_requirements: u16,
    /// URI pointing to task metadata JSON
    pub metadata_uri: String,
    /// Whether the task is open for responses
    pub is_open: bool,
    /// Total number of responses submitted
    pub response_count: u32,
    /// Maximum responses allowed (0 for unlimited)
    pub max_responses: u32,
    /// Whether multiple responses per wallet are allowed
    pub allow_multiple_responses: bool,
    /// Timestamp when task was created
    pub created_at: i64,
    /// Timestamp when task was closed (0 if open)
    pub closed_at: i64,
    /// Escrow vault holding reward funds
    pub vault: Pubkey,
    /// Bump seed for task PDA
    pub bump: u8,
    /// Bump seed for vault PDA
    pub vault_bump: u8,
}

impl Task {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // reward_mint
        8 + // reward_per_response
        8 + // total_budget
        8 + // consumed_budget
        2 + // human_requirements
        4 + MAX_URI_LENGTH + // metadata_uri (string with length prefix)
        1 + // is_open
        4 + // response_count
        4 + // max_responses
        1 + // allow_multiple_responses
        8 + // created_at
        8 + // closed_at
        32 + // vault
        1 + // bump
        1; // vault_bump
}

/// Response record tracking a worker's submission
#[account]
pub struct TaskResponse {
    /// The task this response belongs to
    pub task: Pubkey,
    /// Worker who submitted the response
    pub worker: Pubkey,
    /// Choice made (task-specific encoding)
    pub choice: u8,
    /// Additional response data (hash or encoded value)
    pub response_data: [u8; 32],
    /// Human score of worker at time of submission
    pub human_score_at_submission: u16,
    /// Reward amount earned
    pub reward_amount: u64,
    /// Whether reward has been claimed
    pub is_claimed: bool,
    /// Timestamp of submission
    pub submitted_at: i64,
    /// Timestamp of claim (0 if unclaimed)
    pub claimed_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl TaskResponse {
    pub const LEN: usize = 8 + // discriminator
        32 + // task
        32 + // worker
        1 + // choice
        32 + // response_data
        2 + // human_score_at_submission
        8 + // reward_amount
        1 + // is_claimed
        8 + // submitted_at
        8 + // claimed_at
        1; // bump
}

/// Worker stats for tracking participation
#[account]
pub struct WorkerStats {
    /// Worker wallet
    pub worker: Pubkey,
    /// Total tasks participated in
    pub tasks_completed: u32,
    /// Total rewards earned (across all mints)
    pub total_rewards_earned: u64,
    /// Average response quality score (if implemented)
    pub quality_score: u16,
    /// Timestamp of first participation
    pub first_participation: i64,
    /// Timestamp of last activity
    pub last_activity: i64,
    /// Bump seed
    pub bump: u8,
}

impl WorkerStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // worker
        4 + // tasks_completed
        8 + // total_rewards_earned
        2 + // quality_score
        8 + // first_participation
        8 + // last_activity
        1; // bump
}
