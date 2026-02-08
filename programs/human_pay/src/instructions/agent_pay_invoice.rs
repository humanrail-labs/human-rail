use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

use crate::state::{AgentEscrow, ConfidentialInvoice, InvoiceStatus, PaymentReceipt};
use crate::error::HumanPayError;

// Import from common types
pub const PROGRAM_SCOPE_HUMAN_PAY: u64 = 1 << 0;
pub const ASSET_SCOPE_ANY_SPL_TOKEN: u64 = 1 << 3;

// Program IDs for CPI validation
use anchor_lang::pubkey;
pub const AGENT_REGISTRY_PROGRAM_ID: Pubkey = pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");

/// Agent autonomously pays an invoice on behalf of principal.
/// Key differences from regular pay_invoice:
/// - Agent signs (not principal)
/// - Capability is validated for limits and scope
/// - Funds come from PDA-controlled escrow (not principal's wallet)
/// - Receipt is emitted for accountability
pub fn handler(ctx: Context<AgentPayInvoice>) -> Result<()> {
    let clock = Clock::get()?;
    let invoice = &mut ctx.accounts.invoice;
    let capability = &ctx.accounts.capability;
    let agent = &ctx.accounts.agent_profile;
    let escrow = &ctx.accounts.escrow;

    // Validate invoice is open
    require!(
        invoice.status == InvoiceStatus::Open,
        HumanPayError::InvoiceNotOpen
    );

    // Validate invoice not expired
    if invoice.expires_at != 0 {
        require!(
            clock.unix_timestamp < invoice.expires_at,
            HumanPayError::InvoiceExpired
        );
    }

    // === CAPABILITY VALIDATION (KYA Core) ===

    // Validate agent is active
    require!(
        agent.status == AgentStatus::Active,
        HumanPayError::AgentNotActive
    );

    // Validate capability is active
    require!(
        capability.status == CapabilityStatus::Active,
        HumanPayError::CapabilityNotActive
    );

    // Validate capability belongs to this agent
    require!(
        capability.agent == agent.key(),
        HumanPayError::CapabilityAgentMismatch
    );

    // Validate principal owns this agent
    require!(
        agent.owner_principal == capability.principal,
        HumanPayError::PrincipalMismatch
    );

    // Validate capability not expired
    require!(
        clock.unix_timestamp >= capability.valid_from,
        HumanPayError::CapabilityNotYetValid
    );
    require!(
        clock.unix_timestamp < capability.expires_at,
        HumanPayError::CapabilityExpired
    );

    // Validate program scope (human_pay allowed)
    require!(
        capability.allowed_programs & PROGRAM_SCOPE_HUMAN_PAY != 0,
        HumanPayError::ProgramNotAllowed
    );

    // Validate asset scope
    require!(
        capability.allowed_assets & ASSET_SCOPE_ANY_SPL_TOKEN != 0,
        HumanPayError::AssetNotAllowed
    );

    // Validate per-transaction limit
    require!(
        invoice.amount <= capability.per_tx_limit,
        HumanPayError::PerTxLimitExceeded
    );

    // Check daily limit (with day rollover)
    let current_day = (clock.unix_timestamp / 86400) as u32;
    let effective_daily_spent = if current_day != capability.current_day {
        0 // New day, reset
    } else {
        capability.daily_spent
    };
    require!(
        effective_daily_spent.saturating_add(invoice.amount) <= capability.daily_limit,
        HumanPayError::DailyLimitExceeded
    );

    // Check total lifetime limit
    require!(
        capability.total_spent.saturating_add(invoice.amount) <= capability.total_limit,
        HumanPayError::TotalLimitExceeded
    );

    // Check destination allowlist if enforced
    if capability.enforce_allowlist {
        let merchant_allowed = capability.destination_allowlist
            .iter()
            .take(capability.allowlist_count as usize)
            .any(|d| *d == invoice.merchant);
        require!(merchant_allowed, HumanPayError::DestinationNotAllowed);
    }

    // === VALIDATE ESCROW ===

    // Check escrow has sufficient balance
    require!(
        escrow.available() >= invoice.amount,
        HumanPayError::InsufficientEscrowBalance
    );

    // === EXECUTE PAYMENT FROM ESCROW ===

    // Build escrow PDA signer seeds
    let principal_key = ctx.accounts.principal.key();
    let agent_profile_key = ctx.accounts.agent_profile.key();
    let mint_key = ctx.accounts.mint.key();
    let escrow_bump = escrow.bump;
    let escrow_seeds: &[&[u8]] = &[
        b"agent_escrow",
        principal_key.as_ref(),
        agent_profile_key.as_ref(),
        mint_key.as_ref(),
        &[escrow_bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[escrow_seeds];

    // Transfer tokens from escrow to invoice vault
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.invoice_vault.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, invoice.amount)?;

    // Update escrow tracking
    let escrow = &mut ctx.accounts.escrow;
    escrow.total_spent = escrow.total_spent.saturating_add(invoice.amount);
    escrow.last_used_at = clock.unix_timestamp;

    // Update invoice
    invoice.status = InvoiceStatus::Paid;
    invoice.payer = ctx.accounts.principal.key();
    invoice.paid_at = clock.unix_timestamp;

    // Create payment receipt
    let receipt = &mut ctx.accounts.payment_receipt;
    receipt.invoice = invoice.key();
    receipt.payer = ctx.accounts.principal.key();
    receipt.merchant = invoice.merchant;
    receipt.amount = invoice.amount;
    receipt.paid_at = clock.unix_timestamp;
    receipt.payer_human_score = 0; // Agent payment doesn't track human score
    receipt.tx_signature = [0u8; 32]; // Would be filled by client
    receipt.bump = ctx.bumps.payment_receipt;


    // === H-02 FIX: Record capability usage via CPI ===
    let cpi_accounts = delegation::cpi::accounts::RecordUsageCpi {
        capability: ctx.accounts.capability.to_account_info(),
        agent_signer: ctx.accounts.agent_signer.to_account_info(),
        agent_profile: ctx.accounts.agent_profile.to_account_info(),
        freeze_record: ctx.accounts.freeze_record.to_account_info(),
        usage_record: ctx.accounts.usage_record.to_account_info(),
        payer: ctx.accounts.agent_signer.to_account_info(),
        agent_registry_program: ctx.accounts.agent_registry_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.delegation_program.to_account_info(),
        cpi_accounts,
    );
    delegation::cpi::record_usage_cpi(cpi_ctx, invoice.amount)?;

    // === EMIT RECEIPT FOR ACCOUNTABILITY ===

    emit!(AgentPaymentExecuted {
        invoice: invoice.key(),
        principal: ctx.accounts.principal.key(),
        agent: agent.key(),
        capability: capability.key(),
        merchant: invoice.merchant,
        amount: invoice.amount,
        escrow: escrow.key(),
        escrow_remaining: escrow.available(),
        capability_daily_spent: effective_daily_spent.saturating_add(invoice.amount),
        capability_total_spent: capability.total_spent.saturating_add(invoice.amount),
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent payment executed: agent={}, amount={}, merchant={}, escrow_remaining={}",
        agent.key(),
        invoice.amount,
        invoice.merchant,
        escrow.available()
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
pub struct AgentPayInvoice<'info> {
    /// The agent executing the payment - AGENT SIGNS (true autonomy)
    #[account(mut)]
    pub agent_signer: Signer<'info>,

    /// The agent profile (verifies agent_signer matches signing_key)
    #[account(
        owner = AGENT_REGISTRY_PROGRAM_ID @ HumanPayError::InvalidProgram,
        constraint = agent_profile.signing_key == agent_signer.key() @ HumanPayError::AgentSignerMismatch,
        constraint = agent_profile.status == AgentStatus::Active @ HumanPayError::AgentNotActive
    )]
    pub agent_profile: Box<Account<'info, AgentProfile>>,

    /// The principal who delegated to this agent
    /// CHECK: Validated via capability.principal and escrow.principal
    pub principal: UncheckedAccount<'info>,

    /// The capability credential (validates delegation)
    #[account(
        mut,
        owner = delegation::ID @ HumanPayError::InvalidProgram,
        constraint = capability.agent == agent_profile.key() @ HumanPayError::CapabilityAgentMismatch,
        constraint = capability.principal == principal.key() @ HumanPayError::PrincipalMismatch
    )]
    pub capability: Box<Account<'info, Capability>>,

    /// Token mint for the payment
    #[account(
        constraint = mint.key() == invoice.mint @ HumanPayError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    /// The invoice to pay (C-03 FIX: seeds now include mint)
    #[account(
        mut,
        seeds = [
            b"invoice",
            invoice.merchant.as_ref(),
            invoice.mint.as_ref(),
            &invoice.nonce.to_le_bytes()
        ],
        bump = invoice.bump
    )]
    pub invoice: Box<Account<'info, ConfidentialInvoice>>,

    /// Invoice vault to receive payment
    #[account(
        mut,
        constraint = invoice_vault.key() == invoice.vault @ HumanPayError::InvalidVault
    )]
    pub invoice_vault: Account<'info, TokenAccount>,

    /// Agent escrow account (C-02 FIX: PDA-controlled funds)
    #[account(
        mut,
        seeds = [
            b"agent_escrow",
            principal.key().as_ref(),
            agent_profile.key().as_ref(),
            mint.key().as_ref()
        ],
        bump = escrow.bump,
        constraint = escrow.principal == principal.key() @ HumanPayError::PrincipalMismatch,
        constraint = escrow.agent == agent_profile.key() @ HumanPayError::CapabilityAgentMismatch,
        constraint = escrow.mint == mint.key() @ HumanPayError::InvalidMint
    )]
    pub escrow: Box<Account<'info, AgentEscrow>>,

    /// Escrow token account (source of funds - PDA controlled)
    #[account(
        mut,
        seeds = [b"escrow_vault", escrow.key().as_ref()],
        bump = escrow.token_account_bump,
        constraint = escrow_token_account.key() == escrow.token_account @ HumanPayError::InvalidTokenAccount
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Payment receipt
    #[account(
        init,
        payer = agent_signer,
        space = PaymentReceipt::LEN,
        seeds = [b"payment_receipt", invoice.key().as_ref()],
        bump
    )]
    pub payment_receipt: Account<'info, PaymentReceipt>,

    pub token_program: Program<'info, Token>,

    /// Delegation program for recording usage via CPI
    /// CHECK: Validated by address constraint
    #[account(
        constraint = delegation_program.key() == delegation::ID @ HumanPayError::InvalidProgram
    )]
    pub delegation_program: UncheckedAccount<'info>,

    /// Usage record to be created by CPI
    /// CHECK: Created and validated by delegation program
    #[account(mut)]
    pub usage_record: UncheckedAccount<'info>,

    /// Freeze record - optional, for checking if agent is frozen
    /// CHECK: Validated by delegation program
    pub freeze_record: UncheckedAccount<'info>,

    /// Agent registry program for CPI validation
    /// CHECK: Validated by address constraint
    #[account(
        constraint = agent_registry_program.key() == AGENT_REGISTRY_PROGRAM_ID @ HumanPayError::InvalidProgram
    )]
    pub agent_registry_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentPaymentExecuted {
    pub invoice: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub capability: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub escrow: Pubkey,
    pub escrow_remaining: u64,
    pub capability_daily_spent: u64,
    pub capability_total_spent: u64,
    pub slot: u64,
    pub timestamp: i64,
}
