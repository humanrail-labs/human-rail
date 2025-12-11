use anchor_lang::prelude::*;

/// Maximum number of attestations that can be stored per profile
pub const MAX_ATTESTATIONS: usize = 8;

/// Human profile account storing identity attestations and computed scores
#[account]
#[derive(Default)]
pub struct HumanProfile {
    /// The wallet that owns this profile
    pub wallet: Pubkey,
    /// Computed human score based on attestations (0-10000 basis points)
    pub human_score: u16,
    /// Whether this profile has achieved unique human status
    pub is_unique: bool,
    /// Number of registered attestations
    pub attestation_count: u8,
    /// Stored attestation references
    pub attestations: [AttestationRef; MAX_ATTESTATIONS],
    /// Timestamp of last score update
    pub last_updated: i64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl HumanProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // wallet
        2 + // human_score
        1 + // is_unique
        1 + // attestation_count
        (AttestationRef::LEN * MAX_ATTESTATIONS) + // attestations array
        8 + // last_updated
        1; // bump
}

/// Reference to an attestation stored on the profile
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct AttestationRef {
    /// Source identifier (issuer pubkey or provider id)
    pub source_id: Pubkey,
    /// Hash of the attestation payload
    pub payload_hash: [u8; 32],
    /// Type of attestation
    pub attestation_type: u8,
    /// Score weight contributed by this attestation
    pub score_weight: u16,
    /// Timestamp when attestation was registered
    pub registered_at: i64,
    /// Whether this attestation is still active
    pub is_active: bool,
}

impl AttestationRef {
    pub const LEN: usize = 32 + // source_id
        32 + // payload_hash
        1 + // attestation_type
        2 + // score_weight
        8 + // registered_at
        1; // is_active
}

/// Configuration account for the registry (admin-controlled)
#[account]
pub struct RegistryConfig {
    /// Admin authority
    pub authority: Pubkey,
    /// Minimum score required for unique status
    pub unique_threshold: u16,
    /// Whether new registrations are paused
    pub is_paused: bool,
    /// Bump seed for PDA
    pub bump: u8,
}

impl RegistryConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        2 + // unique_threshold
        1 + // is_paused
        1; // bump
}
