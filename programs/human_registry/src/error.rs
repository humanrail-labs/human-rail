use anchor_lang::prelude::*;

#[error_code]
pub enum HumanRegistryError {
    #[msg("Profile already exists for this wallet")]
    ProfileAlreadyExists,

    #[msg("Maximum attestations reached for this profile")]
    MaxAttestationsReached,

    #[msg("Attestation from this source already registered")]
    AttestationAlreadyRegistered,

    #[msg("Invalid attestation signature")]
    InvalidAttestationSignature,

    #[msg("Attestation payload hash mismatch")]
    PayloadHashMismatch,

    #[msg("Profile does not meet minimum human score requirement")]
    InsufficientHumanScore,

    #[msg("Profile is not marked as unique human")]
    NotUniqueHuman,

    #[msg("Attestation source not recognized")]
    UnrecognizedAttestationSource,

    #[msg("Registry is currently paused")]
    RegistryPaused,

    #[msg("Unauthorized operation")]
    Unauthorized,

    #[msg("Invalid attestation type")]
    InvalidAttestationType,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
