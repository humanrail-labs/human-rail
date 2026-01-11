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

/// Tier 2: Agent Signing on Behalf of Principal
/// Requires valid agent registration and capability delegation from KYA system.
pub fn handler(ctx: Context<SignDocumentAgent>, params: SignDocumentAgentParams) -> Result<()> {
    let clock = Clock::get()?;
    let document = &mut ctx.accounts.document;
    let agent_profile = &ctx.accounts.agent_profile;
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

    // Validate agent is active
    require!(
        agent_profile.status == AgentStatus::Active,
        DocumentRegistryError::InvalidAgent
    );

    // Validate capability is active and not expired
    require!(
        capability.status == CapabilityStatus::Active,
        DocumentRegistryError::CapabilityRevoked
    );
    require!(
        clock.unix_timestamp < capability.expires_at,
        DocumentRegistryError::CapabilityExpired
    );
    require!(
        clock.unix_timestamp >= capability.valid_from,
        DocumentRegistryError::CapabilityExpired
    );

    // Validate capability allows document signing
    require!(
        capability.allowed_programs & PROGRAM_SCOPE_DOCUMENT_SIGN != 0,
        DocumentRegistryError::NoSigningCapability
    );

    // Validate capability belongs to this agent
    require!(
        capability.agent == agent_profile.key(),
        DocumentRegistryError::NoSigningCapability
    );

    // Validate principal matches
    require!(
        capability.principal == ctx.accounts.principal.key(),
        DocumentRegistryError::PrincipalMismatch
    );
    require!(
        agent_profile.owner_principal == ctx.accounts.principal.key(),
        DocumentRegistryError::PrincipalMismatch
    );

    // Create signature record
    let signature = &mut ctx.accounts.signature_record;
    signature.document = document.key();
    signature.signer_type = SignerType::Agent;
    signature.signer_pubkey = agent_profile.key(); // Agent is the signer
    signature.principal_pubkey = ctx.accounts.principal.key();
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

    // Create receipt for audit trail - this is the KYA accountability record
    let receipt = &mut ctx.accounts.signing_receipt;
    receipt.document = document.key();
    receipt.signature_record = signature.key();
    receipt.principal = ctx.accounts.principal.key();
    receipt.agent = agent_profile.key();
    receipt.is_agent_signature = true;
    receipt.capability = capability.key();
    receipt.doc_hash = document.doc_hash;
    receipt.role = params.role;
    receipt.tier = SignatureTier::AgentOnBehalf;
    receipt.slot = clock.slot;
    receipt.timestamp = clock.unix_timestamp;
    receipt.bump = ctx.bumps.signing_receipt;

    emit!(AgentDocumentSigned {
        document: document.key(),
        signature_record: signature.key(),
        principal: ctx.accounts.principal.key(),
        agent: agent_profile.key(),
        capability: capability.key(),
        role: params.role,
        tier: SignatureTier::AgentOnBehalf,
        capability_expires_at: capability.expires_at,
        signature_count: document.signature_count,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Document signed (Tier 2 Agent): agent={}, principal={}, capability={}",
        agent_profile.key(),
        ctx.accounts.principal.key(),
        capability.key()
    );

    Ok(())
}

// =============================================================================
// LOCAL TYPE DEFINITIONS (to avoid circular dependencies)
// =============================================================================

/// Agent status (from agent_registry)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum AgentStatus {
    #[default]
    Active,
    Suspended,
    Revoked,
}

/// Agent profile (from agent_registry)
#[account]
pub struct AgentProfile {
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

/// Capability status (from delegation)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum CapabilityStatus {
    #[default]
    Active,
    Revoked,
    Expired,
    Frozen,
    Disputed,
}

/// Capability (from delegation) - simplified for space
#[account]
pub struct Capability {
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

#[derive(Accounts)]
#[instruction(params: SignDocumentAgentParams)]
pub struct SignDocumentAgent<'info> {
    /// The principal who authorized the agent - must sign to prove authorization
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent profile (from agent_registry)
    #[account(
        seeds = [
            b"agent",
            principal.key().as_ref(),
            &agent_profile.nonce.to_le_bytes()
        ],
        bump = agent_profile.bump,
        seeds::program = agent_registry_program.key()
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// The capability credential (from delegation)
    #[account(
        seeds = [
            b"capability",
            principal.key().as_ref(),
            agent_profile.key().as_ref(),
            &params.capability_nonce.to_le_bytes()
        ],
        bump = capability.bump,
        seeds::program = delegation_program.key()
    )]
    pub capability: Account<'info, Capability>,

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
        payer = principal,
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

    /// Receipt for audit trail (KYA accountability)
    #[account(
        init,
        payer = principal,
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

    /// Agent Registry program
    /// CHECK: Verified by known program ID
    #[account(address = AGENT_REGISTRY_PROGRAM_ID)]
    pub agent_registry_program: UncheckedAccount<'info>,

    /// Delegation program
    /// CHECK: Verified by known program ID
    #[account(address = DELEGATION_PROGRAM_ID)]
    pub delegation_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Known program IDs
pub const AGENT_REGISTRY_PROGRAM_ID: Pubkey = 
    anchor_lang::solana_program::pubkey!("AgntReg1111111111111111111111111111111111111");

pub const DELEGATION_PROGRAM_ID: Pubkey = 
    anchor_lang::solana_program::pubkey!("De1eg8t1on1111111111111111111111111111111111");

#[event]
pub struct AgentDocumentSigned {
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub capability: Pubkey,
    pub role: [u8; 32],
    pub tier: SignatureTier,
    pub capability_expires_at: i64,
    pub signature_count: u32,
    pub slot: u64,
    pub timestamp: i64,
}
