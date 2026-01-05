use anchor_lang::prelude::*;

#[error_code]
pub enum DataBlinkError {
    #[msg("Task is not open for responses")]
    TaskNotOpen,

    #[msg("Task has been closed")]
    TaskClosed,

    #[msg("Task has reached maximum responses")]
    MaxResponsesReached,

    #[msg("Worker does not meet minimum human score requirement")]
    InsufficientHumanScore,

    #[msg("Worker has already responded to this task")]
    AlreadyResponded,

    #[msg("Task budget is exhausted")]
    BudgetExhausted,

    #[msg("Invalid reward mint for this task")]
    InvalidMint,

    #[msg("Only the task creator can perform this operation")]
    UnauthorizedCreator,

    #[msg("Only the response worker can perform this operation")]
    UnauthorizedWorker,

    #[msg("Reward already claimed")]
    RewardAlreadyClaimed,

    #[msg("No reward available to claim")]
    NoRewardAvailable,

    #[msg("Metadata URI too long")]
    MetadataUriTooLong,

    #[msg("Invalid task parameters")]
    InvalidTaskParams,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Human profile not found for worker")]
    HumanProfileNotFound,

    #[msg("Invalid choice value")]
    InvalidChoice,

    #[msg("Task and response do not match")]
    TaskResponseMismatch,

    #[msg("Invalid vault account for this task")]
    InvalidVault,
}
