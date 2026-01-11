use anchor_lang::prelude::*;

use crate::{
    error::ReceiptsError,
    state::BatchReceiptSummary,
    EmitReceiptParams,
};

/// Maximum receipts per batch
pub const MAX_BATCH_SIZE: usize = 10;

/// Batch emit multiple receipts.
/// Creates a summary with merkle root for efficient verification.
pub fn handler(ctx: Context<BatchEmit>, receipts: Vec<EmitReceiptParams>) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        receipts.len() <= MAX_BATCH_SIZE,
        ReceiptsError::BatchTooLarge
    );
    require!(
        !receipts.is_empty(),
        ReceiptsError::InvalidReceiptData
    );

    // Compute merkle root of receipt hashes
    let mut hashes: Vec<[u8; 32]> = receipts
        .iter()
        .map(|r| r.action_hash)
        .collect();

    let merkle_root = compute_merkle_root(&mut hashes);

    // Calculate total value
    let total_value: u64 = receipts.iter().map(|r| r.value).sum();

    let summary = &mut ctx.accounts.batch_summary;
    summary.emitter = ctx.accounts.emitter.key();
    summary.receipt_count = receipts.len() as u32;
    summary.merkle_root = merkle_root;
    summary.first_receipt = Pubkey::default(); // Would be set to actual first receipt
    summary.last_receipt = Pubkey::default(); // Would be set to actual last receipt
    summary.created_at = clock.unix_timestamp;
    summary.total_value = total_value;
    summary.bump = ctx.bumps.batch_summary;

    emit!(BatchEmitted {
        batch_summary: summary.key(),
        emitter: summary.emitter,
        receipt_count: summary.receipt_count,
        merkle_root: summary.merkle_root,
        total_value: summary.total_value,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Batch emitted: count={}, total_value={}",
        summary.receipt_count,
        summary.total_value
    );

    Ok(())
}

/// Simple merkle root computation
fn compute_merkle_root(hashes: &mut Vec<[u8; 32]>) -> [u8; 32] {
    if hashes.is_empty() {
        return [0u8; 32];
    }
    if hashes.len() == 1 {
        return hashes[0];
    }

    // Pad to even length
    if hashes.len() % 2 == 1 {
        hashes.push(hashes[hashes.len() - 1]);
    }

    let mut next_level = Vec::new();
    for chunk in hashes.chunks(2) {
        let mut combined = [0u8; 64];
        combined[..32].copy_from_slice(&chunk[0]);
        combined[32..].copy_from_slice(&chunk[1]);
        
        // Simple hash (in production, use proper hash function)
        let mut result = [0u8; 32];
        for (i, byte) in combined.iter().enumerate() {
            result[i % 32] ^= byte;
        }
        next_level.push(result);
    }

    compute_merkle_root(&mut next_level)
}

#[derive(Accounts)]
#[instruction(receipts: Vec<EmitReceiptParams>)]
pub struct BatchEmit<'info> {
    /// Emitter creating the batch
    #[account(mut)]
    pub emitter: Signer<'info>,

    /// Batch summary account
    #[account(
        init,
        payer = emitter,
        space = BatchReceiptSummary::LEN,
        seeds = [
            b"batch",
            emitter.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub batch_summary: Account<'info, BatchReceiptSummary>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct BatchEmitted {
    pub batch_summary: Pubkey,
    pub emitter: Pubkey,
    pub receipt_count: u32,
    pub merkle_root: [u8; 32],
    pub total_value: u64,
    pub timestamp: i64,
}
