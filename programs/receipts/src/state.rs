use anchor_lang::prelude::*;

/// Maximum length for offchain reference
pub const MAX_OFFCHAIN_REF: usize = 64;

/// Action receipt - immutable record of agent action for accountability
#[account]
pub struct ActionReceipt {
    /// Principal who authorized the action
    pub principal_id: Pubkey,
    /// Agent who executed the action
    pub agent_id: Pubkey,
    /// Capability credential used for authorization
    pub capability_id: Pubkey,
    /// Hash of the action request (input)
    pub action_hash: [u8; 32],
    /// Hash of the action result (output)
    pub result_hash: [u8; 32],
    /// Action type (program-specific encoding)
    pub action_type: u8,
    /// Value transferred/affected
    pub value: u64,
    /// Destination of the action
    pub destination: Pubkey,
    /// Timestamp when action was executed
    pub timestamp: i64,
    /// Solana slot when receipt was created
    pub slot: u64,
    /// Block hash at time of creation (first 32 bytes)
    pub block_hash: [u8; 32],
    /// Optional off-chain reference (IPFS hash, API endpoint, etc.)
    pub offchain_ref: [u8; MAX_OFFCHAIN_REF],
    /// Whether offchain reference is set
    pub has_offchain_ref: bool,
    /// Sequential receipt number for this agent
    pub sequence: u64,
    /// Nonce for PDA derivation
    pub nonce: u64,
    /// PDA bump
    pub bump: u8,
}

impl ActionReceipt {
    pub const LEN: usize = 8 + // discriminator
        32 + // principal_id
        32 + // agent_id
        32 + // capability_id
        32 + // action_hash
        32 + // result_hash
        1 +  // action_type
        8 +  // value
        32 + // destination
        8 +  // timestamp
        8 +  // slot
        32 + // block_hash
        MAX_OFFCHAIN_REF + // offchain_ref
        1 +  // has_offchain_ref
        8 +  // sequence
        8 +  // nonce
        1;   // bump
}

/// Receipt index - for efficient lookups by agent or principal
#[account]
pub struct ReceiptIndex {
    /// The entity this index belongs to (agent or principal)
    pub entity: Pubkey,
    /// Type of entity (0 = agent, 1 = principal)
    pub entity_type: u8,
    /// Total number of receipts
    pub receipt_count: u64,
    /// Most recent receipt
    pub latest_receipt: Pubkey,
    /// Timestamp of latest receipt
    pub latest_timestamp: i64,
    /// Total value transacted
    pub total_value: u64,
    /// PDA bump
    pub bump: u8,
}

impl ReceiptIndex {
    pub const LEN: usize = 8 + // discriminator
        32 + // entity
        1 +  // entity_type
        8 +  // receipt_count
        32 + // latest_receipt
        8 +  // latest_timestamp
        8 +  // total_value
        1;   // bump
}

/// Batch receipt summary - for high-throughput operations
#[account]
pub struct BatchReceiptSummary {
    /// Emitter who created the batch
    pub emitter: Pubkey,
    /// Number of receipts in batch
    pub receipt_count: u32,
    /// Merkle root of all receipt hashes in batch
    pub merkle_root: [u8; 32],
    /// First receipt in batch
    pub first_receipt: Pubkey,
    /// Last receipt in batch
    pub last_receipt: Pubkey,
    /// Timestamp of batch creation
    pub created_at: i64,
    /// Total value in batch
    pub total_value: u64,
    /// PDA bump
    pub bump: u8,
}

impl BatchReceiptSummary {
    pub const LEN: usize = 8 + // discriminator
        32 + // emitter
        4 +  // receipt_count
        32 + // merkle_root
        32 + // first_receipt
        32 + // last_receipt
        8 +  // created_at
        8 +  // total_value
        1;   // bump
}
