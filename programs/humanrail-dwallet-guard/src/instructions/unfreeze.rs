use anchor_lang::prelude::*;
use crate::UnfreezeGuardedDwallet;

pub fn handler(ctx: Context<UnfreezeGuardedDwallet>) -> Result<()> {
    let guarded = &mut ctx.accounts.guarded_dwallet;
    guarded.frozen = false;
    msg!("Unfrozen GuardedDwallet {}", guarded.key());
    Ok(())
}
