use anchor_lang::prelude::*;
use crate::FreezeGuardedDwallet;

pub fn handler(ctx: Context<FreezeGuardedDwallet>) -> Result<()> {
    let guarded = &mut ctx.accounts.guarded_dwallet;
    guarded.frozen = true;
    msg!("Frozen GuardedDwallet {}", guarded.key());
    Ok(())
}
