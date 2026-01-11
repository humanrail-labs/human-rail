use anchor_lang::prelude::*;

#[error_code]
pub enum DelegationError {
    #[msg("Capability is not active")]
    CapabilityNotActive,

    #[msg("Capability has been revoked")]
    CapabilityRevoked,

    #[msg("Capability has expired")]
    CapabilityExpired,

    #[msg("Capability is frozen")]
    CapabilityFrozen,

    #[msg("Capability is under dispute")]
    CapabilityDisputed,

    #[msg("Capability not yet valid")]
    CapabilityNotYetValid,

    #[msg("Per-transaction limit exceeded")]
    PerTxLimitExceeded,

    #[msg("Daily spending limit exceeded")]
    DailyLimitExceeded,

    #[msg("Total lifetime limit exceeded")]
    TotalLimitExceeded,

    #[msg("Cooldown period not elapsed")]
    CooldownNotElapsed,

    #[msg("Destination not in allowlist")]
    DestinationNotAllowed,

    #[msg("Program not allowed by capability")]
    ProgramNotAllowed,

    #[msg("Asset type not allowed by capability")]
    AssetNotAllowed,

    #[msg("Slippage exceeds maximum allowed")]
    SlippageExceeded,

    #[msg("Fee exceeds maximum allowed")]
    FeeExceeded,

    #[msg("Unauthorized: caller is not the principal")]
    Unauthorized,

    #[msg("Agent is not owner of this capability")]
    AgentMismatch,

    #[msg("Invalid expiry time")]
    InvalidExpiry,

    #[msg("Invalid limits configuration")]
    InvalidLimits,

    #[msg("Too many destinations in allowlist")]
    TooManyDestinations,

    #[msg("Agent is frozen - all capabilities suspended")]
    AgentFrozen,

    #[msg("Agent is not frozen")]
    AgentNotFrozen,

    #[msg("Capability already disputed")]
    AlreadyDisputed,

    #[msg("Capability not disputed")]
    NotDisputed,

    #[msg("Risk tier too high for this operation")]
    RiskTierExceeded,
}
