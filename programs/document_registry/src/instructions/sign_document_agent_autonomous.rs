use anchor_lang::prelude::*;

use crate::{
    error::DocumentRegistryError,
    state::{
        Document, DocumentSigningReceipt, SignatureMode, SignatureRecord,
        SignatureStatus, SignerType, MAX_IDENTIFIER_LEN,
    },
    SignDocumentAgentParams, SignatureTier,
};

/// Program scope bit for document signing
pub const PROGRAM_SCOPE_DOCUMENT_SIGN: u64 = 1 << 7;

/// Tier 2 Autonomous: Agent Signs Document Independently
/// Key difference from sign_document_agent:
/// - The AGENT signs the transaction (not the principal)
/// - True autonomous execution within delegated constraints
/// - Principal must have pre-funded the agent or set up fee sponsorship
pub fn handler(
    ctx: Context<SignDocumentAgentAutonomous>,
    params: SignDocumentAgentParams,
) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;
    let agent = &ctx.accounts.agent_profile;
    let capability = &ctx.accounts.capability;

    // Validate document can be signed
    require!(
        document.can_be_signed(),
        DocumentRegistryError::DocumentVoided
    );

    // Validate role is not empty
    require!(
        params.role != [0u8; MAX_IDENTIFIER_LEN],
        DocumentRegistryError::InvalidRole
    );

    // === AGENT VALIDATION ===

    // Validate agent is active
    require!(
        agent.status == AgentStatus::Active,
        DocumentRegistryError::InvalidAgent
    );

    // Validate agent signer matches agent's signing key
    require!(
        ctx.accounts.agent_signer.key() == agent.signing_key,
        DocumentRegistryError::AgentSignerMismatch
    );

    // === CAPABILITY VALIDATION ===

    // Validate capability is active
    require!(
        capability.status == CapabilityStatus::Active,
        DocumentRegistryError::CapabilityRevoked
    );

    // Validate time bounds
    require!(
        clock.unix_timestamp >= capability.valid_from,
        DocumentRegistryError::CapabilityNotYetValid
    );
    require!(
        clock.unix_timestamp < capability.expires_at,
        DocumentRegistryError::CapabilityExpired
    );

    // Validate capability allows document signing
    require!(
        capability.allowed_programs & PROGRAM_SCOPE_DOCUMENT_SIGN != 0,
        DocumentRegistryError::NoSigningCapability
    );

    // Validate capability belongs to this agent
    require!(
        capability.agent == agent.key(),
        DocumentRegistryError::CapabilityAgentMismatch
    );

    // Validate agent ownership
    require!(
        agent.owner_principal == capability.principal,
        DocumentRegistryError::PrincipalMismatch
    );

    // === CREATE SIGNATURE RECORD ===

    let signature = &mut ctx.accounts.signature_record;
    signature.document = document.key();
    signature.signer_type = SignerType::Agent;
    signature.signer_pubkey = agent.key();
    signature.principal_pubkey = capability.principal;
    signature.has_principal = true;
    signature.capability_id = capability.key();
    signature.has_capability = true;
    signature.attestation_id = Pubkey::default();
    signature.has_attestation = false;
    signature.signature_mode = SignatureMode::TxApproval;
    signature.signature_bytes = [0u8; 64];
    signature.has_signature_bytes = false;
    signature.role = params.role;
    signature.tier = SignatureTier::AgentOnBehalf;
    signature.status = SignatureStatus::Active;
    signature.signed_at_slot = clock.slot;
    signature.signed_at_ts = clock.unix_timestamp;
    signature.revoked_at_slot = 0;
    signature.revoked_at_ts = 0;
    signature.human_score_at_signing = 0;
    signature.bump = ctx.bumps.signature_record;

    // Handle optional metadata
    if params.has_metadata {
        signature.metadata = params.signature_metadata;
        signature.has_metadata = true;
    } else {
        signature.metadata = [0u8; 64];
        signature.has_metadata = false;
    }

    // Update document signature count
    document.signature_count = document.signature_count.saturating_add(1);

    // === CREATE RECEIPT (KYA Accountability) ===

    let receipt = &mut ctx.accounts.signing_receipt;
    receipt.document = document.key();
    receipt.signature_record = signature.key();
    receipt.principal = capability.principal;
    receipt.agent = agent.key();
    receipt.is_agent_signature = true;
    receipt.capability = capability.key();
    receipt.doc_hash = document.doc_hash;
    receipt.role = params.role;
    receipt.tier = SignatureTier::AgentOnBehalf;
    receipt.slot = clock.slot;
    receipt.timestamp = clock.unix_timestamp;
    receipt.bump = ctx.bumps.signing_receipt;

    // === EMIT EVENT ===

    emit!(AgentAutonomousDocumentSigned {
        document: document.key(),
        signature_record: signature.key(),
        principal: capability.principal,
        agent: agent.key(),
        agent_signer: ctx.accounts.agent_signer.key(),
        capability: capability.key(),
        role: params.role,
        capability_expires_at: capability.expires_at,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document signed autonomously by agent: agent={}, principal={}, doc={:?}",
        agent.key(),
        capability.principal,
        &document.doc_hash[..8]
    );

    Ok(())
}

// =============================================================================
// H-03 WARNING: CPI Deserialization Mirrors
// These enums/structs MUST match `humanrail-common` exactly. Do not modify
// without updating common crate + regenerating. See scripts/check-enum-drift.sh
// =============================================================================
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum AgentStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum CapabilityStatus {
    #[default]
    Active,
    Revoked,
    Expired,
    Frozen,
    Disputed,
}

#[account]
pub struct AgentProfileRef {
    pub owner_principal: Pubkey,
    pub signing_key: Pubkey,
    pub name: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub tee_measurement: [u8; 32],
    pub has_tee_measurement: bool,
    pub status: AgentStatus,
    pub created_at: i64,
    pub last_status_change: i64,
    pub last_metadata_update: i64,
    pub capability_count: u32,
    pub action_count: u64,
    pub nonce: u64,
    pub bump: u8,
}

#[account]
pub struct CapabilityRef {
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub allowed_programs: u64,
    pub allowed_assets: u64,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub total_limit: u64,
    pub max_slippage_bps: u16,
    pub max_fee: u64,
    pub valid_from: i64,
    pub expires_at: i64,
    pub cooldown_seconds: u32,
    pub risk_tier: u8,
    pub status: CapabilityStatus,
    pub issued_at: i64,
    pub last_used_at: i64,
    pub daily_spent: u64,
    pub current_day: u32,
    pub total_spent: u64,
    pub use_count: u64,
    pub enforce_allowlist: bool,
    pub allowlist_count: u8,
    pub destination_allowlist: [Pubkey; 10],
    pub dispute_reason: [u8; 32],
    pub nonce: u64,
    pub bump: u8,
}

pub const AGENT_REGISTRY_PROGRAM_ID: Pubkey = Pubkey::new_from_array([16, 242, 38, 172, 134, 212, 93, 62, 60, 19, 124, 238, 6, 252, 198, 86, 90, 208, 23, 56, 212, 27, 13, 107, 111, 36, 94, 57, 224, 218, 83, 191]); // 

pub const DELEGATION_PROGRAM_ID: Pubkey = Pubkey::new_from_array([90, 39, 137, 90, 211, 26, 26, 242, 139, 142, 236, 12, 205, 98, 95, 110, 6, 242, 2, 231, 78, 55, 143, 76, 223, 233, 245, 31, 165, 94, 130, 63]); // 

#[derive(Accounts)]
#[instruction(params: SignDocumentAgentParams)]
pub struct SignDocumentAgentAutonomous<'info> {
    /// The agent's signing key - AGENT SIGNS (true autonomy)
    #[account(mut)]
    pub agent_signer: Signer<'info>,

    /// The agent profile
    #[account(
        seeds = [
            b"agent",
            agent_profile.owner_principal.as_ref(),
            &agent_profile.nonce.to_le_bytes()
        ],
        bump = agent_profile.bump,
        seeds::program = AGENT_REGISTRY_PROGRAM_ID
    )]
    pub agent_profile: Box<Account<'info, AgentProfileRef>>,

    /// The capability credential
    #[account(
        seeds = [
            b"capability",
            capability.principal.as_ref(),
            agent_profile.key().as_ref(),
            &params.capability_nonce.to_le_bytes()
        ],
        bump = capability.bump,
        seeds::program = DELEGATION_PROGRAM_ID
    )]
    pub capability: Box<Account<'info, CapabilityRef>>,

    /// The document being signed
    #[account(
        mut,
        seeds = [b"document", document.doc_hash.as_ref()],
        bump = document.bump
    )]
    pub document: Account<'info, Document>,

    /// The signature record PDA
    #[account(
        init,
        payer = agent_signer,
        space = SignatureRecord::LEN,
        seeds = [
            b"signature",
            document.key().as_ref(),
            agent_profile.key().as_ref(),
            params.role.as_ref()
        ],
        bump
    )]
    pub signature_record: Account<'info, SignatureRecord>,

    /// Receipt for audit trail
    #[account(
        init,
        payer = agent_signer,
        space = DocumentSigningReceipt::LEN,
        seeds = [
            b"signing_receipt",
            document.key().as_ref(),
            agent_profile.key().as_ref(),
            params.role.as_ref()
        ],
        bump
    )]
    pub signing_receipt: Account<'info, DocumentSigningReceipt>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentAutonomousDocumentSigned {
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub agent_signer: Pubkey,
    pub capability: Pubkey,
    pub role: [u8; 32],
    pub capability_expires_at: i64,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
