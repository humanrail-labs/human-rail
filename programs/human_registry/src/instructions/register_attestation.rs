use anchor_lang::prelude::*;

use crate::state::HumanProfile;

/// Minimal v0: just a stub implementation to confirm parsing and wiring.
pub fn handle(
    _ctx: Context<RegisterAttestation>,
    _source: Pubkey,
    _payload_hash: [u8; 32],
    _weight: u16,
) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAttestation<'info> {
    /// The wallet that owns the profile and signs the transaction.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The HumanProfile PDA tied to the authority wallet.
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,
}
