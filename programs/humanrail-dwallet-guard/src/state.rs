use anchor_lang::prelude::*;

/// GuardedDwallet stores the policy for a single dWallet + agent pair.
/// It is owned by the HumanRail dWallet Guard program.
#[account]
pub struct GuardedDwallet {
    pub version: u8,
    pub principal: Pubkey,
    pub human_profile: Pubkey,
    pub agent: Pubkey,
    pub humanrail_capability: Pubkey,
    pub dwallet: Pubkey,
    pub allowed_chain_id: u32,
    pub allowed_asset_hash: [u8; 32],
    pub allowed_recipient_hash: [u8; 32],
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub total_limit: u64,
    pub daily_spent: u64,
    pub total_spent: u64,
    pub last_spend_day: i64,
    pub expires_at: i64,
    pub frozen: bool,
    pub bump: u8,
}

impl GuardedDwallet {
    // 8 (discriminator) + 319 (fields) = 327; pad to 360 for safety
    pub const LEN: usize = 360;
}

/// GuardSigningRequest records a single cross-chain signing attempt.
/// Created by approve_guarded_message. Status indicates approved or rejected.
#[account]
pub struct GuardSigningRequest {
    pub version: u8,
    pub request_id: [u8; 32],
    pub guarded_dwallet: Pubkey,
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub dwallet: Pubkey,
    pub message_digest: [u8; 32],
    pub message_metadata_digest: [u8; 32],
    pub destination_chain_id: u32,
    pub asset_hash: [u8; 32],
    pub recipient_hash: [u8; 32],
    pub amount: u64,
    pub signature_scheme: u16,
    pub status: u8,
    pub rejection_code: u16,
    pub ika_message_approval: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl GuardSigningRequest {
    // 8 (discriminator) + 379 (fields) = 387; pad to 440 for safety
    pub const LEN: usize = 440;
}
