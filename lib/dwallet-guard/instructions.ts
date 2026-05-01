"use client";

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Discriminators from generated IDL (lib/idl/humanrail_dwallet_guard.json)
// ---------------------------------------------------------------------------
const DISCRIMINATORS = {
  initializeGuardedDwallet: Buffer.from([2, 46, 207, 0, 11, 158, 206, 141]),
  freezeGuardedDwallet: Buffer.from([151, 57, 89, 252, 123, 234, 123, 61]),
  unfreezeGuardedDwallet: Buffer.from([223, 101, 174, 85, 26, 221, 221, 194]),
  approveGuardedMessage: Buffer.from([161, 49, 124, 159, 1, 54, 243, 30]),
};

// Ika program ID (devnet)
const IKA_PROGRAM_ID = new PublicKey("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

// ---------------------------------------------------------------------------
// Instruction: initialize_guarded_dwallet
// Accounts (from IDL):
//   0. principal       [signer, writable]
//   1. guarded_dwallet [writable]
//   2. human_profile
//   3. agent
//   4. humanrail_capability
//   5. dwallet
//   6. system_program
// Args:
//   allowed_chain_id: u32
//   allowed_asset_hash: [u8; 32]
//   allowed_recipient_hash: [u8; 32]
//   per_tx_limit: u64
//   daily_limit: u64
//   total_limit: u64
//   expires_at: i64
// ---------------------------------------------------------------------------
export function buildInitializeGuardedDwalletIx(
  guardProgramId: PublicKey,
  params: {
    principal: PublicKey;
    guardedDwallet: PublicKey;
    humanProfile: PublicKey;
    agent: PublicKey;
    humanrailCapability: PublicKey;
    dwallet: PublicKey;
    allowedChainId: number;
    allowedAssetHash: Uint8Array;
    allowedRecipientHash: Uint8Array;
    perTxLimit: bigint;
    dailyLimit: bigint;
    totalLimit: bigint;
    expiresAt: bigint;
  }
): TransactionInstruction {
  const data = Buffer.alloc(8 + 4 + 32 + 32 + 8 + 8 + 8 + 8);
  let offset = 0;
  DISCRIMINATORS.initializeGuardedDwallet.copy(data, offset);
  offset += 8;
  data.writeUInt32LE(params.allowedChainId, offset);
  offset += 4;
  Buffer.from(params.allowedAssetHash).copy(data, offset);
  offset += 32;
  Buffer.from(params.allowedRecipientHash).copy(data, offset);
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset, 32);
  view.setBigUint64(0, params.perTxLimit, true);
  view.setBigUint64(8, params.dailyLimit, true);
  view.setBigUint64(16, params.totalLimit, true);
  view.setBigInt64(24, params.expiresAt, true);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
      { pubkey: params.humanProfile, isSigner: false, isWritable: false },
      { pubkey: params.agent, isSigner: false, isWritable: false },
      { pubkey: params.humanrailCapability, isSigner: false, isWritable: false },
      { pubkey: params.dwallet, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: guardProgramId,
    data,
  });
}

// ---------------------------------------------------------------------------
// Instruction: freeze_guarded_dwallet
// Accounts:
//   0. principal       [signer]
//   1. guarded_dwallet [writable]
// ---------------------------------------------------------------------------
export function buildFreezeGuardedDwalletIx(
  guardProgramId: PublicKey,
  params: {
    principal: PublicKey;
    guardedDwallet: PublicKey;
  }
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: false },
      { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
    ],
    programId: guardProgramId,
    data: DISCRIMINATORS.freezeGuardedDwallet,
  });
}

// ---------------------------------------------------------------------------
// Instruction: unfreeze_guarded_dwallet
// Accounts:
//   0. principal       [signer]
//   1. guarded_dwallet [writable]
// ---------------------------------------------------------------------------
export function buildUnfreezeGuardedDwalletIx(
  guardProgramId: PublicKey,
  params: {
    principal: PublicKey;
    guardedDwallet: PublicKey;
  }
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: false },
      { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
    ],
    programId: guardProgramId,
    data: DISCRIMINATORS.unfreezeGuardedDwallet,
  });
}

// ---------------------------------------------------------------------------
// Instruction: approve_guarded_message
// Accounts (from IDL):
//   0. requester              [signer, writable]
//   1. guarded_dwallet        [writable]
//   2. guard_signing_request  [writable]
//   3. dwallet
//   4. agent_registry_account [optional]
//   5. cpi_authority
//   6. program
//   7. dwallet_program
//   8. coordinator
//   9. message_approval       [writable]
//   10. system_program
// ---------------------------------------------------------------------------
export function buildApproveGuardedMessageIx(
  guardProgramId: PublicKey,
  params: {
    requester: PublicKey;
    guardedDwallet: PublicKey;
    guardSigningRequest: PublicKey;
    dwallet: PublicKey;
    agentRegistryAccount?: PublicKey | null;
    cpiAuthority: PublicKey;
    coordinator: PublicKey;
    messageApproval: PublicKey;
    requestId: Uint8Array;
    messageDigest: Uint8Array;
    messageMetadataDigest: Uint8Array;
    destinationChainId: number;
    assetHash: Uint8Array;
    recipientHash: Uint8Array;
    amount: bigint;
    userPubkey: Uint8Array;
    signatureScheme: number;
    messageApprovalBump: number;
  }
): TransactionInstruction {
  const data = Buffer.alloc(8 + 32 + 32 + 32 + 4 + 32 + 32 + 8 + 32 + 2 + 1);
  let offset = 0;
  DISCRIMINATORS.approveGuardedMessage.copy(data, offset);
  offset += 8;
  Buffer.from(params.requestId).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageDigest).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageMetadataDigest).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(params.destinationChainId, offset);
  offset += 4;
  Buffer.from(params.assetHash).copy(data, offset);
  offset += 32;
  Buffer.from(params.recipientHash).copy(data, offset);
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset, 11);
  view.setBigUint64(0, params.amount, true);
  view.setUint16(8, params.signatureScheme, true);
  view.setUint8(10, params.messageApprovalBump);

  const keys = [
    { pubkey: params.requester, isSigner: true, isWritable: true },
    { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
    { pubkey: params.guardSigningRequest, isSigner: false, isWritable: true },
    { pubkey: params.dwallet, isSigner: false, isWritable: false },
  ];

  if (params.agentRegistryAccount) {
    keys.push({ pubkey: params.agentRegistryAccount, isSigner: false, isWritable: false });
  }

  keys.push(
    { pubkey: params.cpiAuthority, isSigner: false, isWritable: false },
    { pubkey: guardProgramId, isSigner: false, isWritable: false },
    { pubkey: IKA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.coordinator, isSigner: false, isWritable: false },
    { pubkey: params.messageApproval, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  );

  return new TransactionInstruction({
    keys,
    programId: guardProgramId,
    data,
  });
}
