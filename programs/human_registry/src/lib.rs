use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

// KYA v2 modules
pub mod state_v2;
pub mod attestation_index;

use instructions::*;

declare_id!("Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR");

#[program]
pub mod human_registry {
    use super::*;

    pub fn init_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handle(ctx)
    }

    pub fn register_attestation(
        ctx: Context<RegisterAttestation>,
        source: Pubkey,
        payload_hash: [u8; 32],
        weight: u16,
    ) -> Result<()> {
        instructions::register_attestation::handle(ctx, source, payload_hash, weight)
    }

    // KYA v2 Instructions
    pub fn register_issuer(ctx: Context<RegisterIssuer>, params: RegisterIssuerParams) -> Result<()> {
        instructions::register_issuer::handler(ctx, params)
    }

    pub fn issue_attestation(ctx: Context<IssueAttestation>, params: IssueAttestationParams) -> Result<()> {
        instructions::issue_attestation::handler(ctx, params)
    }

    pub fn revoke_attestation_v2(ctx: Context<RevokeAttestation>) -> Result<()> {
        instructions::revoke_attestation_v2::handler(ctx)
    }

    pub fn verify_human(ctx: Context<VerifyHuman>, params: VerifyHumanParams) -> Result<()> {
        instructions::verify_human::handler(ctx, params)
    }
}
