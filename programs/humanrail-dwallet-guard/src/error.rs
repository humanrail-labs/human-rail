use anchor_lang::prelude::*;

#[error_code]
pub enum GuardError {
    #[msg("Guarded dWallet is frozen")]
    Frozen = 1,
    #[msg("Guarded dWallet policy has expired")]
    Expired = 2,
    #[msg("Destination chain not allowed")]
    ChainNotAllowed = 3,
    #[msg("Asset not allowed")]
    AssetNotAllowed = 4,
    #[msg("Recipient not allowed")]
    RecipientNotAllowed = 5,
    #[msg("Invalid amount")]
    InvalidAmount = 6,
    #[msg("Per-transaction limit exceeded")]
    PerTxLimitExceeded = 7,
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded = 8,
    #[msg("Total limit exceeded")]
    TotalLimitExceeded = 9,
    #[msg("dWallet mismatch")]
    DwalletMismatch = 10,
    #[msg("Unauthorized principal or agent signer")]
    UnauthorizedPrincipal = 11,
    #[msg("Invalid limit configuration")]
    InvalidLimitConfig = 12,
    #[msg("Expiry must be in the future")]
    InvalidExpiry = 13,
    #[msg("Human profile owner mismatch")]
    InvalidHumanProfile = 14,
    #[msg("Agent owner mismatch")]
    InvalidAgent = 15,
    #[msg("Capability owner mismatch")]
    InvalidCapability = 16,
    #[msg("Ika CPI failed — replace with official ika-dwallet crate")]
    IkaCpiFailed = 17,
    #[msg("Invalid request — missing agent registry account for agent signer")]
    MissingAgentRegistryAccount = 18,
}
