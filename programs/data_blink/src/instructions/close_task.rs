use crate::{error::DataBlinkError, state::Task, utils::remaining_budget};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

#[derive(Accounts)]
pub struct CloseTask<'info> {
    #[account(
        mut,
        constraint = task.creator == creator.key() @ DataBlinkError::UnauthorizedCreator,
        constraint = task.is_open @ DataBlinkError::TaskClosed
    )]
    pub task: Account<'info, Task>,

    #[account(
        mut,
        constraint = vault.key() == task.vault @ DataBlinkError::InvalidMint
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
}

pub fn handler(ctx: Context<CloseTask>) -> Result<()> {
    let task = &mut ctx.accounts.task;
    let clock = Clock::get()?;

    // Calculate remaining budget to return
    let remaining = remaining_budget(task);

    if remaining > 0 {
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

        // Return remaining budget to creator
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            mint: ctx.accounts.reward_mint.to_account_info(),
            authority: ctx.accounts.task.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer_checked(cpi_ctx, remaining, ctx.accounts.reward_mint.decimals)?;
    }

    // Close the task
    task.is_open = false;
    task.closed_at = clock.unix_timestamp;

    msg!(
        "Task closed: returned {} to creator, {} responses collected",
        remaining,
        task.response_count
    );

    Ok(())
}
