use anchor_lang::prelude::*;

#[error_code]
pub enum HumanRegistryError {
    #[msg("Maximum number of attestations reached")]
    TooManyAttestations,

    #[msg("Profile wallet does not match authority")]
    WalletMismatch,

    #[msg("Profile bump missing from context")]
    MissingProfileBump,
}
