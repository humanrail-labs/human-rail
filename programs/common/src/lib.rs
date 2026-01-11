//! Shared types and interfaces for HumanRail programs.
//! This crate provides common data structures used across all HumanRail programs
//! to ensure type consistency and avoid circular dependencies.

use anchor_lang::prelude::*;

pub mod cpi_validation;
pub use cpi_validation::*;

// =============================================================================
// PROGRAM IDS (update these after deployment)
// =============================================================================

pub mod program_ids {
    use anchor_lang::prelude::Pubkey;
    
    // Use lazy initialization to avoid pubkey! macro issues
    pub fn human_registry() -> Pubkey {
        "Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR".parse().unwrap()
    }
    
    pub fn human_pay() -> Pubkey {
        "6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe".parse().unwrap()
    }
    
    pub fn data_blink() -> Pubkey {
        "BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5".parse().unwrap()
    }
    
    pub fn agent_registry() -> Pubkey {
        "299gbw6p9rCpp7SBR9tts7qTgGie591JPY6RMAXoJHE6".parse().unwrap()
    }
    
    pub fn delegation() -> Pubkey {
        "74vfEGbYWUsRq7z8oSgp6gNxx3ENVQEBqXFJqHrB3Xx2".parse().unwrap()
    }
    
    pub fn receipts() -> Pubkey {
        "9ZKqiKqi3zXhNvTevEJ8qD6F25YdoymXXSTzsiEviAi".parse().unwrap()
    }
    
    pub fn document_registry() -> Pubkey {
        "ERdbeXCpPoXsZmgpw5ALa14ujxnUhb7vVSpkmhQ9cY33".parse().unwrap()
    }
}

// =============================================================================
// SEEDS
// =============================================================================

pub mod seeds {
    // Human Registry
    pub const HUMAN_PROFILE: &[u8] = b"human_profile";
    pub const ISSUER: &[u8] = b"issuer";
    pub const ATTESTATION: &[u8] = b"attestation";
    
    // Agent Registry
    pub const AGENT: &[u8] = b"agent";
    pub const AGENT_STATS: &[u8] = b"agent_stats";
    pub const KEY_ROTATION: &[u8] = b"key_rotation";
    
    // Delegation
    pub const CAPABILITY: &[u8] = b"capability";
    pub const REVOCATION: &[u8] = b"revocation";
    pub const FREEZE: &[u8] = b"freeze";
    pub const USAGE: &[u8] = b"usage";
    
    // Receipts
    pub const RECEIPT: &[u8] = b"receipt";
    pub const RECEIPT_INDEX: &[u8] = b"receipt_index";
    
    // Document Registry
    pub const DOCUMENT: &[u8] = b"document";
    pub const SIGNATURE: &[u8] = b"signature";
    pub const REQUIRED_SIGNER: &[u8] = b"required_signer";
}

// =============================================================================
// CONSTANTS
// =============================================================================

pub mod constants {
    // Human Registry
    pub const MAX_ATTESTATIONS: usize = 8;
    pub const UNIQUE_THRESHOLD: u16 = 100;
    pub const MIN_HUMAN_SCORE_FOR_AGENT: u16 = 50;
    pub const MIN_VERIFIED_SIGNING_SCORE: u16 = 50;
    
    // Agent Registry
    pub const KEY_ROTATION_GRACE_PERIOD: i64 = 86400; // 24 hours
    
    // Delegation
    pub const MAX_DESTINATION_ALLOWLIST: usize = 10;
    
    // Document Registry
    pub const MAX_URI_LEN: usize = 128;
    pub const MAX_IDENTIFIER_LEN: usize = 32;
    pub const MAX_SIG_METADATA_LEN: usize = 64;
    pub const MAX_REQUIRED_SIGNERS: usize = 10;
}

// =============================================================================
// PROGRAM SCOPE BITS (for delegation)
// =============================================================================

pub mod program_scope {
    pub const HUMAN_PAY: u64 = 1 << 0;
    pub const DATA_BLINK: u64 = 1 << 1;
    pub const TOKEN_TRANSFER: u64 = 1 << 2;
    pub const NFT_TRANSFER: u64 = 1 << 3;
    pub const SWAP: u64 = 1 << 4;
    pub const STAKE: u64 = 1 << 5;
    pub const GOVERNANCE: u64 = 1 << 6;
    pub const DOCUMENT_SIGN: u64 = 1 << 7;
}

pub mod asset_scope {
    pub const SOL: u64 = 1 << 0;
    pub const USDC: u64 = 1 << 1;
    pub const USDT: u64 = 1 << 2;
    pub const ANY_SPL_TOKEN: u64 = 1 << 3;
    pub const ANY_NFT: u64 = 1 << 4;
}

// =============================================================================
// SHARED ENUMS
// =============================================================================

/// Agent lifecycle status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum AgentStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

/// Capability status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum CapabilityStatus {
    #[default]
    Active,
    Revoked,
    Expired,
    Frozen,
    Disputed,
}

/// Attestation status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum AttestationStatus {
    #[default]
    Active,
    Expired,
    Revoked,
}

/// Issuer status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum IssuerStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

/// Signature tier levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default, Debug)]
pub enum SignatureTier {
    #[default]
    WalletNotarization,
    VerifiedSigner,
    AgentOnBehalf,
}

/// Receipt action types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum ActionType {
    #[default]
    Unknown,
    Payment,
    TaskResponse,
    DocumentSign,
    TokenTransfer,
    Swap,
    Stake,
    Custom,
}

// =============================================================================
// INTERFACE ACCOUNTS (minimal fields for CPI verification)
// =============================================================================

/// Minimal HumanProfile interface for CPI verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HumanProfileInterface {
    pub wallet: Pubkey,
    pub human_score: u16,
    pub is_unique: bool,
    pub attestation_count: u32,
}

/// Minimal AgentProfile interface for CPI verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentProfileInterface {
    pub owner_principal: Pubkey,
    pub signing_key: Pubkey,
    pub status: AgentStatus,
    pub nonce: u64,
}

/// Minimal Capability interface for CPI verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CapabilityInterface {
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub allowed_programs: u64,
    pub allowed_assets: u64,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub total_limit: u64,
    pub valid_from: i64,
    pub expires_at: i64,
    pub status: CapabilityStatus,
    pub daily_spent: u64,
    pub total_spent: u64,
}

// =============================================================================
// RECEIPT DATA (unified format for all programs)
// =============================================================================

/// Unified receipt data structure for CPI emission
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReceiptData {
    /// Principal who authorized (human or org)
    pub principal: Pubkey,
    /// Agent that executed (same as principal if human action)
    pub agent: Pubkey,
    /// Capability used (Pubkey::default if no capability)
    pub capability: Pubkey,
    /// Type of action
    pub action_type: ActionType,
    /// Hash of action request/input
    pub action_hash: [u8; 32],
    /// Hash of action result/output
    pub result_hash: [u8; 32],
    /// Value involved (lamports or token units)
    pub value: u64,
    /// Destination of action
    pub destination: Pubkey,
    /// Program that emitted this receipt
    pub source_program: Pubkey,
}

// =============================================================================
// VALIDATION RESULT (for CPI returns)
// =============================================================================

/// Result of capability validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub remaining_daily: u64,
    pub remaining_total: u64,
    pub error_code: u8,
}

impl ValidationResult {
    pub const OK: u8 = 0;
    pub const CAPABILITY_INACTIVE: u8 = 1;
    pub const CAPABILITY_EXPIRED: u8 = 2;
    pub const PROGRAM_NOT_ALLOWED: u8 = 3;
    pub const ASSET_NOT_ALLOWED: u8 = 4;
    pub const PER_TX_LIMIT_EXCEEDED: u8 = 5;
    pub const DAILY_LIMIT_EXCEEDED: u8 = 6;
    pub const TOTAL_LIMIT_EXCEEDED: u8 = 7;
    pub const COOLDOWN_NOT_ELAPSED: u8 = 8;
    pub const DESTINATION_NOT_ALLOWED: u8 = 9;
    pub const AGENT_FROZEN: u8 = 10;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Check if capability allows a specific program
pub fn is_program_allowed(allowed_programs: u64, program_bit: u64) -> bool {
    allowed_programs & program_bit != 0
}

/// Check if capability allows a specific asset
pub fn is_asset_allowed(allowed_assets: u64, asset_bit: u64) -> bool {
    allowed_assets & asset_bit != 0
}

/// Get current day number for daily limit tracking
pub fn get_day_number(timestamp: i64) -> u32 {
    (timestamp / 86400) as u32
}

/// Compute simple hash for action data
pub fn compute_action_hash(data: &[u8]) -> [u8; 32] {
    let mut hash = [0u8; 32];
    for (i, byte) in data.iter().enumerate() {
        hash[i % 32] ^= byte;
    }
    hash
}
