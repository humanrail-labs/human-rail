use anchor_lang::prelude::*;

#[error_code]
pub enum AgentRegistryError {
    #[msg("Agent is not active")]
    AgentNotActive,

    #[msg("Agent is already active")]
    AgentAlreadyActive,

    #[msg("Agent has been permanently revoked")]
    AgentRevoked,

    #[msg("Agent is suspended")]
    AgentSuspended,

    #[msg("Unauthorized: caller is not the agent owner")]
    Unauthorized,

    #[msg("Invalid signing key")]
    InvalidSigningKey,

    #[msg("Key rotation still in grace period")]
    KeyRotationInProgress,

    #[msg("Agent name too long (max 32 bytes)")]
    NameTooLong,

    #[msg("Invalid metadata hash")]
    InvalidMetadataHash,

    #[msg("Principal does not have a valid human profile")]
    InvalidPrincipal,

    #[msg("Principal human score too low to register agent")]
    InsufficientHumanScore,
    #[msg("Profile not authorized to register agents")]
    AgentRegistrationNotAllowed,

    #[msg("Agent already exists with this nonce")]
    AgentAlreadyExists,

    #[msg("Cannot revoke agent with active capabilities")]
    HasActiveCapabilities,

    #[msg("Invalid TEE measurement")]
    InvalidTeeMeasurement,
}
