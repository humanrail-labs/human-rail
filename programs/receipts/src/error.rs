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
    #[msg("Agent ID does not match agent profile")]
    AgentMismatch,

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

    #[msg("Capability account must be provided when capability_id is set")]
    MissingCapabilityAccount,

    #[msg("Capability account key does not match capability_id")]
    CapabilityMismatch,

    #[msg("Capability account does not exist")]
    CapabilityNotFound,

    #[msg("Capability account not owned by delegation program")]
    InvalidCapabilityOwner,
}
