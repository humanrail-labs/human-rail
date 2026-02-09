#![allow(ambiguous_glob_reexports)]
pub mod assert_unique;
pub mod init_profile;
pub mod init_registry;
pub mod recompute_score;
pub mod register_attestation;

// KYA v2 instructions
pub mod issue_attestation;
pub mod register_issuer;
pub mod revoke_attestation_v2;
pub mod verify_human;

pub use assert_unique::*;
pub use init_profile::*;
pub use init_registry::*;
pub use recompute_score::*;
pub use register_attestation::*;

// KYA v2 exports
pub use issue_attestation::*;
pub use register_issuer::*;
pub use revoke_attestation_v2::*;
pub use verify_human::*;
