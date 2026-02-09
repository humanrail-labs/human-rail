use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;

use crate::state_v2::HumanProfile;

// =============================================================================
// CPI VALIDATION INTERFACE
// =============================================================================

/// Validation result returned via set_return_data for CPI consumers.
/// This is the canonical interface - other programs read this after CPI.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub error_code: u8,
    pub score: u16,
    pub context_flags: u64,
}

impl ValidationResult {
    pub const LEN: usize = 1 + 1 + 2 + 8;

    pub fn ok_with_score(score: u16, flags: u64) -> Self {
        Self {
            is_valid: true,
            error_code: 0,
            score,
            context_flags: flags,
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
}

// Error codes (standardized)
pub const ERR_INSUFFICIENT_SCORE: u8 = 11;
pub const ERR_NOT_UNIQUE: u8 = 12;
pub const ERR_INSUFFICIENT_ATTESTATIONS: u8 = 13;
pub const ERR_CANNOT_REGISTER_AGENTS: u8 = 14;

// Context flags
pub const FLAG_IS_UNIQUE: u64 = 1 << 0;
pub const FLAG_CAN_REGISTER_AGENTS: u64 = 1 << 1;
pub const FLAG_HAS_KYC: u64 = 1 << 2;
pub const FLAG_HAS_POP: u64 = 1 << 3;

// =============================================================================
// INSTRUCTION
// =============================================================================

/// Verify a human profile meets requirements.
///
/// This is the CPI validation interface for human_registry.
/// Other programs call this via CPI and read the ValidationResult from return data.
///
/// The instruction:
/// 1. Validates the profile against provided requirements
/// 2. Returns ValidationResult via set_return_data
/// 3. Emits an event for indexing
/// 4. Does NOT fail if requirements aren't met - caller checks return data
pub fn handler(ctx: Context<VerifyHuman>, params: VerifyHumanParams) -> Result<()> {
    let clock = Clock::get()?;
    let profile = &ctx.accounts.profile;

    // Compute effective score (handling expired attestations)
    let mut effective_score: u16 = 0;
    let mut has_pop = false;
    let mut has_kyc = false;
    let mut active_count: u32 = 0;

    for att_ref in &profile.attestations {
        if att_ref.expires_at == 0 || clock.unix_timestamp < att_ref.expires_at {
            effective_score = effective_score.saturating_add(att_ref.weight);
            active_count += 1;

            match att_ref.attestation_type {
                crate::state_v2::IssuerType::ProofOfPersonhood => has_pop = true,
                crate::state_v2::IssuerType::KycProvider => has_kyc = true,
                _ => {}
            }
        }
    }

    let effective_unique = has_pop && effective_score >= 100;
    let can_register_agents = effective_score >= 50;

    // Build context flags
    let mut flags: u64 = 0;
    if effective_unique {
        flags |= FLAG_IS_UNIQUE;
    }
    if can_register_agents {
        flags |= FLAG_CAN_REGISTER_AGENTS;
    }
    if has_kyc {
        flags |= FLAG_HAS_KYC;
    }
    if has_pop {
        flags |= FLAG_HAS_POP;
    }

    // Validate against requirements and build result
    let result = if let Some(min_score) = params.min_score {
        if effective_score < min_score {
            ValidationResult::err(ERR_INSUFFICIENT_SCORE)
        } else if params.require_unique && !effective_unique {
            ValidationResult::err(ERR_NOT_UNIQUE)
        } else if let Some(min_att) = params.min_attestations {
            if active_count < min_att {
                ValidationResult::err(ERR_INSUFFICIENT_ATTESTATIONS)
            } else {
                ValidationResult::ok_with_score(effective_score, flags)
            }
        } else {
            ValidationResult::ok_with_score(effective_score, flags)
        }
    } else if params.require_unique && !effective_unique {
        ValidationResult::err(ERR_NOT_UNIQUE)
    } else if params.require_can_register_agents && !can_register_agents {
        ValidationResult::err(ERR_CANNOT_REGISTER_AGENTS)
    } else {
        ValidationResult::ok_with_score(effective_score, flags)
    };

    // Set return data for CPI consumers
    set_return_data(&result.to_bytes());

    // Emit event for indexing
    emit!(HumanVerified {
        profile: profile.key(),
        wallet: profile.wallet,
        effective_score,
        is_unique: effective_unique,
        can_register_agents,
        active_attestations: active_count,
        validation_passed: result.is_valid,
        error_code: result.error_code,
        verified_at: clock.unix_timestamp,
    });

    // NOTE: We don't return an error even if validation fails.
    // The caller reads the ValidationResult from return data.
    // This allows CPI callers to handle failures gracefully.

    msg!(
        "Human verified: wallet={}, score={}, valid={}, error={}",
        profile.wallet,
        effective_score,
        result.is_valid,
        result.error_code
    );

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyHuman<'info> {
    /// The profile to verify
    #[account(
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyHumanParams {
    /// Interface version (for backwards compatibility)
    pub version: u8,
    /// Minimum human score required (None = no minimum)
    pub min_score: Option<u16>,
    /// Whether uniqueness is required
    pub require_unique: bool,
    /// Minimum number of active attestations (None = no minimum)
    pub min_attestations: Option<u32>,
    /// Whether to check agent registration eligibility
    pub require_can_register_agents: bool,
}

impl Default for VerifyHumanParams {
    fn default() -> Self {
        Self {
            version: 1,
            min_score: None,
            require_unique: false,
            min_attestations: None,
            require_can_register_agents: false,
        }
    }
}

#[event]
pub struct HumanVerified {
    pub profile: Pubkey,
    pub wallet: Pubkey,
    pub effective_score: u16,
    pub is_unique: bool,
    pub can_register_agents: bool,
    pub active_attestations: u32,
    pub validation_passed: bool,
    pub error_code: u8,
    pub verified_at: i64,
}
