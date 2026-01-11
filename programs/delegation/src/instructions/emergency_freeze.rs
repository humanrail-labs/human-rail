use anchor_lang::prelude::*;

use crate::{
    error::DelegationError,
    state::EmergencyFreezeRecord,
};

pub fn handler(ctx: Context<EmergencyFreeze>) -> Result<()> {
    let clock = Clock::get()?;

    let freeze_record = &mut ctx.accounts.freeze_record;
    freeze_record.agent = ctx.accounts.agent.key();
    freeze_record.frozen_by = ctx.accounts.principal.key();
    freeze_record.frozen_at = clock.unix_timestamp;
    freeze_record.is_active = true;
    freeze_record.unfrozen_at = 0;
    freeze_record.reason_hash = [0u8; 32];
    freeze_record.bump = ctx.bumps.freeze_record;

    emit!(AgentFrozen {
        agent: freeze_record.agent,
        frozen_by: freeze_record.frozen_by,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Emergency freeze: agent={}, by={}",
        freeze_record.agent,
        freeze_record.frozen_by
    );

    Ok(())
}

#[derive(Accounts)]
pub struct EmergencyFreeze<'info> {
    /// Principal initiating the freeze - must sign
    #[account(mut)]
    pub principal: Signer<'info>,

    /// The agent to freeze
    /// CHECK: We just need the pubkey to create the freeze record
    pub agent: UncheckedAccount<'info>,

    /// Freeze record PDA
    #[account(
        init,
        payer = principal,
        space = EmergencyFreezeRecord::LEN,
        seeds = [b"freeze", agent.key().as_ref()],
        bump
    )]
    pub freeze_record: Account<'info, EmergencyFreezeRecord>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentFrozen {
    pub agent: Pubkey,
    pub frozen_by: Pubkey,
    pub timestamp: i64,
}
