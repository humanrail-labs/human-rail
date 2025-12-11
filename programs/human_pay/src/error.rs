use anchor_lang::prelude::*;

#[error_code]
pub enum HumanPayError {
    #[msg("Invoice has already been paid")]
    InvoiceAlreadyPaid,

    #[msg("Invoice has been cancelled")]
    InvoiceCancelled,

    #[msg("Invoice has expired")]
    InvoiceExpired,

    #[msg("Invoice is not in the correct state for this operation")]
    InvalidInvoiceState,

    #[msg("Payer does not meet minimum human score requirement")]
    InsufficientHumanScore,

    #[msg("Invalid mint for this invoice")]
    InvalidMint,

    #[msg("Insufficient balance for payment")]
    InsufficientBalance,

    #[msg("Only the merchant can perform this operation")]
    UnauthorizedMerchant,

    #[msg("Only the payer can perform this operation")]
    UnauthorizedPayer,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid expiration time")]
    InvalidExpiration,

    #[msg("Confidential transfer not yet enabled")]
    ConfidentialTransferNotEnabled,

    #[msg("Human profile not found for payer")]
    HumanProfileNotFound,
}
