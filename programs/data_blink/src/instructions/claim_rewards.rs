use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use crate::{
    error::DataBlinkError,
    state::{Task, TaskResponse},
    utils::execute_reward_transfer,
};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        constraint = task.key() == response.task @ DataBlinkError::InvalidMint
    )]
    pub task: Account<'info, Task>,

    #[account(
        mut,
        constraint = response.worker == worker.key() @ DataBlinkError::UnauthorizedWorker,
        constraint = !response.is_claimed @ DataBlinkError::RewardAlreadyClaimed
    )]
    pub response: Account<'info, TaskResponse>,

    #[account(
        mut,
        constraint = vault.key() == task.vault @ DataBlinkError::InvalidMint
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = worker_token_account.mint == reward_mint.key() @ DataBlinkError::InvalidMint
    )]
    pub worker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub worker: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let task = &ctx.accounts.task;
    let response = &mut ctx.accounts.response;
    let clock = Clock::get()?;

    // Verify reward is available
    require!(response.reward_amount > 0, DataBlinkError::NoRewardAvailable);

    // Build signer seeds for vault authority (task PDA)
    let creator_key = task.creator;
    let created_at_bytes = task.created_at.to_le_bytes();
    
    let seeds = &[
        b"task".as_ref(),
        creator_key.as_ref(),
        created_at_bytes.as_ref(),
        &[task.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer reward to worker
    execute_reward_transfer(
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.worker_token_account.to_account_info(),
        ctx.accounts.reward_mint.to_account_info(),
        ctx.accounts.task.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        response.reward_amount,
        ctx.accounts.reward_mint.decimals,
        signer_seeds,
    )?;

    // Mark response as claimed
    response.is_claimed = true;
    response.claimed_at = clock.unix_timestamp;

    msg!(
        "Reward claimed: worker={}, amount={}",
        ctx.accounts.worker.key(),
        response.reward_amount
    );

    Ok(())
}
