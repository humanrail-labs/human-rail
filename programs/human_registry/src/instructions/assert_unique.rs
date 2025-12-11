use anchor_lang::prelude::*;
use crate::{
    error::HumanRegistryError,
    state::HumanProfile,
};

#[derive(Accounts)]
pub struct AssertUnique<'info> {
    #[account(
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == wallet.key() @ HumanRegistryError::Unauthorized
    )]
    pub profile: Account<'info, HumanProfile>,

    /// The wallet being verified - must match profile
    /// CHECK: Verified via profile constraint
    pub wallet: UncheckedAccount<'info>,
}

/// Assert that a human profile meets minimum requirements.
/// Designed for CPI calls from other programs (human_pay, data_blink).
/// 
/// This instruction does not modify state - it only validates and returns
/// an error if requirements are not met.
pub fn handler(ctx: Context<AssertUnique>, min_score: u16) -> Result<()> {
    let profile = &ctx.accounts.profile;

    // Check minimum score requirement
    require!(
        profile.human_score >= min_score,
        HumanRegistryError::InsufficientHumanScore
    );

    // Check unique human status if minimum score suggests it's needed
    if min_score >= 5000 {
        require!(
            profile.is_unique,
            HumanRegistryError::NotUniqueHuman
        );
    }

    msg!(
        "Profile {} verified: score={}, unique={}",
        profile.wallet,
        profile.human_score,
        profile.is_unique
    );

    Ok(())
}
