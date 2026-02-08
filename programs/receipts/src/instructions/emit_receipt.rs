use anchor_lang::prelude::*;
use agent_registry::state::AgentProfile;

use crate::{
    error::ReceiptsError,
    state::{ActionReceipt, ReceiptIndex, MAX_OFFCHAIN_REF},
    EmitReceiptParams,
};

pub fn handler(ctx: Context<EmitReceipt>, params: EmitReceiptParams) -> Result<()> {
    let clock = Clock::get()?;

    // === C-07 FIX: Verify emitter is the agent's signing key ===
    let agent_profile = &ctx.accounts.agent_profile;
    require!(
        agent_profile.signing_key == ctx.accounts.emitter.key(),
        ReceiptsError::UnauthorizedEmitter
    );
    require!(
        agent_profile.key() == params.agent_id,
        ReceiptsError::AgentMismatch
    );

    // P0-4 / F5 FIX: Validate principal_id matches agent actual owner
    require!(
        agent_profile.owner_principal == params.principal_id,
        ReceiptsError::InvalidPrincipalRef
    );

    let receipt = &mut ctx.accounts.receipt;
    receipt.principal_id = params.principal_id;
    receipt.agent_id = params.agent_id;
    receipt.capability_id = params.capability_id;
    receipt.action_hash = params.action_hash;
    receipt.result_hash = params.result_hash;
    receipt.action_type = params.action_type;
    receipt.value = params.value;
    receipt.destination = params.destination;
    receipt.timestamp = clock.unix_timestamp;
    receipt.slot = clock.slot;
    receipt.block_hash = [0u8; 32]; // Would need recent blockhash
    receipt.offchain_ref = params.offchain_ref;
    receipt.has_offchain_ref = params.offchain_ref != [0u8; MAX_OFFCHAIN_REF];
    receipt.nonce = params.nonce;
    receipt.bump = ctx.bumps.receipt;

    // Update agent index
    let agent_index = &mut ctx.accounts.agent_index;
    agent_index.entity = params.agent_id;
    agent_index.entity_type = 0; // Agent
    agent_index.receipt_count = agent_index.receipt_count.checked_add(1).ok_or(ReceiptsError::InvalidReceiptData)?;
    agent_index.latest_receipt = receipt.key();
    agent_index.latest_timestamp = clock.unix_timestamp;
    agent_index.total_value = agent_index.total_value.checked_add(params.value).ok_or(ReceiptsError::InvalidReceiptData)?;
    receipt.sequence = agent_index.receipt_count;

    if ctx.bumps.agent_index != 0 {
        agent_index.bump = ctx.bumps.agent_index;
    }

    emit!(ReceiptEmitted {
        receipt: receipt.key(),
        principal_id: receipt.principal_id,
        agent_id: receipt.agent_id,
        capability_id: receipt.capability_id,
        action_hash: receipt.action_hash,
        result_hash: receipt.result_hash,
        action_type: receipt.action_type,
        value: receipt.value,
        destination: receipt.destination,
        timestamp: receipt.timestamp,
        sequence: receipt.sequence,
    });

    msg!(
        "Receipt emitted: agent={}, value={}, sequence={}",
        receipt.agent_id,
        receipt.value,
        receipt.sequence
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: EmitReceiptParams)]
pub struct EmitReceipt<'info> {
    /// Emitter - typically the agent or a program on behalf of agent
    #[account(mut)]
    pub emitter: Signer<'info>,

    /// C-07 FIX: Agent profile to verify emitter is authorized
    #[account(
        seeds = [b"agent", agent_profile.owner_principal.as_ref(), &agent_profile.nonce.to_le_bytes()],
        bump = agent_profile.bump,
        seeds::program = agent_registry::ID,
        constraint = agent_profile.signing_key == emitter.key() @ ReceiptsError::UnauthorizedEmitter
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// The receipt account
    #[account(
        init,
        payer = emitter,
        space = ActionReceipt::LEN,
        seeds = [
            b"receipt",
            params.agent_id.as_ref(),
            &params.nonce.to_le_bytes()
        ],
        bump
    )]
    pub receipt: Account<'info, ActionReceipt>,

    /// Agent receipt index - tracks all receipts for an agent
    #[account(
        init_if_needed,
        payer = emitter,
        space = ReceiptIndex::LEN,
        seeds = [b"receipt_index", params.agent_id.as_ref()],
        bump
    )]
    pub agent_index: Account<'info, ReceiptIndex>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct ReceiptEmitted {
    pub receipt: Pubkey,
    pub principal_id: Pubkey,
    pub agent_id: Pubkey,
    pub capability_id: Pubkey,
    pub action_hash: [u8; 32],
    pub result_hash: [u8; 32],
    pub action_type: u8,
    pub value: u64,
    pub destination: Pubkey,
    pub timestamp: i64,
    pub sequence: u64,
}
