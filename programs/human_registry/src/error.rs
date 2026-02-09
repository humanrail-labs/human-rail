use anchor_lang::prelude::*;

#[error_code]
pub enum HumanRegistryError {
    #[msg("Maximum number of attestations reached")]
    TooManyAttestations,
    #[msg("Profile wallet does not match authority")]
    WalletMismatch,
    #[msg("Profile bump missing from context")]
    MissingProfileBump,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Profile does not qualify as unique human")]
    NotUniqueHuman,
    #[msg("Invalid attestation")]
    InvalidAttestation,
    #[msg("Insufficient human score")]
    InsufficientHumanScore,
    #[msg("Legacy attestation path disabled - use issue_attestation with verified issuer")]
    LegacyPathDisabled,
}
