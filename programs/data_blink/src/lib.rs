use anchor_lang::prelude::*;

declare_id!("2SQKYWBmqn1XqvkJynbRnCNGhhEyaQy5EF9aJcLVzjQ5");

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

#[program]
pub mod data_blink {
    use super::*;

    /// Create a new task for human workers.
    /// Creator funds an escrow vault with the total reward budget.
    pub fn create_task(ctx: Context<CreateTask>, params: CreateTaskParams) -> Result<()> {
        instructions::create_task::handler(ctx, params)
    }

    /// Close an existing task (creator only).
    /// Returns remaining budget to creator.
    pub fn close_task(ctx: Context<CloseTask>) -> Result<()> {
        instructions::close_task::handler(ctx)
    }

    /// Submit a response to a task.
    /// Validates human requirements and prevents double responses.
    pub fn submit_response(
        ctx: Context<SubmitResponse>,
        choice: u8,
        response_data: [u8; 32],
    ) -> Result<()> {
        instructions::submit_response::handler(ctx, choice, response_data)
    }

    /// Claim accumulated rewards for completed task responses.
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }
}

/// Parameters for creating a new task
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateTaskParams {
    /// Reward per valid response in token base units
    pub reward_per_response: u64,
    /// Total budget for this task
    pub total_budget: u64,
    /// Minimum human score required (0-10000)
    pub human_requirements: u16,
    /// URI pointing to task metadata JSON
    pub metadata_uri: String,
    /// Maximum responses allowed (0 for unlimited)
    pub max_responses: u32,
    /// Whether to allow multiple responses per wallet
    pub allow_multiple_responses: bool,
    /// Unique nonce for PDA derivation (e.g., timestamp or counter)
    pub nonce: u64,
}
