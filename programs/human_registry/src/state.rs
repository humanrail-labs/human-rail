use anchor_lang::prelude::*;

/// Maximum number of attestations we store per profile.
pub const MAX_ATTESTATIONS: usize = 8;

/// Simple threshold for deciding whether a profile is "unique".
pub const UNIQUE_THRESHOLD: u16 = 100;

/// HumanProfile stores per-wallet identity score and attestations.
#[account]
pub struct HumanProfile {
    /// The wallet this profile belongs to.
    pub wallet: Pubkey,
    /// Aggregated identity score from all attestations.
    pub human_score: u16,
    /// Flag indicating whether this profile is considered "unique".
    pub is_unique: bool,
    /// Bounded list of attestations attached to this profile.
    pub attestations: Vec<AttestationRef>,
    /// PDA bump for the profile account.
    pub bump: u8,
}

impl HumanProfile {
    /// Account size without the 8-byte Anchor discriminator.
    pub const LEN: usize = 32  // wallet
        + 2 // human_score
        + 1 // is_unique
        + 4 // Vec length prefix
        + (MAX_ATTESTATIONS * AttestationRef::LEN)
        + 1; // bump

    /// Recompute human_score and is_unique from the current attestations.
    pub fn recompute_score(&mut self) {
        self.human_score = self
            .attestations
            .iter()
            .fold(0u16, |acc, att| acc.saturating_add(att.weight));

        self.is_unique = self.human_score >= UNIQUE_THRESHOLD;
    }
}

/// Lightweight reference to an external attestation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct AttestationRef {
    /// Identity / KYC / PoP provider or other attestation source.
    pub source: Pubkey,
    /// Hash of the attestation payload (off-chain details).
    pub payload_hash: [u8; 32],
    /// Weight contributed by this attestation to the human_score.
    pub weight: u16,
}

impl AttestationRef {
    pub const LEN: usize = 32  // source
        + 32                   // payload_hash
        + 2; // weight
}
