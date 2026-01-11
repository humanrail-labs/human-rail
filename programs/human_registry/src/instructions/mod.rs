pub mod init_profile;
pub mod register_attestation;
pub mod assert_unique;
pub mod recompute_score;

// KYA v2 instructions
pub mod register_issuer;
pub mod issue_attestation;
pub mod revoke_attestation_v2;
pub mod verify_human;

pub use init_profile::*;
pub use register_attestation::*;
pub use assert_unique::*;
pub use recompute_score::*;

// KYA v2 exports
pub use register_issuer::*;
pub use issue_attestation::*;
pub use revoke_attestation_v2::*;
pub use verify_human::*;
