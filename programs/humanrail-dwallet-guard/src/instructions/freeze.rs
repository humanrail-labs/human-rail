use anchor_lang::prelude::*;
use crate::state::GuardedDwallet;
use crate::error::GuardError;

#[derive(Accounts)]
pub struct FreezeGuardedDwallet<'info> {
    pub principal: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"guarded_dwallet",
            guarded_dwallet.principal.as_ref(),
            guarded_dwallet.agent.as_ref(),
            guarded_dwallet.dwallet.as_ref(),
        ],
        bump = guarded_dwallet.bump,
        constraint = guarded_dwallet.principal == principal.key() @ GuardError::UnauthorizedPrincipal,
    )]
    pub guarded_dwallet: Account<'info, GuardedDwallet>,
}

pub fn handler(ctx: Context<FreezeGuardedDwallet>) -> Result<()> {
    let guarded = &mut ctx.accounts.guarded_dwallet;
    guarded.frozen = true;
    msg!("Frozen GuardedDwallet {}", guarded.key());
    Ok(())
}
