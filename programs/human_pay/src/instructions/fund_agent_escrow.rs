use crate::error::HumanPayError;
use crate::state::AgentEscrow;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub fn handler(ctx: Context<FundAgentEscrow>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let escrow = &mut ctx.accounts.escrow;

    if escrow.created_at == 0 {
        escrow.principal = ctx.accounts.principal.key();
        escrow.agent = ctx.accounts.agent.key();
        escrow.mint = ctx.accounts.mint.key();
        escrow.token_account = ctx.accounts.escrow_token_account.key();
        escrow.total_deposited = 0;
        escrow.total_spent = 0;
        escrow.created_at = clock.unix_timestamp;
        escrow.last_used_at = 0;
        escrow.bump = ctx.bumps.escrow;
        escrow.token_account_bump = ctx.bumps.escrow_token_account;
    }

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.principal_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.principal.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    escrow.total_deposited = escrow.total_deposited.saturating_add(amount);

    emit!(EscrowFunded {
        escrow: escrow.key(),
        principal: escrow.principal,
        agent: escrow.agent,
        mint: escrow.mint,
        amount,
        total_deposited: escrow.total_deposited,
        available: escrow.available(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Escrow funded: principal={}, agent={}, amount={}",
        escrow.principal,
        escrow.agent,
        amount
    );
    Ok(())
}

#[derive(Accounts)]
pub struct FundAgentEscrow<'info> {
    #[account(mut)]
    pub principal: Signer<'info>,

    /// CHECK: Validated by principal's choice
    pub agent: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(mut, constraint = principal_token_account.owner == principal.key() @ HumanPayError::InvalidTokenAccount, constraint = principal_token_account.mint == mint.key() @ HumanPayError::InvalidMint)]
    pub principal_token_account: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = principal, space = AgentEscrow::LEN, seeds = [b"agent_escrow", principal.key().as_ref(), agent.key().as_ref(), mint.key().as_ref()], bump)]
    pub escrow: Account<'info, AgentEscrow>,

    #[account(init_if_needed, payer = principal, token::mint = mint, token::authority = escrow, seeds = [b"escrow_vault", escrow.key().as_ref()], bump)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EscrowFunded {
    pub escrow: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
    pub available: u64,
    pub timestamp: i64,
}
