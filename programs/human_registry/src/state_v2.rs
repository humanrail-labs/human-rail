use anchor_lang::prelude::*;

// =============================================================================
// CONSTANTS
// =============================================================================

/// Maximum number of attestations per profile
pub const MAX_ATTESTATIONS: usize = 8;

/// Maximum number of issuers in the registry
pub const MAX_ISSUERS: usize = 20;

/// Threshold for "unique human" status (basis points)
pub const UNIQUE_THRESHOLD: u16 = 100;

/// Default attestation validity period (90 days in seconds)
pub const DEFAULT_ATTESTATION_VALIDITY: i64 = 90 * 24 * 60 * 60;

// =============================================================================
// ISSUER REGISTRY (Trust Anchors)
// =============================================================================

/// Issuer status in the registry
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum IssuerStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

/// Issuer type classification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum IssuerType {
    /// KYC provider (Civic, Persona, etc.)
    #[default]
    KycProvider,
    /// Proof of Personhood (WorldID, BrightID, etc.)
    ProofOfPersonhood,
    /// Social verification (Twitter, GitHub, etc.)
    SocialVerification,
    /// Device-based attestation
    DeviceBased,
    /// Event-based verification (physical attendance, etc.)
    EventBased,
    /// Custom/other
    Custom,
}

/// Issuer account - represents a trusted attestation provider
#[account]
pub struct Issuer {
    /// Issuer's authority pubkey (signs attestations)
    pub authority: Pubkey,
    /// Human-readable name (32 bytes, null-padded)
    pub name: [u8; 32],
    /// Issuer type classification
    pub issuer_type: IssuerType,
    /// Current status
    pub status: IssuerStatus,
    /// Maximum weight this issuer can assign per attestation
    pub max_weight: u16,
    /// Whether attestations from this issuer count toward uniqueness
    pub contributes_to_uniqueness: bool,
    /// Default validity period for attestations (seconds)
    pub default_validity: i64,
    /// Total attestations issued
    pub attestations_issued: u64,
    /// Total attestations revoked
    pub attestations_revoked: u64,
    /// When issuer was registered
    pub registered_at: i64,
    /// Who registered this issuer (admin authority)
    pub registered_by: Pubkey,
    /// Optional metadata URI (IPFS, HTTPS)
    pub metadata_uri: [u8; 64],
    /// Whether metadata URI is set
    pub has_metadata_uri: bool,
    /// PDA bump
    pub bump: u8,
}

impl Issuer {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // name
        1 +  // issuer_type
        1 +  // status
        2 +  // max_weight
        1 +  // contributes_to_uniqueness
        8 +  // default_validity
        8 +  // attestations_issued
        8 +  // attestations_revoked
        8 +  // registered_at
        32 + // registered_by
        64 + // metadata_uri
        1 +  // has_metadata_uri
        1;   // bump

    pub fn is_active(&self) -> bool {
        self.status == IssuerStatus::Active
    }
}

/// Global issuer registry configuration
#[account]
pub struct IssuerRegistry {
    /// Admin authority who can add/remove issuers
    pub admin: Pubkey,
    /// Total number of registered issuers
    pub issuer_count: u32,
    /// Whether new issuer registration is paused
    pub registration_paused: bool,
    /// Minimum attestation weight
    pub min_attestation_weight: u16,
    /// Maximum attestation weight
    pub max_attestation_weight: u16,
    /// PDA bump
    pub bump: u8,
}

impl IssuerRegistry {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        4 +  // issuer_count
        1 +  // registration_paused
        2 +  // min_attestation_weight
        2 +  // max_attestation_weight
        1;   // bump
}

// =============================================================================
// ATTESTATION (Signed, Verified, Expirable)
// =============================================================================

/// Attestation status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum AttestationStatus {
    #[default]
    Active,
    Expired,
    Revoked,
}

/// Signed attestation account - proves a claim about a human
#[account]
pub struct SignedAttestation {
    /// The HumanProfile this attestation belongs to
    pub profile: Pubkey,
    /// Issuer who created this attestation
    pub issuer: Pubkey,
    /// Issuer's authority that signed
    pub issuer_authority: Pubkey,
    /// Type of attestation (matches issuer type)
    pub attestation_type: IssuerType,
    /// Hash of the attestation payload (off-chain details)
    pub payload_hash: [u8; 32],
    /// Weight contributed to human_score
    pub weight: u16,
    /// Current status
    pub status: AttestationStatus,
    /// When attestation was issued
    pub issued_at: i64,
    /// When attestation expires (0 = never)
    pub expires_at: i64,
    /// When attestation was revoked (0 = not revoked)
    pub revoked_at: i64,
    /// Ed25519 signature over canonical attestation data
    pub signature: [u8; 64],
    /// Nonce to prevent replay
    pub nonce: u64,
    /// Optional external reference ID
    pub external_id: [u8; 32],
    /// Whether external_id is set
    pub has_external_id: bool,
    /// PDA bump
    pub bump: u8,
}

impl SignedAttestation {
    pub const LEN: usize = 8 + // discriminator
        32 + // profile
        32 + // issuer
        32 + // issuer_authority
        1 +  // attestation_type
        32 + // payload_hash
        2 +  // weight
        1 +  // status
        8 +  // issued_at
        8 +  // expires_at
        8 +  // revoked_at
        64 + // signature
        8 +  // nonce
        32 + // external_id
        1 +  // has_external_id
        1;   // bump

    /// Check if attestation is currently valid
    pub fn is_valid(&self, current_time: i64) -> bool {
        self.status == AttestationStatus::Active
            && (self.expires_at == 0 || current_time < self.expires_at)
    }

    /// Get effective weight (0 if invalid)
    pub fn effective_weight(&self, current_time: i64) -> u16 {
        if self.is_valid(current_time) {
            self.weight
        } else {
            0
        }
    }

    /// Create canonical bytes for signature verification
    pub fn to_signing_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(256);
        bytes.extend_from_slice(self.profile.as_ref());
        bytes.extend_from_slice(self.issuer.as_ref());
        bytes.extend_from_slice(&self.payload_hash);
        bytes.extend_from_slice(&self.weight.to_le_bytes());
        bytes.extend_from_slice(&self.issued_at.to_le_bytes());
        bytes.extend_from_slice(&self.expires_at.to_le_bytes());
        bytes.extend_from_slice(&self.nonce.to_le_bytes());
        bytes
    }
}

// =============================================================================
// HUMAN PROFILE (Upgraded)
// =============================================================================

/// Attestation reference stored in profile (lightweight pointer)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct AttestationRef {
    /// Attestation account pubkey
    pub attestation: Pubkey,
    /// Issuer who created it
    pub issuer: Pubkey,
    /// Type of attestation
    pub attestation_type: IssuerType,
    /// Weight at time of registration
    pub weight: u16,
    /// Expiry time (for quick checks)
    pub expires_at: i64,
}

impl AttestationRef {
    pub const LEN: usize = 32 + // attestation
        32 + // issuer
        1 +  // attestation_type
        2 +  // weight
        8;   // expires_at
}

/// Human profile account - stores identity score and attestation references
#[account]
pub struct HumanProfile {
    /// The wallet this profile belongs to
    pub wallet: Pubkey,
    /// Aggregated identity score (computed from valid attestations)
    pub human_score: u16,
    /// Cached uniqueness flag (recomputed on attestation changes)
    pub is_unique: bool,
    /// Total number of attestations ever registered
    pub total_attestation_count: u32,
    /// Number of currently active/valid attestations
    pub active_attestation_count: u32,
    /// Timestamp of last attestation change
    pub last_attestation_at: i64,
    /// Timestamp of last score recomputation
    pub last_score_update: i64,
    /// Bounded list of attestation references
    pub attestations: Vec<AttestationRef>,
    /// Whether this profile can register agents
    pub can_register_agents: bool,
    /// Total agents registered by this profile
    pub agents_registered: u32,
    /// Profile creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl HumanProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // wallet
        2 +  // human_score
        1 +  // is_unique
        4 +  // total_attestation_count
        4 +  // active_attestation_count
        8 +  // last_attestation_at
        8 +  // last_score_update
        4 + (MAX_ATTESTATIONS * AttestationRef::LEN) + // attestations vec
        1 +  // can_register_agents
        4 +  // agents_registered
        8 +  // created_at
        1;   // bump

    /// Recompute human_score from active attestations
    /// Call this after any attestation change
    pub fn recompute_score(&mut self, current_time: i64) {
        let mut total_score: u16 = 0;
        let mut active_count: u32 = 0;
        let mut has_uniqueness_attestation = false;

        for att_ref in &self.attestations {
            // Check if attestation is still valid (not expired)
            if att_ref.expires_at == 0 || current_time < att_ref.expires_at {
                total_score = total_score.saturating_add(att_ref.weight);
                active_count += 1;
                
                // PoP attestations contribute to uniqueness
                if att_ref.attestation_type == IssuerType::ProofOfPersonhood {
                    has_uniqueness_attestation = true;
                }
            }
        }

        self.human_score = total_score;
        self.active_attestation_count = active_count;
        self.is_unique = total_score >= UNIQUE_THRESHOLD && has_uniqueness_attestation;
        self.can_register_agents = total_score >= 50; // MIN_HUMAN_SCORE_FOR_AGENT
        self.last_score_update = current_time;
    }

    /// Add attestation reference (does not recompute score)
    pub fn add_attestation(&mut self, att_ref: AttestationRef, current_time: i64) -> bool {
        if self.attestations.len() >= MAX_ATTESTATIONS {
            return false;
        }
        self.attestations.push(att_ref);
        self.total_attestation_count = self.total_attestation_count.saturating_add(1);
        self.last_attestation_at = current_time;
        true
    }

    /// Remove attestation reference by pubkey
    pub fn remove_attestation(&mut self, attestation: &Pubkey) -> bool {
        if let Some(pos) = self.attestations.iter().position(|a| a.attestation == *attestation) {
            self.attestations.remove(pos);
            true
        } else {
            false
        }
    }
}

// =============================================================================
// ADMIN CONFIG
// =============================================================================

/// Global registry configuration (admin controlled)
#[account]
pub struct RegistryConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Whether new profile creation is paused
    pub profile_creation_paused: bool,
    /// Whether attestation registration is paused
    pub attestation_paused: bool,
    /// Minimum score to be considered "verified"
    pub min_verified_score: u16,
    /// Minimum score to register agents
    pub min_agent_score: u16,
    /// Uniqueness threshold
    pub uniqueness_threshold: u16,
    /// Total profiles created
    pub total_profiles: u64,
    /// Total attestations issued
    pub total_attestations: u64,
    /// PDA bump
    pub bump: u8,
}

impl RegistryConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        1 +  // profile_creation_paused
        1 +  // attestation_paused
        2 +  // min_verified_score
        2 +  // min_agent_score
        2 +  // uniqueness_threshold
        8 +  // total_profiles
        8 +  // total_attestations
        1;   // bump
}
