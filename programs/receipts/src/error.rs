use anchor_lang::prelude::*;

#[error_code]
pub enum ReceiptsError {
    #[msg("Invalid receipt data")]
    InvalidReceiptData,

    #[msg("Receipt already exists")]
    ReceiptAlreadyExists,

    #[msg("Receipt not found")]
    ReceiptNotFound,

    #[msg("Unauthorized emitter")]
    UnauthorizedEmitter,

    #[msg("Invalid action hash")]
    InvalidActionHash,

    #[msg("Invalid result hash")]
    InvalidResultHash,

    #[msg("Batch too large")]
    BatchTooLarge,

    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,

    #[msg("Offchain reference too long")]
    OffchainRefTooLong,

    #[msg("Invalid capability reference")]
    InvalidCapabilityRef,

    #[msg("Invalid agent reference")]
    InvalidAgentRef,

    #[msg("Invalid principal reference")]
    InvalidPrincipalRef,
}
