use anchor_lang::prelude::*;

// H-03 FIX: Import shared types from common crate to avoid drift
pub use humanrail_common::asset_scope;
pub use humanrail_common::constants::MAX_DESTINATION_ALLOWLIST;
pub use humanrail_common::program_scope;
pub use humanrail_common::CapabilityStatus;

/// Capability credential - the core KYA primitive
#[account]
pub struct Capability {
    /// Principal who issued this capability
    pub principal: Pubkey,
    /// Agent this capability is issued to
    pub agent: Pubkey,
    /// Allowed programs (bitmask)
    pub allowed_programs: u64,
    /// Allowed asset types (bitmask)
    pub allowed_assets: u64,
    /// Per-transaction value limit
    pub per_tx_limit: u64,
    /// Daily spending limit
    pub daily_limit: u64,
    /// Total lifetime limit
    pub total_limit: u64,
    /// Maximum slippage (basis points)
    pub max_slippage_bps: u16,
    /// Maximum fee per transaction
    pub max_fee: u64,
    /// Capability validity start time
    pub valid_from: i64,
    /// Capability expiry time
    pub expires_at: i64,
    /// Cooldown between uses (seconds)
    pub cooldown_seconds: u32,
    /// Risk tier required
    pub risk_tier: u8,
    /// Current status
    pub status: CapabilityStatus,
    /// Timestamp when issued
    pub issued_at: i64,
    /// Timestamp of last use
    pub last_used_at: i64,
    /// Amount spent today (resets daily)
    pub daily_spent: u64,
    /// Day number for daily reset tracking
    pub current_day: u32,
    /// Total amount spent lifetime
    pub total_spent: u64,
    /// Total number of uses
    pub use_count: u64,
    /// Whether destination allowlist is enforced
    pub enforce_allowlist: bool,
    /// Number of destinations in allowlist
    pub allowlist_count: u8,
    /// Destination allowlist (fixed size array)
    pub destination_allowlist: [Pubkey; MAX_DESTINATION_ALLOWLIST],
    /// Dispute reason hash (if disputed)
    pub dispute_reason: [u8; 32],
    /// Nonce for PDA derivation
    pub nonce: u64,
    /// PDA bump
    pub bump: u8,
}

impl Capability {
    pub const LEN: usize = 8 + // discriminator
        32 + // principal
        32 + // agent
        8 +  // allowed_programs
        8 +  // allowed_assets
        8 +  // per_tx_limit
        8 +  // daily_limit
        8 +  // total_limit
        2 +  // max_slippage_bps
        8 +  // max_fee
        8 +  // valid_from
        8 +  // expires_at
        4 +  // cooldown_seconds
        1 +  // risk_tier
        1 +  // status
        8 +  // issued_at
        8 +  // last_used_at
        8 +  // daily_spent
        4 +  // current_day
        8 +  // total_spent
        8 +  // use_count
        1 +  // enforce_allowlist
        1 +  // allowlist_count
        (32 * MAX_DESTINATION_ALLOWLIST) + // destination_allowlist
        32 + // dispute_reason
        8 +  // nonce
        1; // bump

    /// Check if capability is currently valid for use
    pub fn is_valid(&self, current_time: i64) -> bool {
        self.status == CapabilityStatus::Active
            && current_time >= self.valid_from
            && current_time < self.expires_at
    }

    /// Check if destination is allowed
    pub fn is_destination_allowed(&self, destination: &Pubkey) -> bool {
        if !self.enforce_allowlist {
            return true;
        }
        for i in 0..self.allowlist_count as usize {
            if self.destination_allowlist[i] == *destination {
                return true;
            }
        }
        false
    }

    /// Check if program is allowed
    pub fn is_program_allowed(&self, program_bit: u64) -> bool {
        (program_bit & self.allowed_programs) == program_bit
    }

    /// Check if asset is allowed
    pub fn is_asset_allowed(&self, asset_bit: u64) -> bool {
        (asset_bit & self.allowed_assets) == asset_bit
    }

    /// Check if cooldown has passed
    pub fn is_cooldown_passed(&self, current_time: i64) -> bool {
        current_time >= self.last_used_at + self.cooldown_seconds as i64
    }

    /// Get current day number for daily limit tracking
    pub fn get_day_number(timestamp: i64) -> u32 {
        (timestamp / 86400) as u32
    }

    /// Reset daily spent if new day
    pub fn maybe_reset_daily(&mut self, current_time: i64) {
        let current_day = Self::get_day_number(current_time);
        if current_day != self.current_day {
            self.daily_spent = 0;
            self.current_day = current_day;
        }
    }
}

/// Revocation registry entry - for tracking revoked capabilities
#[account]
pub struct RevocationEntry {
    /// The capability that was revoked
    pub capability: Pubkey,
    /// Principal who revoked
    pub revoked_by: Pubkey,
    /// Timestamp of revocation
    pub revoked_at: i64,
    /// Reason for revocation (hash)
    pub reason_hash: [u8; 32],
    /// PDA bump
    pub bump: u8,
}

impl RevocationEntry {
    pub const LEN: usize = 8 + // discriminator
        32 + // capability
        32 + // revoked_by
        8 +  // revoked_at
        32 + // reason_hash
        1; // bump
}

/// Emergency freeze record - for tracking frozen agents
#[account]
pub struct EmergencyFreezeRecord {
    /// Agent that is frozen
    pub agent: Pubkey,
    /// Principal who initiated freeze
    pub frozen_by: Pubkey,
    /// Timestamp of freeze
    pub frozen_at: i64,
    /// Whether freeze is still active
    pub is_active: bool,
    /// Timestamp of unfreeze (0 if still frozen)
    pub unfrozen_at: i64,
    /// Reason for freeze (hash)
    pub reason_hash: [u8; 32],
    /// PDA bump
    pub bump: u8,
}

impl EmergencyFreezeRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // frozen_by
        8 +  // frozen_at
        1 +  // is_active
        8 +  // unfrozen_at
        32 + // reason_hash
        1; // bump
}

/// Usage record - for tracking capability usage
#[account]
pub struct UsageRecord {
    /// The capability used
    pub capability: Pubkey,
    /// Agent that used the capability
    pub agent: Pubkey,
    /// Amount used in this transaction
    pub amount: u64,
    /// Action type (program-specific encoding)
    pub action_type: u8,
    /// Destination of the action
    pub destination: Pubkey,
    /// Timestamp of use
    pub used_at: i64,
    /// Transaction signature (first 32 bytes)
    pub tx_signature: [u8; 32],
    /// Sequence number for this capability
    pub sequence: u64,
    /// PDA bump
    pub bump: u8,
}

impl UsageRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // capability
        32 + // agent
        8 +  // amount
        1 +  // action_type
        32 + // destination
        8 +  // used_at
        32 + // tx_signature
        8 +  // sequence
        1; // bump
}
