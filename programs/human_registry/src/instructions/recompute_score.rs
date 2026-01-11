use anchor_lang::prelude::*;
use crate::{
    error::HumanRegistryError,
    state::HumanProfile,
};

#[derive(Accounts)]
pub struct RecomputeScore<'info> {
    #[account(
        mut,
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == wallet.key() @ HumanRegistryError::Unauthorized
    )]
    pub profile: Account<'info, HumanProfile>,

    pub wallet: Signer<'info>,
}

pub fn handler(ctx: Context<RecomputeScore>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    let old_score = profile.human_score;
    let old_unique = profile.is_unique;

    // Use the built-in recompute method
    profile.recompute_score();

    msg!(
        "Recomputed score: {} -> {} (unique: {} -> {})",
        old_score,
        profile.human_score,
        old_unique,
        profile.is_unique
    );

    Ok(())
}
