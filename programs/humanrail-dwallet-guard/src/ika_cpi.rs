//! Ika CPI integration via the official `ika-dwallet-anchor` crate.
//!
//! Re-exports the Anchor CPI SDK and provides HumanRail-specific helpers.
//! The hand-rolled `invoke_signed` placeholder has been removed.
//!
//! Official crate: https://github.com/dwallet-labs/ika-pre-alpha
//! Crate path: chains/solana/program-sdk/anchor

pub use ika_dwallet_anchor::{CPI_AUTHORITY_SEED, DWalletContext};

/// Ika devnet program ID.
pub const IKA_PROGRAM_ID: anchor_lang::prelude::Pubkey =
    anchor_lang::prelude::pubkey!("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");
