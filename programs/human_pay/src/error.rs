use anchor_lang::prelude::*;

#[error_code]
pub enum HumanPayError {
    #[msg("Invoice is not open")]
    InvoiceNotOpen,
    #[msg("Invoice has expired")]
    InvoiceExpired,
    #[msg("Incorrect payment amount")]
    IncorrectAmount,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Capability is not active")]
    CapabilityNotActive,
    #[msg("Capability agent mismatch")]
    CapabilityAgentMismatch,
    #[msg("Principal mismatch")]
    PrincipalMismatch,
    #[msg("Capability not yet valid")]
    CapabilityNotYetValid,
    #[msg("Capability expired")]
    CapabilityExpired,
    #[msg("Program not allowed")]
    ProgramNotAllowed,
    #[msg("Asset not allowed")]
    AssetNotAllowed,
    #[msg("Per-transaction limit exceeded")]
    PerTxLimitExceeded,
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded,
    #[msg("Total limit exceeded")]
    TotalLimitExceeded,
    #[msg("Destination not allowed")]
    DestinationNotAllowed,
    #[msg("Agent signer mismatch")]
    AgentSignerMismatch,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Unauthorized merchant")]
    UnauthorizedMerchant,
    #[msg("Invalid invoice state")]
    InvalidInvoiceState,
    #[msg("Confidential transfer not enabled")]
    ConfidentialTransferNotEnabled,
    #[msg("Invalid expiration")]
    InvalidExpiration,
    #[msg("Insufficient human score")]
    InsufficientHumanScore,
}
