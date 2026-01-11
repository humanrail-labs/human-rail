use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, EmergencyFreezeRecord},
};

// =============================================================================
// CPI VALIDATION INTERFACE
// =============================================================================

/// Validation result returned via set_return_data for CPI consumers.
/// This is the canonical interface - other programs read this after CPI.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub error_code: u8,
    pub remaining_daily: u64,
    pub remaining_total: u64,
    pub context_flags: u64,
}

impl ValidationResult {
    pub const LEN: usize = 1 + 1 + 8 + 8 + 8;

    pub fn ok(remaining_daily: u64, remaining_total: u64, flags: u64) -> Self {
        Self {
            is_valid: true,
            error_code: 0,
            remaining_daily,
            remaining_total,
            context_flags: flags,
        }
    }

    pub fn err(code: u8) -> Self {
        Self {
            is_valid: false,
            error_code: code,
            remaining_daily: 0,
            remaining_total: 0,
            context_flags: 0,
        }
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(Self::LEN);
        bytes.push(self.is_valid as u8);
        bytes.push(self.error_code);
        bytes.extend_from_slice(&self.remaining_daily.to_le_bytes());
        bytes.extend_from_slice(&self.remaining_total.to_le_bytes());
        bytes.extend_from_slice(&self.context_flags.to_le_bytes());
        bytes
    }
}

// Error codes (standardized across programs)
pub const ERR_CAPABILITY_INACTIVE: u8 = 51;
pub const ERR_CAPABILITY_EXPIRED: u8 = 52;
pub const ERR_CAPABILITY_NOT_YET_VALID: u8 = 53;
pub const ERR_PROGRAM_NOT_ALLOWED: u8 = 54;
pub const ERR_ASSET_NOT_ALLOWED: u8 = 55;
pub const ERR_PER_TX_LIMIT_EXCEEDED: u8 = 56;
pub const ERR_DAILY_LIMIT_EXCEEDED: u8 = 57;
pub const ERR_TOTAL_LIMIT_EXCEEDED: u8 = 58;
pub const ERR_COOLDOWN_NOT_ELAPSED: u8 = 59;
pub const ERR_DESTINATION_NOT_ALLOWED: u8 = 60;
pub const ERR_AGENT_FROZEN: u8 = 61;
pub const ERR_CAPABILITY_DISPUTED: u8 = 62;

// Context flags
pub const FLAG_ALLOWLIST_ENFORCED: u64 = 1 << 16;
pub const FLAG_IN_COOLDOWN: u64 = 1 << 17;
pub const FLAG_NEAR_DAILY_LIMIT: u64 = 1 << 18;  // >80% used
pub const FLAG_NEAR_TOTAL_LIMIT: u64 = 1 << 19;  // >80% used

// =============================================================================
// INSTRUCTION
// =============================================================================

/// Validate a capability for a specific action.
/// 
/// This is the CPI validation interface for the delegation program.
/// Other programs call this via CPI and read the ValidationResult from return data.
/// 
/// The instruction:
/// 1. Validates the capability against provided parameters
/// 2. Returns ValidationResult via set_return_data
/// 3. Emits an event for indexing
/// 4. Does NOT fail on validation errors - caller checks return data
pub fn handler(
    ctx: Context<ValidateCapability>,
    params: ValidateCapabilityParams,
) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &ctx.accounts.capability;
    
    // Check if agent is frozen
    let agent_frozen = ctx.accounts.freeze_record.as_ref()
        .map(|f| f.is_active)
        .unwrap_or(false);
    
    // Run validation and get result
    let result = validate_capability_internal(
        capability,
        &params,
        clock.unix_timestamp,
        agent_frozen,
    );
    
    // Set return data for CPI consumers
    set_return_data(&result.to_bytes());
    
    // Emit event for indexing
    emit!(CapabilityValidated {
        capability: capability.key(),
        principal: capability.principal,
        agent: capability.agent,
        validation_passed: result.is_valid,
        error_code: result.error_code,
        context_flags: result.context_flags,
        amount_requested: params.amount,
        program_scope_requested: params.program_scope,
        remaining_daily: result.remaining_daily,
        remaining_total: result.remaining_total,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Capability validated: valid={}, error={}, remaining_daily={}",
        result.is_valid,
        result.error_code,
        result.remaining_daily
    );

    Ok(())
}

/// Internal validation logic
fn validate_capability_internal(
    capability: &Capability,
    params: &ValidateCapabilityParams,
    current_time: i64,
    agent_frozen: bool,
) -> ValidationResult {
    let mut flags: u64 = 0;
    
    // Check agent freeze first
    if agent_frozen {
        return ValidationResult::err(ERR_AGENT_FROZEN);
    }
    
    // Check status
    match capability.status {
        CapabilityStatus::Active => {},
        CapabilityStatus::Revoked => return ValidationResult::err(ERR_CAPABILITY_INACTIVE),
        CapabilityStatus::Expired => return ValidationResult::err(ERR_CAPABILITY_EXPIRED),
        CapabilityStatus::Frozen => return ValidationResult::err(ERR_AGENT_FROZEN),
        CapabilityStatus::Disputed => return ValidationResult::err(ERR_CAPABILITY_DISPUTED),
    }
    
    // Check time bounds
    if current_time < capability.valid_from {
        return ValidationResult::err(ERR_CAPABILITY_NOT_YET_VALID);
    }
    if current_time >= capability.expires_at {
        return ValidationResult::err(ERR_CAPABILITY_EXPIRED);
    }
    
    // Check cooldown
    if params.check_cooldown && !capability.is_cooldown_passed(current_time) {
        flags |= FLAG_IN_COOLDOWN;
        return ValidationResult::err(ERR_COOLDOWN_NOT_ELAPSED);
    }
    
    // Check program scope
    if params.program_scope != 0 && !capability.is_program_allowed(params.program_scope) {
        return ValidationResult::err(ERR_PROGRAM_NOT_ALLOWED);
    }
    
    // Check asset scope
    if params.asset_scope != 0 && !capability.is_asset_allowed(params.asset_scope) {
        return ValidationResult::err(ERR_ASSET_NOT_ALLOWED);
    }
    
    // Check per-transaction limit
    if params.amount > capability.per_tx_limit {
        return ValidationResult::err(ERR_PER_TX_LIMIT_EXCEEDED);
    }
    
    // Calculate effective daily spent (with day rollover)
    let current_day = Capability::get_day_number(current_time);
    let effective_daily_spent = if current_day != capability.current_day {
        0 // New day, reset
    } else {
        capability.daily_spent
    };
    
    // Check daily limit
    let new_daily_spent = effective_daily_spent.saturating_add(params.amount);
    if new_daily_spent > capability.daily_limit {
        return ValidationResult::err(ERR_DAILY_LIMIT_EXCEEDED);
    }
    
    // Check total limit
    let new_total_spent = capability.total_spent.saturating_add(params.amount);
    if new_total_spent > capability.total_limit {
        return ValidationResult::err(ERR_TOTAL_LIMIT_EXCEEDED);
    }
    
    // Check destination allowlist
    if capability.enforce_allowlist {
        flags |= FLAG_ALLOWLIST_ENFORCED;
        
        if let Some(destination) = params.destination {
            if !capability.is_destination_allowed(&destination) {
                return ValidationResult::err(ERR_DESTINATION_NOT_ALLOWED);
            }
        }
    }
    
    // Calculate remaining limits
    let remaining_daily = capability.daily_limit.saturating_sub(new_daily_spent);
    let remaining_total = capability.total_limit.saturating_sub(new_total_spent);
    
    // Set warning flags
    let daily_percent = if capability.daily_limit > 0 {
        (new_daily_spent as u128 * 100) / capability.daily_limit as u128
    } else {
        0
    };
    if daily_percent >= 80 {
        flags |= FLAG_NEAR_DAILY_LIMIT;
    }
    
    let total_percent = if capability.total_limit > 0 {
        (new_total_spent as u128 * 100) / capability.total_limit as u128
    } else {
        0
    };
    if total_percent >= 80 {
        flags |= FLAG_NEAR_TOTAL_LIMIT;
    }
    
    ValidationResult::ok(remaining_daily, remaining_total, flags)
}

#[derive(Accounts)]
pub struct ValidateCapability<'info> {
    /// The capability to validate
    pub capability: Account<'info, Capability>,

    /// Optional freeze record - if exists and active, agent is frozen
    #[account(
        seeds = [b"freeze", capability.agent.as_ref()],
        bump,
    )]
    pub freeze_record: Option<Account<'info, EmergencyFreezeRecord>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidateCapabilityParams {
    /// Interface version
    pub version: u8,
    /// Program scope bits being requested
    pub program_scope: u64,
    /// Asset scope bits being requested  
    pub asset_scope: u64,
    /// Amount being requested (for limit checks)
    pub amount: u64,
    /// Destination address (for allowlist check)
    pub destination: Option<Pubkey>,
    /// Whether to enforce cooldown
    pub check_cooldown: bool,
}

impl Default for ValidateCapabilityParams {
    fn default() -> Self {
        Self {
            version: 1,
            program_scope: 0,
            asset_scope: 0,
            amount: 0,
            destination: None,
            check_cooldown: true,
        }
    }
}

#[event]
pub struct CapabilityValidated {
    pub capability: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub validation_passed: bool,
    pub error_code: u8,
    pub context_flags: u64,
    pub amount_requested: u64,
    pub program_scope_requested: u64,
    pub remaining_daily: u64,
    pub remaining_total: u64,
    pub timestamp: i64,
}
