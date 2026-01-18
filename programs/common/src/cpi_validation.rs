//! CPI Validation Layer for HumanRail Programs
//!
//! This module provides a strict interface contract for cross-program validation.
//! Instead of copying account structs across programs (which becomes brittle with versioning),
//! each program exposes verification instructions that:
//! 1. Take minimal input parameters
//! 2. Return normalized ValidationResult via return data
//! 3. Are versioned and backwards-compatible
//!
//! Consuming programs call these via CPI and read the return data.

use anchor_lang::prelude::*;

// =============================================================================
// VALIDATION RESULT (returned via set_return_data)
// =============================================================================

/// Normalized validation result for CPI returns.
/// All validation instructions return this structure.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct ValidationResult {
    /// Whether validation passed
    pub is_valid: bool,
    /// Error code if invalid (0 = OK)
    pub error_code: u8,
    /// Program-specific score/value
    pub score: u16,
    /// Additional context bits (program-specific)
    pub context_flags: u64,
}

impl ValidationResult {
    pub const LEN: usize = 1 + 1 + 2 + 8;

    pub fn ok() -> Self {
        Self {
            is_valid: true,
            error_code: 0,
            score: 0,
            context_flags: 0,
        }
    }

    pub fn ok_with_score(score: u16) -> Self {
        Self {
            is_valid: true,
            error_code: 0,
            score,
            context_flags: 0,
        }
    }

    pub fn err(code: u8) -> Self {
        Self {
            is_valid: false,
            error_code: code,
            score: 0,
            context_flags: 0,
        }
    }

    pub fn to_bytes(&self) -> [u8; Self::LEN] {
        let mut bytes = [0u8; Self::LEN];
        bytes[0] = self.is_valid as u8;
        bytes[1] = self.error_code;
        bytes[2..4].copy_from_slice(&self.score.to_le_bytes());
        bytes[4..12].copy_from_slice(&self.context_flags.to_le_bytes());
        bytes
    }

    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < Self::LEN {
            return None;
        }
        Some(Self {
            is_valid: bytes[0] != 0,
            error_code: bytes[1],
            score: u16::from_le_bytes([bytes[2], bytes[3]]),
            context_flags: u64::from_le_bytes(bytes[4..12].try_into().ok()?),
        })
    }
}

// =============================================================================
// ERROR CODES (standardized across all programs)
// =============================================================================

pub mod error_codes {
    // Generic (0-9)
    pub const OK: u8 = 0;
    pub const UNKNOWN: u8 = 1;
    pub const INVALID_ACCOUNT: u8 = 2;
    pub const UNAUTHORIZED: u8 = 3;
    
    // Human Registry (10-29)
    pub const HUMAN_PROFILE_NOT_FOUND: u8 = 10;
    pub const INSUFFICIENT_HUMAN_SCORE: u8 = 11;
    pub const NOT_UNIQUE_HUMAN: u8 = 12;
    pub const INSUFFICIENT_ATTESTATIONS: u8 = 13;
    pub const CANNOT_REGISTER_AGENTS: u8 = 14;
    
    // Agent Registry (30-49)
    pub const AGENT_NOT_FOUND: u8 = 30;
    pub const AGENT_NOT_ACTIVE: u8 = 31;
    pub const AGENT_SUSPENDED: u8 = 32;
    pub const AGENT_REVOKED: u8 = 33;
    pub const AGENT_SIGNER_MISMATCH: u8 = 34;
    pub const AGENT_PRINCIPAL_MISMATCH: u8 = 35;
    
    // Delegation (50-79)
    pub const CAPABILITY_NOT_FOUND: u8 = 50;
    pub const CAPABILITY_INACTIVE: u8 = 51;
    pub const CAPABILITY_EXPIRED: u8 = 52;
    pub const CAPABILITY_NOT_YET_VALID: u8 = 53;
    pub const PROGRAM_NOT_ALLOWED: u8 = 54;
    pub const ASSET_NOT_ALLOWED: u8 = 55;
    pub const PER_TX_LIMIT_EXCEEDED: u8 = 56;
    pub const DAILY_LIMIT_EXCEEDED: u8 = 57;
    pub const TOTAL_LIMIT_EXCEEDED: u8 = 58;
    pub const COOLDOWN_NOT_ELAPSED: u8 = 59;
    pub const DESTINATION_NOT_ALLOWED: u8 = 60;
    pub const AGENT_FROZEN: u8 = 61;
    pub const CAPABILITY_DISPUTED: u8 = 62;
    
    // Document Registry (80-99)
    pub const DOCUMENT_NOT_FOUND: u8 = 80;
    pub const DOCUMENT_VOIDED: u8 = 81;
    pub const SIGNATURE_NOT_FOUND: u8 = 82;
    pub const SIGNATURE_REVOKED: u8 = 83;
    pub const INSUFFICIENT_TIER: u8 = 84;
}

// =============================================================================
// CONTEXT FLAGS (bitwise, program-specific)
// =============================================================================

pub mod context_flags {
    // Human Registry context
    pub const IS_UNIQUE_HUMAN: u64 = 1 << 0;
    pub const CAN_REGISTER_AGENTS: u64 = 1 << 1;
    pub const HAS_KYC_ATTESTATION: u64 = 1 << 2;
    pub const HAS_POP_ATTESTATION: u64 = 1 << 3;
    
    // Agent Registry context
    pub const AGENT_HAS_TEE: u64 = 1 << 8;
    pub const AGENT_KEY_ROTATING: u64 = 1 << 9;
    
    // Delegation context
    pub const ALLOWLIST_ENFORCED: u64 = 1 << 16;
    pub const IN_COOLDOWN: u64 = 1 << 17;
    pub const NEAR_DAILY_LIMIT: u64 = 1 << 18;  // >80% used
    pub const NEAR_TOTAL_LIMIT: u64 = 1 << 19;  // >80% used
}

// =============================================================================
// CPI INSTRUCTION DISCRIMINATORS
// =============================================================================

pub mod discriminators {
    // Human Registry
    pub const VERIFY_HUMAN: [u8; 8] = [0x76, 0x65, 0x72, 0x69, 0x66, 0x79, 0x68, 0x75]; // "verifyhu"
    
    // Agent Registry
    pub const VERIFY_AGENT: [u8; 8] = [0x76, 0x65, 0x72, 0x69, 0x66, 0x79, 0x61, 0x67]; // "verifyag"
    
    // Delegation
    pub const VALIDATE_CAPABILITY: [u8; 8] = [0x76, 0x61, 0x6c, 0x69, 0x64, 0x63, 0x61, 0x70]; // "validcap"
}

// =============================================================================
// CPI HELPERS
// =============================================================================

/// Read validation result from return data after CPI call
pub fn read_validation_result() -> Option<ValidationResult> {
    let (_program_id, data) = anchor_lang::solana_program::program::get_return_data()?;
    // Verify it's from a known HumanRail program (optional, for extra safety)
    ValidationResult::from_bytes(&data)
}

/// Set validation result as return data
pub fn set_validation_result(result: &ValidationResult) {
    anchor_lang::solana_program::program::set_return_data(&result.to_bytes());
}

// =============================================================================
// VERSIONING
// =============================================================================

/// Interface version for backwards compatibility
pub const INTERFACE_VERSION: u8 = 1;

/// Minimum supported interface version
pub const MIN_INTERFACE_VERSION: u8 = 1;

// =============================================================================
// INSTRUCTION PARAMETER STRUCTURES (minimal, versioned)
// =============================================================================

/// Parameters for human verification CPI
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyHumanParams {
    pub version: u8,
    pub min_score: Option<u16>,
    pub require_unique: bool,
    pub min_attestations: Option<u32>,
    pub require_can_register_agents: bool,
}

impl Default for VerifyHumanParams {
    fn default() -> Self {
        Self {
            version: INTERFACE_VERSION,
            min_score: None,
            require_unique: false,
            min_attestations: None,
            require_can_register_agents: false,
        }
    }
}

/// Parameters for agent verification CPI
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyAgentParams {
    pub version: u8,
    pub require_active: bool,
    pub verify_signer: Option<Pubkey>,
    pub verify_principal: Option<Pubkey>,
}

impl Default for VerifyAgentParams {
    fn default() -> Self {
        Self {
            version: INTERFACE_VERSION,
            require_active: true,
            verify_signer: None,
            verify_principal: None,
        }
    }
}

/// Parameters for capability validation CPI
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidateCapabilityParams {
    pub version: u8,
    pub program_scope: u64,
    pub asset_scope: u64,
    pub amount: u64,
    pub destination: Option<Pubkey>,
    pub check_cooldown: bool,
}

impl Default for ValidateCapabilityParams {
    fn default() -> Self {
        Self {
            version: INTERFACE_VERSION,
            program_scope: 0,
            asset_scope: 0,
            amount: 0,
            destination: None,
            check_cooldown: true,
        }
    }
}
