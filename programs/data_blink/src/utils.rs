#![allow(clippy::too_many_arguments, clippy::needless_lifetimes)]
use crate::state::Task;
use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, TransferChecked};

/// Execute a Token 2022 transfer for reward payouts.
pub fn execute_reward_transfer<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    let cpi_ctx = CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds);
    token_2022::transfer_checked(cpi_ctx, amount, decimals)?;

    Ok(())
}

/// Generate task PDA seeds
pub fn get_task_seeds<'a>(creator: &'a Pubkey, nonce: &'a [u8; 8]) -> [&'a [u8]; 3] {
    [b"task", creator.as_ref(), nonce]
}

/// Generate vault PDA seeds
pub fn get_vault_seeds<'a>(task: &'a Pubkey) -> [&'a [u8]; 2] {
    [b"task_vault", task.as_ref()]
}

/// Generate response PDA seeds
pub fn get_response_seeds<'a>(task: &'a Pubkey, worker: &'a Pubkey) -> [&'a [u8]; 3] {
    [b"response", task.as_ref(), worker.as_ref()]
}

/// Generate worker stats PDA seeds  
pub fn get_worker_stats_seeds<'a>(worker: &'a Pubkey) -> [&'a [u8]; 2] {
    [b"worker_stats", worker.as_ref()]
}

/// Check if task can accept more responses
pub fn can_accept_response(task: &Task) -> bool {
    if !task.is_open {
        return false;
    }

    // Check max responses limit
    if task.max_responses > 0 && task.response_count >= task.max_responses {
        return false;
    }

    // Check budget
    let remaining_budget = task.total_budget.saturating_sub(task.consumed_budget);
    if remaining_budget < task.reward_per_response {
        return false;
    }

    true
}

/// Calculate remaining budget for a task
pub fn remaining_budget(task: &Task) -> u64 {
    task.total_budget.saturating_sub(task.consumed_budget)
}

/// Calculate maximum remaining responses
pub fn max_remaining_responses(task: &Task) -> u64 {
    let remaining = remaining_budget(task);
    if task.reward_per_response == 0 {
        return 0;
    }
    remaining / task.reward_per_response
}
