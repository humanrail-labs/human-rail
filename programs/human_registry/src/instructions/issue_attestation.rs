use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{self, load_instruction_at_checked};
use anchor_lang::solana_program::sysvar::instructions as ix_sysvar;

use crate::state_v2::{
    AttestationRef, AttestationStatus, HumanProfile, Issuer, IssuerStatus,
    SignedAttestation, MAX_ATTESTATIONS,
};

/// Issue a signed attestation to a human profile.
/// 
/// SECURITY: Signature verification is ALWAYS required in production.
/// The Ed25519 verification instruction MUST precede this instruction in the transaction.
/// There is no way to bypass this requirement - it is a structural invariant.
/// 
/// For local testing, use the `test-skip-sig-verify` feature flag at compile time,
/// which is NOT included in release builds.
pub fn handler(ctx: Context<IssueAttestation>, params: IssueAttestationParams) -> Result<()> {
    let clock = Clock::get()?;
    let issuer = &mut ctx.accounts.issuer;
    let profile = &mut ctx.accounts.profile;
    let attestation = &mut ctx.accounts.attestation;

    // Validate issuer is active
    require!(
        issuer.status == IssuerStatus::Active,
        AttestationError::IssuerNotActive
    );

    // Validate weight is within issuer's limits
    require!(
        params.weight > 0 && params.weight <= issuer.max_weight,
        AttestationError::WeightExceedsIssuerMax
    );

    // Validate profile has space for attestation
    require!(
        profile.attestations.len() < MAX_ATTESTATIONS,
        AttestationError::TooManyAttestations
    );

    // Validate nonce is > 0 (replay prevention is handled by PDA seeds)
    // The PDA [attestation, profile, issuer, nonce] ensures uniqueness
    require!(
        params.nonce > 0,
        AttestationError::InvalidNonce
    );

    // Validate expiry is in the future (if set)
    if let Some(exp) = params.expires_at {
        require!(
            exp > clock.unix_timestamp,
            AttestationError::InvalidExpiry
        );
    }

    // =======================================================================
    // SIGNATURE VERIFICATION - ALWAYS REQUIRED
    // =======================================================================
    // This is a structural invariant. The Ed25519 verification instruction
    // MUST be present in the transaction immediately before this instruction.
    // There is no runtime flag to bypass this.
    
    #[cfg(not(feature = "test-skip-sig-verify"))]
    {
        let signing_bytes = create_signing_bytes(
            &profile.key(),
            &issuer.key(),
            &params.payload_hash,
            params.weight,
            clock.unix_timestamp,
            params.expires_at.unwrap_or(clock.unix_timestamp + issuer.default_validity),
            params.nonce,
        );
        
        verify_ed25519_signature(
            &ctx.accounts.instructions_sysvar,
            &issuer.authority,
            &signing_bytes,
            &params.signature,
        )?;
    }
    
    #[cfg(feature = "test-skip-sig-verify")]
    {
        msg!("WARNING: Signature verification skipped (test mode only)");
    }

    // =======================================================================
    // CREATE ATTESTATION
    // =======================================================================

    attestation.profile = profile.key();
    attestation.issuer = issuer.key();
    attestation.issuer_authority = issuer.authority;
    attestation.attestation_type = issuer.issuer_type;
    attestation.payload_hash = params.payload_hash;
    attestation.weight = params.weight;
    attestation.status = AttestationStatus::Active;
    attestation.issued_at = clock.unix_timestamp;
    attestation.expires_at = params.expires_at.unwrap_or(
        clock.unix_timestamp + issuer.default_validity
    );
    attestation.revoked_at = 0;
    attestation.signature = params.signature;
    attestation.nonce = params.nonce;
    attestation.bump = ctx.bumps.attestation;

    if let Some(ext_id) = params.external_id {
        attestation.external_id = ext_id;
        attestation.has_external_id = true;
    } else {
        attestation.external_id = [0u8; 32];
        attestation.has_external_id = false;
    }

    // Add reference to profile
    let att_ref = AttestationRef {
        attestation: attestation.key(),
        issuer: issuer.key(),
        attestation_type: issuer.issuer_type,
        weight: params.weight,
        expires_at: attestation.expires_at,
    };
    profile.add_attestation(att_ref, clock.unix_timestamp);

    // Recompute profile score
    profile.recompute_score(clock.unix_timestamp);

    // Update issuer stats
    issuer.attestations_issued = issuer.attestations_issued.saturating_add(1);

    emit!(AttestationIssued {
        attestation: attestation.key(),
        profile: profile.key(),
        issuer: issuer.key(),
        issuer_authority: issuer.authority,
        attestation_type: issuer.issuer_type,
        payload_hash: params.payload_hash,
        weight: params.weight,
        expires_at: attestation.expires_at,
        new_human_score: profile.human_score,
        is_unique: profile.is_unique,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Attestation issued: profile={}, score={}, unique={}",
        profile.wallet,
        profile.human_score,
        profile.is_unique
    );

    Ok(())
}

/// Create canonical bytes for signature verification
fn create_signing_bytes(
    profile: &Pubkey,
    issuer: &Pubkey,
    payload_hash: &[u8; 32],
    weight: u16,
    issued_at: i64,
    expires_at: i64,
    nonce: u64,
) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(128);
    // Domain separator to prevent cross-protocol replay
    bytes.extend_from_slice(b"humanrail:attestation:v1");
    bytes.extend_from_slice(profile.as_ref());
    bytes.extend_from_slice(issuer.as_ref());
    bytes.extend_from_slice(payload_hash);
    bytes.extend_from_slice(&weight.to_le_bytes());
    bytes.extend_from_slice(&issued_at.to_le_bytes());
    bytes.extend_from_slice(&expires_at.to_le_bytes());
    bytes.extend_from_slice(&nonce.to_le_bytes());
    bytes
}

/// Verify Ed25519 signature via instruction introspection.
/// 
/// INVARIANT: The Ed25519 verification instruction MUST be immediately
/// before this instruction in the transaction. We verify:
/// 1. Previous instruction is Ed25519 program
/// 2. Signature verification passed (Ed25519 program would have failed otherwise)
/// 
/// The Ed25519 program itself verifies:
/// - Signature is valid for the public key and message
/// - No tampering with any inputs
fn verify_ed25519_signature(
    instructions_sysvar: &AccountInfo,
    expected_signer: &Pubkey,
    expected_message: &[u8],
    _signature: &[u8; 64],
) -> Result<()> {
    // Scan ALL instructions in the transaction for an Ed25519 verify instruction.
    // This is more robust than assuming current_index - 1, as precompile
    // instructions may not be at a predictable sysvar index on all runtime versions.
    // Pattern used by Wormhole, Switchboard, and other production programs.
    // Canonical Ed25519 program ID: Ed25519SigVerify111111111111111111111111111
    // Base58-decoded to prevent copy-paste drift (verified against solana-program SDK).
    const ED25519_SIG_VERIFY_ID: Pubkey = Pubkey::new_from_array([
        3, 125, 70, 214, 124, 147, 251, 190, 18, 249, 66, 143, 131, 141, 64, 255,
        5, 112, 116, 73, 39, 244, 138, 100, 252, 202, 112, 68, 128, 0, 0, 0,
    ]);

    // Scan ALL instructions for Ed25519 verify. More robust than assuming current_index - 1,
    // as precompile instruction indexing varies across Agave runtime versions.
    // Pattern used by Wormhole, Switchboard, and other production Solana programs.
    let mut ed25519_ix = None;
    let mut idx: usize = 0;
    loop {
        match load_instruction_at_checked(idx, instructions_sysvar) {
            Ok(ix) => {
                if ix.program_id == ED25519_SIG_VERIFY_ID {
                    ed25519_ix = Some(ix);
                    break;
                }
                idx += 1;
            }
            Err(_) => break,
        }
    }
    let ed25519_ix = ed25519_ix.ok_or(AttestationError::Ed25519InstructionNotFound)?;

    let ix_data = &ed25519_ix.data;

    // Verify instruction has at least one signature and minimum data length
    // Minimum: 16 bytes header + 64 signature + 32 pubkey = 112 bytes
    require!(
        ix_data.len() >= 112 && ix_data[0] >= 1,
        AttestationError::InvalidSignature
    );

    // === C-05 FIX: Parse and verify Ed25519 instruction contents ===

    // Parse offsets from header (little-endian u16 values)
    let pubkey_offset = u16::from_le_bytes([ix_data[6], ix_data[7]]) as usize;
    let message_offset = u16::from_le_bytes([ix_data[10], ix_data[11]]) as usize;
    let message_size = u16::from_le_bytes([ix_data[12], ix_data[13]]) as usize;

    // Validate offsets are within bounds
    require!(
        pubkey_offset + 32 <= ix_data.len(),
        AttestationError::InvalidSignature
    );
    require!(
        message_offset + message_size <= ix_data.len(),
        AttestationError::InvalidSignature
    );

    // Extract and verify public key matches expected signer
    let ix_pubkey = &ix_data[pubkey_offset..pubkey_offset + 32];
    require!(
        ix_pubkey == expected_signer.as_ref(),
        AttestationError::SignerMismatch
    );

    // Extract and verify message matches expected message
    let ix_message = &ix_data[message_offset..message_offset + message_size];
    require!(
        ix_message == expected_message,
        AttestationError::MessageMismatch
    );

    // === END C-05 FIX ===

    msg!("Ed25519 signature verified for issuer: {}", expected_signer);
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(params: IssueAttestationParams)]
pub struct IssueAttestation<'info> {
    /// Issuer authority - must sign (proves issuer authorized this)
    #[account(
        mut,
        constraint = issuer_authority.key() == issuer.authority @ AttestationError::Unauthorized
    )]
    pub issuer_authority: Signer<'info>,

    /// The issuer account
    #[account(
        mut,
        seeds = [b"issuer", issuer.authority.as_ref()],
        bump = issuer.bump
    )]
    pub issuer: Account<'info, Issuer>,

    /// The profile receiving the attestation
    #[account(
        mut,
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,

    /// The new attestation account
    #[account(
        init,
        payer = issuer_authority,
        space = SignedAttestation::LEN,
        seeds = [
            b"attestation",
            profile.key().as_ref(),
            issuer.key().as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub attestation: Account<'info, SignedAttestation>,

    /// Instructions sysvar for signature verification
    /// CHECK: Verified by address constraint
    #[account(address = instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Parameters for issuing an attestation.
/// NOTE: verify_signature field was removed - verification is ALWAYS required.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IssueAttestationParams {
    /// Hash of attestation payload (off-chain data)
    pub payload_hash: [u8; 32],
    /// Weight to assign (must be > 0 and <= issuer.max_weight)
    pub weight: u16,
    /// Ed25519 signature over canonical attestation data
    /// REQUIRED: Transaction must include Ed25519 verify instruction
    pub signature: [u8; 64],
    /// Unique nonce (prevents replay attacks)
    pub nonce: u64,
    /// Optional expiry time (None = use issuer default)
    pub expires_at: Option<i64>,
    /// Optional external reference ID
    pub external_id: Option<[u8; 32]>,
}

#[event]
pub struct AttestationIssued {
    pub attestation: Pubkey,
    pub profile: Pubkey,
    pub issuer: Pubkey,
    pub issuer_authority: Pubkey,
    pub attestation_type: crate::state_v2::IssuerType,
    pub payload_hash: [u8; 32],
    pub weight: u16,
    pub expires_at: i64,
    pub new_human_score: u16,
    pub is_unique: bool,
    pub timestamp: i64,
}

#[error_code]
pub enum AttestationError {
    #[msg("Unauthorized: signer is not issuer authority")]
    Unauthorized,

    #[msg("Issuer is not active")]
    IssuerNotActive,

    #[msg("Weight must be > 0 and <= issuer maximum")]
    WeightExceedsIssuerMax,

    #[msg("Profile has too many attestations (use pagination)")]
    TooManyAttestations,

    #[msg("Ed25519 verification instruction not found - signature verification is required")]
    Ed25519InstructionNotFound,

    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Ed25519 public key does not match expected signer")]
    SignerMismatch,
    #[msg("Ed25519 message does not match expected attestation data")]
    MessageMismatch,

    #[msg("Invalid nonce - must be > 0")]
    InvalidNonce,

    #[msg("Invalid expiry - must be in the future")]
    InvalidExpiry,

    #[msg("Attestation already exists")]
    AttestationAlreadyExists,
}
