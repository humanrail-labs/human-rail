use anchor_lang::prelude::*;

#[error_code]
pub enum DocumentRegistryError {
    // Document errors
    #[msg("Document already exists with this hash")]
    DocumentAlreadyExists,

    #[msg("Document not found")]
    DocumentNotFound,

    #[msg("Document has been voided and cannot be signed")]
    DocumentVoided,

    #[msg("Document is not finalized - cannot be signed with binding effect")]
    DocumentNotFinalized,

    #[msg("Document is already finalized")]
    DocumentAlreadyFinalized,

    #[msg("Document is already voided")]
    DocumentAlreadyVoided,

    #[msg("Only document creator can perform this action")]
    NotDocumentCreator,

    #[msg("Invalid document hash")]
    InvalidDocumentHash,

    #[msg("Invalid document schema")]
    InvalidSchema,

    #[msg("Document URI too long")]
    UriTooLong,

    // Signature errors
    #[msg("Signature already exists for this signer and role")]
    SignatureAlreadyExists,

    #[msg("Signature not found")]
    SignatureNotFound,

    #[msg("Signature has already been revoked")]
    SignatureAlreadyRevoked,

    #[msg("Only the original signer can revoke this signature")]
    NotSignatureOwner,

    #[msg("Invalid signature role")]
    InvalidRole,

    #[msg("Signature metadata too long")]
    MetadataTooLong,

    // Verification errors
    #[msg("Signer does not have a valid human profile")]
    NoHumanProfile,

    #[msg("Human score too low for verified signing")]
    InsufficientHumanScore,

    #[msg("Signer is not a verified unique human")]
    NotVerifiedHuman,

    #[msg("Agent is not registered or not active")]
    InvalidAgent,

    #[msg("Agent does not have signing capability for this document type")]
    NoSigningCapability,

    #[msg("Capability has expired")]
    CapabilityExpired,

    #[msg("Capability has been revoked")]
    CapabilityRevoked,

    #[msg("Capability daily limit exceeded")]
    CapabilityLimitExceeded,

    #[msg("Agent is frozen - cannot sign")]
    AgentFrozen,

    #[msg("Principal mismatch - agent not owned by this principal")]
    PrincipalMismatch,

    #[msg("Capability not yet valid")]
    CapabilityNotYetValid,

    #[msg("Capability agent mismatch")]
    CapabilityAgentMismatch,

    #[msg("Agent signer does not match agent signing key")]
    AgentSignerMismatch,

    // Offchain signature errors
    #[msg("Invalid Ed25519 signature")]
    InvalidEd25519Signature,

    #[msg("Ed25519 verification instruction not found")]
    Ed25519InstructionNotFound,

    #[msg("Signature message has expired")]
    SignatureExpired,

    #[msg("Invalid signature nonce - possible replay attack")]
    InvalidNonce,

    #[msg("Invalid domain in signature message")]
    InvalidDomain,

    #[msg("Message too long for offchain signing")]
    MessageTooLong,

    #[msg("Signer pubkey does not match signature")]
    SignerMismatch,

    // Required signer errors
    #[msg("Maximum required signers exceeded")]
    TooManyRequiredSigners,

    #[msg("Required signer already added")]
    RequiredSignerAlreadyExists,

    #[msg("Document is missing required signatures")]
    MissingRequiredSignatures,

    #[msg("Signature tier too low for requirement")]
    InsufficientSignatureTier,

    #[msg("Specific signer required but different signer attempted")]
    WrongSigner,

    // General errors
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid account data")]
    InvalidAccountData,

    #[msg("Invalid human profile account")]
    InvalidHumanProfile,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
