use crate::{
    error::DataBlinkError,
    state::{Task, MAX_URI_LENGTH},
    CreateTaskParams,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

#[derive(Accounts)]
#[instruction(params: CreateTaskParams)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = creator,
        space = Task::LEN,
        seeds = [
            b"task",
            creator.key().as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub task: Account<'info, Task>,

    #[account(
        init,
        payer = creator,
        token::mint = reward_mint,
        token::authority = task,
        seeds = [b"task_vault", task.key().as_ref()],
        bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = creator_token_account.mint == reward_mint.key() @ DataBlinkError::InvalidMint
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTask>, params: CreateTaskParams) -> Result<()> {
    // Validate params
    require!(
        params.metadata_uri.len() <= MAX_URI_LENGTH,
        DataBlinkError::MetadataUriTooLong
    );
    require!(
        params.reward_per_response > 0,
        DataBlinkError::InvalidTaskParams
    );
    require!(
        params.total_budget >= params.reward_per_response,
        DataBlinkError::InvalidTaskParams
    );

    let task = &mut ctx.accounts.task;
    let clock = Clock::get()?;

    // Fund the vault with total budget
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.creator_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        mint: ctx.accounts.reward_mint.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(
        cpi_ctx,
        params.total_budget,
        ctx.accounts.reward_mint.decimals,
    )?;

    // Initialize task
    task.creator = ctx.accounts.creator.key();
    task.reward_mint = ctx.accounts.reward_mint.key();
    task.reward_per_response = params.reward_per_response;
    task.total_budget = params.total_budget;
    task.consumed_budget = 0;
    task.human_requirements = params.human_requirements;
    task.metadata_uri = params.metadata_uri;
    task.is_open = true;
    task.response_count = 0;
    task.max_responses = params.max_responses;
    task.allow_multiple_responses = params.allow_multiple_responses;
    task.created_at = clock.unix_timestamp;
    task.closed_at = 0;
    task.vault = ctx.accounts.vault.key();
    task.bump = ctx.bumps.task;
    task.vault_bump = ctx.bumps.vault;
    task.nonce = params.nonce;

    msg!(
        "Created task: budget={}, reward_per_response={}, nonce={}, human_req={}",
        params.total_budget,
        params.reward_per_response,
        params.nonce,
        params.human_requirements
    );

    Ok(())
}
