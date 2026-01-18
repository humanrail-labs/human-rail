use crate::{
    error::DataBlinkError,
    state::{Task, TaskResponse},
    utils::can_accept_response,
};
use anchor_lang::prelude::*;
use human_registry::{program::HumanRegistry, state::HumanProfileLegacy};

#[derive(Accounts)]
#[instruction(choice: u8, response_data: [u8; 32], response_nonce: u64)]
pub struct SubmitResponse<'info> {
    #[account(
        mut,
        constraint = task.is_open @ DataBlinkError::TaskNotOpen
    )]
    pub task: Account<'info, Task>,

    /// H-11 FIX: Include response_nonce in seeds to support multiple responses
    #[account(
        init,
        payer = worker,
        space = TaskResponse::LEN,
        seeds = [
            b"response",
            task.key().as_ref(),
            worker.key().as_ref(),
            &response_nonce.to_le_bytes()
        ],
        bump
    )]
    pub response: Account<'info, TaskResponse>,

    /// Worker's human profile for verification
    #[account(
        seeds = [b"human_profile", worker.key().as_ref()],
        bump = worker_profile.bump,
        seeds::program = human_registry_program.key()
    )]
    pub worker_profile: Account<'info, HumanProfileLegacy>,

    #[account(mut)]
    pub worker: Signer<'info>,

    pub human_registry_program: Program<'info, HumanRegistry>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitResponse>,
    choice: u8,
    response_data: [u8; 32],
    response_nonce: u64,
) -> Result<()> {
    let task = &mut ctx.accounts.task;
    let response = &mut ctx.accounts.response;
    let worker_profile = &ctx.accounts.worker_profile;
    let clock = Clock::get()?;

    // Verify task can accept responses
    require!(can_accept_response(task), DataBlinkError::BudgetExhausted);

    // H-11 FIX: Enforce single response when allow_multiple_responses is false
    if !task.allow_multiple_responses {
        require!(
            response_nonce == 0,
            DataBlinkError::MultipleResponsesNotAllowed
        );
    }

    // Verify worker meets human requirements
    require!(
        worker_profile.human_score >= task.human_requirements,
        DataBlinkError::InsufficientHumanScore
    );

    // Initialize response record
    response.task = task.key();
    response.worker = ctx.accounts.worker.key();
    response.choice = choice;
    response.response_data = response_data;
    response.human_score_at_submission = worker_profile.human_score;
    response.reward_amount = task.reward_per_response;
    response.is_claimed = false;
    response.submitted_at = clock.unix_timestamp;
    response.claimed_at = 0;
    response.bump = ctx.bumps.response;

    // Update task state
    task.response_count = task
        .response_count
        .checked_add(1)
        .ok_or(DataBlinkError::ArithmeticOverflow)?;

    task.consumed_budget = task
        .consumed_budget
        .checked_add(task.reward_per_response)
        .ok_or(DataBlinkError::ArithmeticOverflow)?;

    msg!(
        "Response submitted: worker={}, choice={}, nonce={}, reward={}",
        ctx.accounts.worker.key(),
        choice,
        response_nonce,
        task.reward_per_response
    );

    Ok(())
}
