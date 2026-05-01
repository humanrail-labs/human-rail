use anchor_lang::prelude::*;

pub mod error;
pub mod ika_cpi;
pub mod instructions;
pub mod state;

// HumanRail program IDs (used in constraints)
pub const HUMANRAIL_HUMAN_REGISTRY_PROGRAM_ID: Pubkey =
    pubkey!("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo");
pub const HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID: Pubkey =
    pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");
pub const HUMANRAIL_DELEGATION_PROGRAM_ID: Pubkey =
    pubkey!("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT");

declare_id!("G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF");

// ------------------------------------------------------------------
// Account structs MUST be defined at crate root for Anchor 1's
// #[program] macro to resolve __client_accounts_* modules and
// anchor_ident correctly.
// ------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(
    allowed_chain_id: u32,
    allowed_asset_hash: [u8; 32],
    allowed_recipient_hash: [u8; 32],
    per_tx_limit: u64,
    daily_limit: u64,
    total_limit: u64,
    expires_at: i64,
)]
pub struct InitializeGuardedDwallet<'info> {
    #[account(mut)]
    pub principal: Signer<'info>,

    #[account(
        init,
        payer = principal,
        space = 8 + state::GuardedDwallet::LEN,
        seeds = [
            b"guarded_dwallet",
            principal.key().as_ref(),
            agent.key.as_ref(),
            dwallet.key.as_ref(),
        ],
        bump,
    )]
    pub guarded_dwallet: Account<'info, state::GuardedDwallet>,

    /// CHECK: Human Registry account; owner verified below
    #[account(owner = HUMANRAIL_HUMAN_REGISTRY_PROGRAM_ID @ error::GuardError::InvalidHumanProfile)]
    pub human_profile: AccountInfo<'info>,

    /// CHECK: Agent Registry account; owner verified below
    #[account(owner = HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID @ error::GuardError::InvalidAgent)]
    pub agent: AccountInfo<'info>,

    /// CHECK: Delegation capability account; owner verified below
    #[account(owner = HUMANRAIL_DELEGATION_PROGRAM_ID @ error::GuardError::InvalidCapability)]
    pub humanrail_capability: AccountInfo<'info>,

    /// CHECK: Ika dWallet pubkey — stored as reference only
    pub dwallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FreezeGuardedDwallet<'info> {
    pub principal: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"guarded_dwallet",
            guarded_dwallet.principal.as_ref(),
            guarded_dwallet.agent.as_ref(),
            guarded_dwallet.dwallet.as_ref(),
        ],
        bump = guarded_dwallet.bump,
        constraint = guarded_dwallet.principal == principal.key() @ error::GuardError::UnauthorizedPrincipal,
    )]
    pub guarded_dwallet: Account<'info, state::GuardedDwallet>,
}

#[derive(Accounts)]
pub struct UnfreezeGuardedDwallet<'info> {
    pub principal: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"guarded_dwallet",
            guarded_dwallet.principal.as_ref(),
            guarded_dwallet.agent.as_ref(),
            guarded_dwallet.dwallet.as_ref(),
        ],
        bump = guarded_dwallet.bump,
        constraint = guarded_dwallet.principal == principal.key() @ error::GuardError::UnauthorizedPrincipal,
    )]
    pub guarded_dwallet: Account<'info, state::GuardedDwallet>,
}

#[derive(Accounts)]
#[instruction(
    request_id: [u8; 32],
    message_digest: [u8; 32],
    message_metadata_digest: [u8; 32],
    destination_chain_id: u32,
    asset_hash: [u8; 32],
    recipient_hash: [u8; 32],
    amount: u64,
    user_pubkey: [u8; 32],
    signature_scheme: u16,
    message_approval_bump: u8,
)]
pub struct ApproveGuardedMessage<'info> {
    #[account(mut)]
    pub requester: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"guarded_dwallet",
            guarded_dwallet.principal.as_ref(),
            guarded_dwallet.agent.as_ref(),
            guarded_dwallet.dwallet.as_ref(),
        ],
        bump = guarded_dwallet.bump,
    )]
    pub guarded_dwallet: Account<'info, state::GuardedDwallet>,

    #[account(
        init,
        payer = requester,
        space = 8 + state::GuardSigningRequest::LEN,
        seeds = [
            b"guard_signing_request",
            guarded_dwallet.key().as_ref(),
            &request_id,
        ],
        bump,
    )]
    pub guard_signing_request: Account<'info, state::GuardSigningRequest>,

    /// CHECK: Verified against GuardedDwallet.dwallet in handler
    pub dwallet: AccountInfo<'info>,

    /// CHECK: Optional Agent Registry account for agent signer verification
    pub agent_registry_account: Option<AccountInfo<'info>>,

    /// CHECK: CPI authority PDA (derived from __ika_cpi_authority seed)
    #[account(
        seeds = [ika_cpi::CPI_AUTHORITY_SEED],
        bump,
    )]
    pub cpi_authority: AccountInfo<'info>,

    /// CHECK: This program's executable account (required by Ika for caller verification)
    #[account(address = crate::ID)]
    pub program: AccountInfo<'info>,

    /// CHECK: Ika dWallet program
    #[account(address = ika_cpi::IKA_PROGRAM_ID)]
    pub dwallet_program: AccountInfo<'info>,

    /// CHECK: Ika coordinator account (DWalletCoordinator PDA)
    pub coordinator: AccountInfo<'info>,

    /// CHECK: Message approval PDA — created by Ika inside CPI
    #[account(mut)]
    pub message_approval: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[program]
pub mod humanrail_dwallet_guard {
    use super::*;

    pub fn initialize_guarded_dwallet(
        ctx: Context<InitializeGuardedDwallet>,
        allowed_chain_id: u32,
        allowed_asset_hash: [u8; 32],
        allowed_recipient_hash: [u8; 32],
        per_tx_limit: u64,
        daily_limit: u64,
        total_limit: u64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, allowed_chain_id, allowed_asset_hash,
            allowed_recipient_hash, per_tx_limit, daily_limit, total_limit, expires_at)
    }

    pub fn freeze_guarded_dwallet(
        ctx: Context<FreezeGuardedDwallet>,
    ) -> Result<()> {
        instructions::freeze::handler(ctx)
    }

    pub fn unfreeze_guarded_dwallet(
        ctx: Context<UnfreezeGuardedDwallet>,
    ) -> Result<()> {
        instructions::unfreeze::handler(ctx)
    }

    pub fn approve_guarded_message(
        ctx: Context<ApproveGuardedMessage>,
        request_id: [u8; 32],
        message_digest: [u8; 32],
        message_metadata_digest: [u8; 32],
        destination_chain_id: u32,
        asset_hash: [u8; 32],
        recipient_hash: [u8; 32],
        amount: u64,
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        message_approval_bump: u8,
    ) -> Result<()> {
        instructions::approve::handler(ctx, request_id, message_digest,
            message_metadata_digest, destination_chain_id, asset_hash, recipient_hash,
            amount, user_pubkey, signature_scheme, message_approval_bump)
    }
}
