use anchor_lang::prelude::*;
use crate::state::{GuardedDwallet, GuardSigningRequest};
use crate::error::GuardError;
use crate::ika_cpi;

pub const HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID: Pubkey = pubkey!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");

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
    pub guarded_dwallet: Account<'info, GuardedDwallet>,

    #[account(
        init,
        payer = requester,
        space = 8 + GuardSigningRequest::LEN,
        seeds = [
            b"guard_signing_request",
            guarded_dwallet.key().as_ref(),
            &request_id,
        ],
        bump,
    )]
    pub guard_signing_request: Account<'info, GuardSigningRequest>,

    /// CHECK: Verified against GuardedDwallet.dwallet in handler
    pub dwallet: AccountInfo<'info>,

    /// CHECK: Optional Agent Registry account for agent signer verification
    pub agent_registry_account: Option<AccountInfo<'info>>,

    /// CHECK: CPI authority PDA (owned by this program, derived with Ika seed)
    #[account(
        seeds = [b"__ika_cpi_authority"],
        bump,
    )]
    pub cpi_authority: AccountInfo<'info>,

    /// CHECK: Ika program ID constraint
    #[account(address = ika_cpi::IKA_PROGRAM_ID)]
    pub ika_program: AccountInfo<'info>,

    /// CHECK: Ika config account
    pub ika_config: AccountInfo<'info>,

    /// CHECK: Ika coordinator account (version-dependent)
    pub ika_coordinator: AccountInfo<'info>,

    /// CHECK: Message approval PDA — created by Ika inside CPI
    #[account(mut)]
    pub message_approval: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ApproveGuardedMessage>,
    request_id: [u8; 32],
    message_digest: [u8; 32],
    message_metadata_digest: [u8; 32],
    destination_chain_id: u32,
    asset_hash: [u8; 32],
    recipient_hash: [u8; 32],
    amount: u64,
    _user_pubkey: [u8; 32],
    signature_scheme: u16,
    _message_approval_bump: u8,
) -> Result<()> {
    let guarded = &mut ctx.accounts.guarded_dwallet;
    let request = &mut ctx.accounts.guard_signing_request;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // ------------------------------------------------------------------
    // 1. Signer authorization
    // ------------------------------------------------------------------
    let requester_key = ctx.accounts.requester.key();
    let is_principal = requester_key == guarded.principal;

    let is_agent = if let Some(agent_account) = &ctx.accounts.agent_registry_account {
        if agent_account.owner != &HUMANRAIL_AGENT_REGISTRY_PROGRAM_ID {
            false
        } else {
            let data = agent_account.try_borrow_data()?;
            if data.len() < 72 {
                false
            } else {
                let signing_key = Pubkey::new_from_array(
                    data[40..72].try_into().map_err(|_| GuardError::InvalidAgent)?
                );
                requester_key == signing_key
            }
        }
    } else {
        false
    };

    if !is_principal && !is_agent {
        init_request(
            request,
            guarded,
            request_id,
            message_digest,
            message_metadata_digest,
            destination_chain_id,
            asset_hash,
            recipient_hash,
            amount,
            signature_scheme,
            now,
            2, // rejected
            11, // unauthorized_principal
            ctx.bumps.guard_signing_request,
            &Pubkey::default(),
        )?;
        return Ok(());
    }

    // ------------------------------------------------------------------
    // 2. dWallet match
    // ------------------------------------------------------------------
    if ctx.accounts.dwallet.key() != guarded.dwallet {
        init_request(
            request,
            guarded,
            request_id,
            message_digest,
            message_metadata_digest,
            destination_chain_id,
            asset_hash,
            recipient_hash,
            amount,
            signature_scheme,
            now,
            2, // rejected
            10, // dwallet_mismatch
            ctx.bumps.guard_signing_request,
            &Pubkey::default(),
        )?;
        return Ok(());
    }

    // ------------------------------------------------------------------
    // 3. Policy checks
    // ------------------------------------------------------------------
    let mut rejection_code: u16 = 0;

    if guarded.frozen {
        rejection_code = 1; // frozen
    } else if now > guarded.expires_at {
        rejection_code = 2; // expired
    } else if destination_chain_id != guarded.allowed_chain_id {
        rejection_code = 3; // chain_not_allowed
    } else if asset_hash != guarded.allowed_asset_hash {
        rejection_code = 4; // asset_not_allowed
    } else if recipient_hash != guarded.allowed_recipient_hash {
        rejection_code = 5; // recipient_not_allowed
    } else if amount == 0 {
        rejection_code = 6; // invalid_amount
    } else if amount > guarded.per_tx_limit {
        rejection_code = 7; // per_tx_limit_exceeded
    } else {
        // Daily reset + daily/total limit check
        let current_day = now / 86400;
        let effective_daily_spent = if current_day != guarded.last_spend_day {
            0u64
        } else {
            guarded.daily_spent
        };

        if effective_daily_spent + amount > guarded.daily_limit {
            rejection_code = 8; // daily_limit_exceeded
        } else if guarded.total_limit > 0 && guarded.total_spent + amount > guarded.total_limit {
            rejection_code = 9; // total_limit_exceeded
        }
    }

    // ------------------------------------------------------------------
    // 4. Rejection path
    // ------------------------------------------------------------------
    if rejection_code != 0 {
        init_request(
            request,
            guarded,
            request_id,
            message_digest,
            message_metadata_digest,
            destination_chain_id,
            asset_hash,
            recipient_hash,
            amount,
            signature_scheme,
            now,
            2, // rejected
            rejection_code,
            ctx.bumps.guard_signing_request,
            &Pubkey::default(),
        )?;
        msg!(
            "Rejected signing request {} with code {}",
            hex::encode(request_id),
            rejection_code
        );
        return Ok(());
    }

    // ------------------------------------------------------------------
    // 5. Approval path — update spend counters
    // ------------------------------------------------------------------
    let current_day = now / 86400;
    if current_day != guarded.last_spend_day {
        guarded.daily_spent = amount;
        guarded.last_spend_day = current_day;
    } else {
        guarded.daily_spent += amount;
    }
    guarded.total_spent += amount;

    let message_approval_key = ctx.accounts.message_approval.key();

    init_request(
        request,
        guarded,
        request_id,
        message_digest,
        message_metadata_digest,
        destination_chain_id,
        asset_hash,
        recipient_hash,
        amount,
        signature_scheme,
        now,
        1, // approved
        0, // none
        ctx.bumps.guard_signing_request,
        &message_approval_key,
    )?;

    // ------------------------------------------------------------------
    // 6. CPI to Ika approve_message
    // ------------------------------------------------------------------
    let cpi_authority_seeds: &[&[&[u8]]] = &[&[b"__ika_cpi_authority", &[ctx.bumps.cpi_authority][..]]];

    ika_cpi::approve_message(
        &ctx.accounts.dwallet,
        &ctx.accounts.message_approval,
        &ctx.accounts.cpi_authority,
        &ctx.accounts.ika_config,
        &ctx.accounts.ika_coordinator,
        &ctx.accounts.system_program.to_account_info(),
        message_digest,
        signature_scheme,
        message_metadata_digest,
        cpi_authority_seeds,
    )?;

    msg!(
        "Approved signing request {} and CPI'd Ika approve_message",
        hex::encode(request_id)
    );

    Ok(())
}

// ------------------------------------------------------------------
// Helper to populate a GuardSigningRequest
// ------------------------------------------------------------------
fn init_request(
    request: &mut Account<GuardSigningRequest>,
    guarded: &GuardedDwallet,
    request_id: [u8; 32],
    message_digest: [u8; 32],
    message_metadata_digest: [u8; 32],
    destination_chain_id: u32,
    asset_hash: [u8; 32],
    recipient_hash: [u8; 32],
    amount: u64,
    signature_scheme: u16,
    created_at: i64,
    status: u8,
    rejection_code: u16,
    bump: u8,
    ika_message_approval: &Pubkey,
) -> Result<()> {
    request.version = 1;
    request.request_id = request_id;
    request.guarded_dwallet = guarded.key();
    request.principal = guarded.principal;
    request.agent = guarded.agent;
    request.dwallet = guarded.dwallet;
    request.message_digest = message_digest;
    request.message_metadata_digest = message_metadata_digest;
    request.destination_chain_id = destination_chain_id;
    request.asset_hash = asset_hash;
    request.recipient_hash = recipient_hash;
    request.amount = amount;
    request.signature_scheme = signature_scheme;
    request.status = status;
    request.rejection_code = rejection_code;
    request.ika_message_approval = *ika_message_approval;
    request.created_at = created_at;
    request.bump = bump;
    Ok(())
}
