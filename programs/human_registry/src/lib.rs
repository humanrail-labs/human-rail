use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

// TODO: replace with real program id after first deployment.
declare_id!("HumaNRegistry1111111111111111111111111111111");

#[program]
pub mod human_registry {
    use super::*;

    /// Initialize a new HumanProfile for the signing authority.
    pub fn init_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handle(ctx)
    }

    /// Register or update an attestation and recompute the human score.
    pub fn register_attestation(
        ctx: Context<RegisterAttestation>,
        source: Pubkey,
        payload_hash: [u8; 32],
        weight: u16,
    ) -> Result<()> {
        instructions::register_attestation::handle(ctx, source, payload_hash, weight)
    }
}
