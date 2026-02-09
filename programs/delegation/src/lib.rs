use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT");

#[program]
pub mod delegation {
    use super::*;

    /// Issue a capability credential to an agent.
    /// Principal defines scope, limits, time constraints, and allowlists.
    pub fn issue_capability(
        ctx: Context<IssueCapability>,
        params: IssueCapabilityParams,
    ) -> Result<()> {
        instructions::issue_capability::handler(ctx, params)
    }

    /// Revoke a specific capability. Principal-initiated.
    pub fn revoke_capability(ctx: Context<RevokeCapability>) -> Result<()> {
        instructions::revoke_capability::handler(ctx)
    }

    /// Emergency freeze all capabilities for an agent. Principal-initiated.
    pub fn emergency_freeze(ctx: Context<EmergencyFreeze>) -> Result<()> {
        instructions::emergency_freeze::handler(ctx)
    }

    /// Unfreeze capabilities after emergency freeze. Principal-initiated.
    pub fn unfreeze(ctx: Context<Unfreeze>) -> Result<()> {
        instructions::unfreeze::handler(ctx)
    }

    /// Validate a capability before action execution.
    /// Designed for CPI calls from other programs.
    /// Returns error if capability is invalid, revoked, expired, or limits exceeded.
    pub fn validate_capability(
        ctx: Context<ValidateCapability>,
        action_type: u8,
        action_value: u64,
        destination: Pubkey,
    ) -> Result<()> {
        let params = ValidateCapabilityParams {
            version: 1,
            program_scope: action_type as u64,
            asset_scope: 0,
            amount: action_value,
            destination: Some(destination),
            check_cooldown: true,
            fail_on_invalid: true,
        };
        instructions::validate_capability::handler(ctx, params)
    }

    /// Record capability usage after successful action.
    /// Updates spend tracking and cooldowns.
    pub fn record_usage(ctx: Context<RecordUsage>, amount_used: u64) -> Result<()> {
        instructions::record_usage::handler(ctx, amount_used)
    }

    /// Record capability usage via CPI from authorized programs.
    /// Validates agent_signer matches agent_profile.signing_key.
    pub fn record_usage_cpi(ctx: Context<RecordUsageCpi>, amount_used: u64) -> Result<()> {
        instructions::record_usage_cpi::handler(ctx, amount_used)
    }

    /// Flag a capability for dispute review.
    pub fn flag_dispute(ctx: Context<FlagDispute>, reason: [u8; 32]) -> Result<()> {
        instructions::flag_dispute::handler(ctx, reason)
    }

    /// Resolve a dispute flag. Principal-initiated.
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        resolution: DisputeResolution,
    ) -> Result<()> {
        instructions::resolve_dispute::handler(ctx, resolution)
    }
}

/// Parameters for issuing a capability credential
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IssueCapabilityParams {
    /// Scope: which programs this capability allows (bitmask)
    pub allowed_programs: u64,
    /// Scope: which asset types are allowed (bitmask)
    pub allowed_assets: u64,
    /// Per-transaction value limit (in lamports or token base units)
    pub per_tx_limit: u64,
    /// Daily spending limit
    pub daily_limit: u64,
    /// Total lifetime limit for this capability
    pub total_limit: u64,
    /// Maximum slippage allowed (basis points, 0-10000)
    pub max_slippage_bps: u16,
    /// Maximum fee allowed per transaction (lamports)
    pub max_fee: u64,
    /// Capability validity start time
    pub valid_from: i64,
    /// Capability expiry time
    pub expires_at: i64,
    /// Cooldown between uses (seconds)
    pub cooldown_seconds: u32,
    /// Destination allowlist (empty = any destination allowed)
    pub destination_allowlist: Vec<Pubkey>,
    /// Risk tier required (0-255, higher = more restricted)
    pub risk_tier: u8,
    /// Unique nonce for PDA derivation
    pub nonce: u64,
}

/// Dispute resolution options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeResolution {
    /// Dispute resolved in favor of agent - capability remains active
    Cleared,
    /// Dispute upheld - capability revoked
    Revoked,
    /// Dispute requires capability modification
    Modified,
}
