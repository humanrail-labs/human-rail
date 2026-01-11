use anchor_lang::prelude::*;

use crate::state::{DocumentSigningReceipt, SignatureTier};

/// Emit a document signing action to the unified receipts program.
/// This bridges document_registry receipts into the global receipt system.
/// Can be called after any signing operation for audit trail.
pub fn handler(ctx: Context<EmitToReceipts>) -> Result<()> {
    let clock = Clock::get()?;
    let local_receipt = &ctx.accounts.local_receipt;

    // Build receipt data for the unified receipts program
    let receipt_data = UnifiedReceiptData {
        principal: local_receipt.principal,
        agent: local_receipt.agent,
        capability: local_receipt.capability,
        action_type: ActionType::DocumentSign,
        action_hash: local_receipt.doc_hash,
        result_hash: [0u8; 32], // Could hash the signature record
        value: 0, // Document signing doesn't have monetary value
        destination: local_receipt.document,
        source_program: crate::ID,
    };

    // Emit event that can be indexed
    emit!(UnifiedReceiptEmitted {
        local_receipt: local_receipt.key(),
        document: local_receipt.document,
        signature_record: local_receipt.signature_record,
        principal: local_receipt.principal,
        agent: local_receipt.agent,
        capability: local_receipt.capability,
        tier: local_receipt.tier,
        action_type: ActionType::DocumentSign,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Receipt emitted to unified system: doc={}, principal={}",
        local_receipt.document,
        local_receipt.principal
    );

    Ok(())
}

/// Action types for unified receipt system
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
pub enum ActionType {
    #[default]
    Unknown,
    Payment,
    TaskResponse,
    DocumentSign,
    TokenTransfer,
    Swap,
    Stake,
    Custom,
}

/// Data structure for unified receipts
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UnifiedReceiptData {
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub capability: Pubkey,
    pub action_type: ActionType,
    pub action_hash: [u8; 32],
    pub result_hash: [u8; 32],
    pub value: u64,
    pub destination: Pubkey,
    pub source_program: Pubkey,
}

#[derive(Accounts)]
pub struct EmitToReceipts<'info> {
    /// The local document signing receipt
    pub local_receipt: Account<'info, DocumentSigningReceipt>,
}

#[event]
pub struct UnifiedReceiptEmitted {
    pub local_receipt: Pubkey,
    pub document: Pubkey,
    pub signature_record: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub capability: Pubkey,
    pub tier: SignatureTier,
    pub action_type: ActionType,
    pub slot: u64,
    pub timestamp: i64,
}
