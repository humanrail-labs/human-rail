import { PublicKey } from '@solana/web3.js';

// =============================================================================
// PROGRAM IDS
// =============================================================================

export const HUMAN_REGISTRY_PROGRAM_ID = new PublicKey(
  'Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR'
);

export const HUMAN_PAY_PROGRAM_ID = new PublicKey(
  '6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe'
);

export const DATA_BLINK_PROGRAM_ID = new PublicKey(
  'BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5'
);

export const AGENT_REGISTRY_PROGRAM_ID = new PublicKey(
  'AgntReg1111111111111111111111111111111111111'
);

export const DELEGATION_PROGRAM_ID = new PublicKey(
  'De1eg8t1on1111111111111111111111111111111111'
);

export const RECEIPTS_PROGRAM_ID = new PublicKey(
  'Rcpts111111111111111111111111111111111111111'
);

export const DOCUMENT_REGISTRY_PROGRAM_ID = new PublicKey(
  'DocReg11111111111111111111111111111111111111'
);

// =============================================================================
// PDA SEEDS
// =============================================================================

export const HUMAN_PROFILE_SEED = 'human_profile';
export const AGENT_SEED = 'agent';
export const AGENT_STATS_SEED = 'agent_stats';
export const KEY_ROTATION_SEED = 'key_rotation';
export const CAPABILITY_SEED = 'capability';
export const REVOCATION_SEED = 'revocation';
export const FREEZE_SEED = 'freeze';
export const USAGE_SEED = 'usage';
export const RECEIPT_SEED = 'receipt';
export const RECEIPT_INDEX_SEED = 'receipt_index';
export const BATCH_SEED = 'batch';
export const DOCUMENT_SEED = 'document';
export const SIGNATURE_SEED = 'signature';
export const SIGNING_RECEIPT_SEED = 'signing_receipt';
export const REQUIRED_SIGNER_SEED = 'required_signer';
export const INVOICE_SEED = 'invoice';
export const INVOICE_VAULT_SEED = 'invoice_vault';
export const TASK_SEED = 'task';
export const TASK_VAULT_SEED = 'task_vault';
export const RESPONSE_SEED = 'response';
export const WORKER_STATS_SEED = 'worker_stats';

// =============================================================================
// THRESHOLDS AND LIMITS
// =============================================================================

export const MAX_ATTESTATIONS = 8;
export const UNIQUE_THRESHOLD = 100;
export const MIN_HUMAN_SCORE_FOR_AGENT = 50;
export const MAX_KEY_HISTORY = 3;
export const KEY_ROTATION_GRACE_PERIOD = 86400;
export const MAX_DESTINATION_ALLOWLIST = 10;
export const MAX_BATCH_SIZE = 10;
export const MAX_OFFCHAIN_REF = 64;
export const MAX_URI_LEN = 128;
export const MAX_IDENTIFIER_LEN = 32;
export const MAX_SIG_METADATA_LEN = 64;
export const MAX_REQUIRED_SIGNERS = 10;
export const MAX_OFFCHAIN_MESSAGE_LEN = 1024;
export const MIN_VERIFIED_SIGNING_SCORE = 50;

// =============================================================================
// PDA DERIVATION HELPERS
// =============================================================================

export function getHumanProfilePDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(HUMAN_PROFILE_SEED), wallet.toBuffer()],
    HUMAN_REGISTRY_PROGRAM_ID
  );
}

export function getAgentPDA(
  principal: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AGENT_SEED), principal.toBuffer(), nonceBuffer],
    AGENT_REGISTRY_PROGRAM_ID
  );
}

export function getAgentStatsPDA(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AGENT_STATS_SEED), agent.toBuffer()],
    AGENT_REGISTRY_PROGRAM_ID
  );
}

export function getCapabilityPDA(
  principal: PublicKey,
  agent: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CAPABILITY_SEED),
      principal.toBuffer(),
      agent.toBuffer(),
      nonceBuffer,
    ],
    DELEGATION_PROGRAM_ID
  );
}

export function getFreezePDA(
  principal: PublicKey,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(FREEZE_SEED), principal.toBuffer(), agent.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

export function getRevocationPDA(capability: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REVOCATION_SEED), capability.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

export function getReceiptPDA(
  agent: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [Buffer.from(RECEIPT_SEED), agent.toBuffer(), nonceBuffer],
    RECEIPTS_PROGRAM_ID
  );
}

export function getReceiptIndexPDA(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(RECEIPT_INDEX_SEED), agent.toBuffer()],
    RECEIPTS_PROGRAM_ID
  );
}

export function getInvoicePDA(
  merchant: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [Buffer.from(INVOICE_SEED), merchant.toBuffer(), nonceBuffer],
    HUMAN_PAY_PROGRAM_ID
  );
}

export function getTaskPDA(
  creator: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TASK_SEED), creator.toBuffer(), nonceBuffer],
    DATA_BLINK_PROGRAM_ID
  );
}

export function getDocumentPDA(docHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DOCUMENT_SEED), Buffer.from(docHash)],
    DOCUMENT_REGISTRY_PROGRAM_ID
  );
}

export function getSignaturePDA(
  document: PublicKey,
  signer: PublicKey,
  role: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SIGNATURE_SEED),
      document.toBuffer(),
      signer.toBuffer(),
      Buffer.from(role),
    ],
    DOCUMENT_REGISTRY_PROGRAM_ID
  );
}

export function getSigningReceiptPDA(
  document: PublicKey,
  signer: PublicKey,
  role: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SIGNING_RECEIPT_SEED),
      document.toBuffer(),
      signer.toBuffer(),
      Buffer.from(role),
    ],
    DOCUMENT_REGISTRY_PROGRAM_ID
  );
}

export function getRequiredSignerPDA(
  document: PublicKey,
  role: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(REQUIRED_SIGNER_SEED),
      document.toBuffer(),
      Buffer.from(role),
    ],
    DOCUMENT_REGISTRY_PROGRAM_ID
  );
}
