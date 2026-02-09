use anchor_lang::prelude::*;

/// Invoice status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum InvoiceStatus {
    #[default]
    Open,
    Paid,
    Cancelled,
    Withdrawn,
}

/// Confidential invoice account
#[account]
#[derive(Default)]
pub struct ConfidentialInvoice {
    /// Merchant who created and receives payment
    pub merchant: Pubkey,
    /// Payer who paid the invoice (None if unpaid)
    pub payer: Pubkey,
    /// Invoice amount in token base units
    pub amount: u64,
    /// Token mint for payment
    pub mint: Pubkey,
    /// Minimum human score required (0-10000 basis points)
    pub human_requirements: u16,
    /// Current invoice status
    pub status: InvoiceStatus,
    /// Timestamp when invoice was created
    pub created_at: i64,
    /// Expiration timestamp (0 for no expiry)
    pub expires_at: i64,
    /// Timestamp when invoice was paid (0 if unpaid)
    pub paid_at: i64,
    /// Optional memo/reference
    pub memo: [u8; 32],
    /// Invoice vault for holding funds
    pub vault: Pubkey,
    /// Bump seed for PDA
    pub bump: u8,
    /// Vault bump seed
    pub vault_bump: u8,
    /// Nonce used for PDA derivation (must match creation param)
    pub nonce: u64,
}

impl ConfidentialInvoice {
    pub const LEN: usize = 8 + // discriminator
        32 + // merchant
        32 + // payer
        8 + // amount
        32 + // mint
        2 + // human_requirements
        1 + // status
        8 + // created_at
        8 + // expires_at
        8 + // paid_at
        32 + // memo
        32 + // vault
        1 + // bump
        1 + // vault_bump
        8; // nonce
}

/// Payment receipt for tracking completed payments
#[account]
pub struct PaymentReceipt {
    /// The invoice that was paid
    pub invoice: Pubkey,
    /// Payer who made the payment
    pub payer: Pubkey,
    /// Merchant who received payment
    pub merchant: Pubkey,
    /// Amount paid
    pub amount: u64,
    /// Timestamp of payment
    pub paid_at: i64,
    /// Human score of payer at time of payment
    pub payer_human_score: u16,
    /// Transaction signature (first 32 bytes)
    pub tx_signature: [u8; 32],
    /// Bump seed
    pub bump: u8,
}

impl PaymentReceipt {
    pub const LEN: usize = 8 + // discriminator
        32 + // invoice
        32 + // payer
        32 + // merchant
        8 + // amount
        8 + // paid_at
        2 + // payer_human_score
        32 + // tx_signature
        1; // bump
}

/// Agent escrow - PDA-controlled token account for autonomous agent payments
/// Seeds: [b"agent_escrow", principal, agent, mint]
#[account]
pub struct AgentEscrow {
    /// Principal who funded this escrow
    pub principal: Pubkey,
    /// Agent authorized to spend from this escrow
    pub agent: Pubkey,
    /// Token mint for this escrow
    pub mint: Pubkey,
    /// Associated token account (PDA-controlled)
    pub token_account: Pubkey,
    /// Total amount deposited
    pub total_deposited: u64,
    /// Total amount spent
    pub total_spent: u64,
    /// Timestamp when created
    pub created_at: i64,
    /// Timestamp of last usage
    pub last_used_at: i64,
    /// PDA bump
    pub bump: u8,
    /// Token account bump
    pub token_account_bump: u8,
}

impl AgentEscrow {
    pub const LEN: usize = 8 + // discriminator
        32 + // principal
        32 + // agent
        32 + // mint
        32 + // token_account
        8 +  // total_deposited
        8 +  // total_spent
        8 +  // created_at
        8 +  // last_used_at
        1 +  // bump
        1; // token_account_bump

    /// Available balance
    pub fn available(&self) -> u64 {
        self.total_deposited.saturating_sub(self.total_spent)
    }
}
