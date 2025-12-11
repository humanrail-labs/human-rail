use anchor_lang::prelude::*;

declare_id!("HReg1111111111111111111111111111111111111111");

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

#[program]
pub mod human_registry {
    use super::*;

    /// Initialize a new human profile for a wallet.
    /// Each wallet can only have one profile.
    pub fn init_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handler(ctx)
    }

    /// Register an attestation from a proof of personhood provider.
    /// This updates the human_score based on the attestation source.
    pub fn register_attestation(
        ctx: Context<RegisterAttestation>,
        attestation: AttestationInput,
    ) -> Result<()> {
        instructions::register_attestation::handler(ctx, attestation)
    }

    /// Recompute the human score from stored attestations.
    /// Useful after attestation weights are updated or attestations expire.
    pub fn recompute_score(ctx: Context<RecomputeScore>) -> Result<()> {
        instructions::recompute_score::handler(ctx)
    }

    /// Assert that a profile meets minimum requirements.
    /// Designed for CPI calls from other programs.
    pub fn assert_unique(ctx: Context<AssertUnique>, min_score: u16) -> Result<()> {
        instructions::assert_unique::handler(ctx, min_score)
    }
}

/// Input struct for attestation registration
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestationInput {
    /// Identifier of the attestation source (e.g., SAS issuer pubkey)
    pub source_id: Pubkey,
    /// Hash of the attestation payload for verification
    pub payload_hash: [u8; 32],
    /// Optional signature from the attestation source
    pub signature: Option<[u8; 64]>,
    /// Attestation type identifier
    pub attestation_type: AttestationType,
}

/// Types of attestations supported
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AttestationType {
    /// Solana Attestation Service
    SAS,
    /// World ID proof
    WorldId,
    /// Civic identity
    Civic,
    /// Gitcoin Passport
    GitcoinPassport,
    /// Other provider (with custom weight)
    Custom,
}
