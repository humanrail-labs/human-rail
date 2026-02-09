use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;
use anchor_lang::AccountDeserialize;

use crate::{
    error::DelegationError,
    state::{Capability, CapabilityStatus, EmergencyFreezeRecord},
};

// =============================================================================
// CPI VALIDATION INTERFACE
// =============================================================================

/// Validation result returned via set_return_data for CPI consumers.
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

// Error codes
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
pub const FLAG_NEAR_DAILY_LIMIT: u64 = 1 << 18;
pub const FLAG_NEAR_TOTAL_LIMIT: u64 = 1 << 19;

pub fn handler(ctx: Context<ValidateCapability>, params: ValidateCapabilityParams) -> Result<()> {
    let clock = Clock::get()?;
    let capability = &ctx.accounts.capability;

    // SECURITY: Mandatory freeze check. Client MUST pass the correct PDA
    // (enforced by seeds constraint). If freeze record exists and has data,
    // deserialize and check is_active. If PDA is empty → not frozen.
    let agent_frozen = {
        let freeze_info = &ctx.accounts.freeze_record;
        if !freeze_info.data_is_empty() {
            let data = freeze_info.try_borrow_data()?;
            match EmergencyFreezeRecord::try_deserialize(&mut &data[..]) {
                Ok(record) => record.is_active,
                Err(_) => false,
            }
        } else {
            false
        }
    };

    let result =
        validate_capability_internal(capability, &params, clock.unix_timestamp, agent_frozen);

    set_return_data(&result.to_bytes());

    if params.fail_on_invalid && !result.is_valid {
        return Err(error!(DelegationError::CapabilityNotActive));
    }

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

fn validate_capability_internal(
    capability: &Capability,
    params: &ValidateCapabilityParams,
    current_time: i64,
    agent_frozen: bool,
) -> ValidationResult {
    let mut flags: u64 = 0;

    if agent_frozen {
        return ValidationResult::err(ERR_AGENT_FROZEN);
    }

    match capability.status {
        CapabilityStatus::Active => {}
        CapabilityStatus::Revoked => return ValidationResult::err(ERR_CAPABILITY_INACTIVE),
        CapabilityStatus::Expired => return ValidationResult::err(ERR_CAPABILITY_EXPIRED),
        CapabilityStatus::Frozen => return ValidationResult::err(ERR_AGENT_FROZEN),
        CapabilityStatus::Disputed => return ValidationResult::err(ERR_CAPABILITY_DISPUTED),
    }

    if current_time < capability.valid_from {
        return ValidationResult::err(ERR_CAPABILITY_NOT_YET_VALID);
    }
    if current_time >= capability.expires_at {
        return ValidationResult::err(ERR_CAPABILITY_EXPIRED);
    }

    if params.check_cooldown && !capability.is_cooldown_passed(current_time) {
        // flags |= FLAG_IN_COOLDOWN; -- returned before read
        return ValidationResult::err(ERR_COOLDOWN_NOT_ELAPSED);
    }

    if params.program_scope != 0 && !capability.is_program_allowed(params.program_scope) {
        return ValidationResult::err(ERR_PROGRAM_NOT_ALLOWED);
    }

    if params.asset_scope != 0 && !capability.is_asset_allowed(params.asset_scope) {
        return ValidationResult::err(ERR_ASSET_NOT_ALLOWED);
    }

    if params.amount > capability.per_tx_limit {
        return ValidationResult::err(ERR_PER_TX_LIMIT_EXCEEDED);
    }

    let current_day = Capability::get_day_number(current_time);
    let effective_daily_spent = if current_day != capability.current_day {
        0
    } else {
        capability.daily_spent
    };

    let new_daily_spent = effective_daily_spent.saturating_add(params.amount);
    if new_daily_spent > capability.daily_limit {
        return ValidationResult::err(ERR_DAILY_LIMIT_EXCEEDED);
    }

    let new_total_spent = capability.total_spent.saturating_add(params.amount);
    if new_total_spent > capability.total_limit {
        return ValidationResult::err(ERR_TOTAL_LIMIT_EXCEEDED);
    }

    if capability.enforce_allowlist {
        flags |= FLAG_ALLOWLIST_ENFORCED;
        match params.destination {
            Some(destination) => {
                if !capability.is_destination_allowed(&destination) {
                    return ValidationResult::err(ERR_DESTINATION_NOT_ALLOWED);
                }
            }
            None => {
                return ValidationResult::err(ERR_DESTINATION_NOT_ALLOWED);
            }
        }
    }
    let remaining_daily = capability.daily_limit.saturating_sub(new_daily_spent);
    let remaining_total = capability.total_limit.saturating_sub(new_total_spent);

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

    /// Freeze record PDA — MANDATORY. Client must always pass the PDA at
    /// [b"freeze", principal, agent]. Seeds constraint verifies the address.
    /// If no freeze exists on-chain, the account will have no data (empty).
    /// CHECK: PDA address verified by seeds constraint. Data parsed manually.
    #[account(
        seeds = [b"freeze", capability.principal.as_ref(), capability.agent.as_ref()],
        bump,
    )]
    pub freeze_record: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidateCapabilityParams {
    pub version: u8,
    pub program_scope: u64,
    pub asset_scope: u64,
    pub amount: u64,
    pub destination: Option<Pubkey>,
    pub check_cooldown: bool,
    /// If true, return error on validation failure instead of Ok
    pub fail_on_invalid: bool,
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
            fail_on_invalid: false,
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
