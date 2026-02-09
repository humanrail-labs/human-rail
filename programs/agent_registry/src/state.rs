use anchor_lang::prelude::*;

/// Maximum number of historical keys to track for rotation
pub const MAX_KEY_HISTORY: usize = 3;

/// Grace period for key rotation (seconds) - old key remains valid
pub const KEY_ROTATION_GRACE_PERIOD: i64 = 86400; // 24 hours

/// Agent lifecycle status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum AgentStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

/// Agent profile account - core identity for AI agents
#[account]
pub struct AgentProfile {
    /// Principal (owner) of this agent - must be a verified human or organization
    pub owner_principal: Pubkey,
    /// Current signing key for the agent
    pub signing_key: Pubkey,
    /// Human-readable name (32 bytes, null-padded)
    pub name: [u8; 32],
    /// Hash of agent metadata (code version, model/provider, policies)
    pub metadata_hash: [u8; 32],
    /// Optional TEE measurement hash for hardware attestation
    pub tee_measurement: [u8; 32],
    /// Whether TEE measurement is set
    pub has_tee_measurement: bool,
    /// Current agent status
    pub status: AgentStatus,
    /// Timestamp when agent was registered
    pub created_at: i64,
    /// Timestamp of last status change
    pub last_status_change: i64,
    /// Timestamp of last metadata update
    pub last_metadata_update: i64,
    /// Total number of capabilities issued to this agent
    pub capability_count: u32,
    /// Total number of actions performed by this agent
    pub action_count: u64,
    /// Nonce used for PDA derivation
    pub nonce: u64,
    /// PDA bump
    pub bump: u8,
}

impl AgentProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner_principal
        32 + // signing_key
        32 + // name
        32 + // metadata_hash
        32 + // tee_measurement
        1 +  // has_tee_measurement
        1 +  // status
        8 +  // created_at
        8 +  // last_status_change
        8 +  // last_metadata_update
        4 +  // capability_count
        8 +  // action_count
        8 +  // nonce
        1; // bump

    pub fn is_active(&self) -> bool {
        self.status == AgentStatus::Active
    }
}

/// Key rotation record - tracks historical signing keys
#[account]
pub struct KeyRotation {
    /// The agent this rotation belongs to
    pub agent: Pubkey,
    /// Previous signing key
    pub old_key: Pubkey,
    /// New signing key
    pub new_key: Pubkey,
    /// When the rotation was initiated
    pub rotated_at: i64,
    /// When the old key expires (rotated_at + grace_period)
    pub old_key_expires_at: i64,
    /// Sequence number for this rotation
    pub sequence: u32,
    /// PDA bump
    pub bump: u8,
}

impl KeyRotation {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // old_key
        32 + // new_key
        8 +  // rotated_at
        8 +  // old_key_expires_at
        4 +  // sequence
        1; // bump

    /// Check if the old key is still valid (within grace period)
    pub fn is_old_key_valid(&self, current_time: i64) -> bool {
        current_time < self.old_key_expires_at
    }
}

/// Agent operator stats - for tracking agent behavior and risk scoring
#[account]
pub struct AgentOperatorStats {
    /// The agent this stats record belongs to
    pub agent: Pubkey,
    /// Total transactions executed
    pub total_transactions: u64,
    /// Total value transacted (in lamports equivalent)
    pub total_value_transacted: u64,
    /// Number of failed transactions
    pub failed_transactions: u32,
    /// Number of revoked capabilities
    pub revoked_capabilities: u32,
    /// Last activity timestamp
    pub last_activity: i64,
    /// Risk score (0-10000 basis points, higher = riskier)
    pub risk_score: u16,
    /// Number of anomaly flags triggered
    pub anomaly_flags: u32,
    /// PDA bump
    pub bump: u8,
}

impl AgentOperatorStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 +  // total_transactions
        8 +  // total_value_transacted
        4 +  // failed_transactions
        4 +  // revoked_capabilities
        8 +  // last_activity
        2 +  // risk_score
        4 +  // anomaly_flags
        1; // bump
}
