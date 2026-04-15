import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  PROGRAM_IDS,
  DISCRIMINATORS,
  deriveHumanProfilePda,
  deriveAgentPda,
  deriveCapabilityPda,
  deriveFreezePda,
  deriveDocumentPda,
} from "./constants.js";
import type { CapabilityScope } from "./types.js";

// ============================================================================
// Encoding helpers
// ============================================================================
function padString(str: string, length: number): Buffer {
  const buf = Buffer.alloc(length);
  const bytes = Buffer.from(str.slice(0, length), "utf-8");
  bytes.copy(buf);
  return buf;
}

function u64LE(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function i64LE(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

function u32LE(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return buf;
}

function u16LE(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value);
  return buf;
}

function u8(value: number): Buffer {
  return Buffer.from([value]);
}

// ============================================================================
// Human Registry
// ============================================================================
export function buildRegisterHumanIx(params: {
  wallet: PublicKey;
  displayName: string;
}): TransactionInstruction {
  const [profilePda] = deriveHumanProfilePda(params.wallet);
  return new TransactionInstruction({
    keys: [
      { pubkey: params.wallet, isSigner: true, isWritable: true },
      { pubkey: profilePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_IDS.humanRegistry,
    data: DISCRIMINATORS.initProfile,
  });
}

// ============================================================================
// Agent Registry
// ============================================================================
export function buildRegisterAgentIx(params: {
  principal: PublicKey;
  agentPubkey: PublicKey;
  name: string;
  agentType: string;
  nonce: bigint;
}): TransactionInstruction {
  const programId = PROGRAM_IDS.agentRegistry;
  const humanRegistryId = PROGRAM_IDS.humanRegistry;
  const [humanProfilePda] = deriveHumanProfilePda(params.principal);
  const [agentPda] = deriveAgentPda(params.principal, params.nonce);
  const [operatorStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent_stats"), agentPda.toBuffer()],
    programId
  );

  const nameBuffer = padString(params.name, 32);
  const metadataHash = Buffer.alloc(32);
  const paramsData = Buffer.concat([
    nameBuffer,
    metadataHash,
    params.agentPubkey.toBuffer(),
    Buffer.from([0]), // no tee_measurement
    u64LE(params.nonce),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: humanProfilePda, isSigner: false, isWritable: false },
      { pubkey: humanRegistryId, isSigner: false, isWritable: false },
      { pubkey: agentPda, isSigner: false, isWritable: true },
      { pubkey: operatorStatsPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.concat([DISCRIMINATORS.registerAgent, paramsData]),
  });
}

export function buildSuspendAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.agentPda, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_IDS.agentRegistry,
    data: DISCRIMINATORS.suspendAgent,
  });
}

export function buildReactivateAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.agentPda, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_IDS.agentRegistry,
    data: DISCRIMINATORS.reactivateAgent,
  });
}

export function buildRevokeAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.agentPda, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_IDS.agentRegistry,
    data: DISCRIMINATORS.revokeAgent,
  });
}

// ============================================================================
// Delegation
// ============================================================================
export function buildIssueCapabilityIx(params: {
  principal: PublicKey;
  agent: PublicKey;
  scope: CapabilityScope;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  expiresAt: bigint | null;
  allowedPrograms: PublicKey[];
  nonce: bigint;
}): TransactionInstruction {
  const programId = PROGRAM_IDS.delegation;
  const [capabilityPda] = deriveCapabilityPda(params.principal, params.agent, params.nonce);

  // Build scope bitmask
  let allowedProgramsMask = BigInt("0xFFFFFFFFFFFFFFFF");
  if (params.allowedPrograms.length > 0) {
    allowedProgramsMask = BigInt(0);
    for (const id of params.allowedPrograms) {
      const pk = id.toBase58();
      if (pk === PROGRAM_IDS.humanPay.toBase58()) allowedProgramsMask |= BigInt(1);
      else if (pk === PROGRAM_IDS.dataBlink.toBase58()) allowedProgramsMask |= BigInt(2);
      else if (pk === PROGRAM_IDS.documentRegistry.toBase58()) allowedProgramsMask |= BigInt(4);
      else allowedProgramsMask |= BigInt("0x8000000000000000");
    }
    if (allowedProgramsMask === BigInt(0)) {
      allowedProgramsMask = BigInt("0xFFFFFFFFFFFFFFFF");
    }
  }

  const allowedAssetsMask = BigInt("0xFFFFFFFFFFFFFFFF");
  const validitySeconds = params.expiresAt && params.expiresAt > 0
    ? Number(params.expiresAt) - Math.floor(Date.now() / 1000)
    : 0;

  const paramsData = Buffer.concat([
    u64LE(allowedProgramsMask),
    u64LE(allowedAssetsMask),
    u64LE(params.perTxLimit),
    u64LE(params.dailyLimit),
    u64LE(params.totalLimit),
    u16LE(500), // maxSlippageBps 5%
    u64LE(10000000), // maxFee 0.01 SOL
    i64LE(validitySeconds),
    u32LE(0), // cooldownSeconds
    u8(1), // riskTier
    u8(0), // enforceAllowlist
    u32LE(0), // allowlist vec length
    u64LE(params.nonce),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.agent, isSigner: false, isWritable: false },
      { pubkey: capabilityPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.concat([DISCRIMINATORS.issueCapability, paramsData]),
  });
}

export function buildFreezeAgentIx(params: {
  principal: PublicKey;
  agent: PublicKey;
  capabilityPda: PublicKey;
}): TransactionInstruction {
  const [freezePda] = deriveFreezePda(params.principal, params.agent);
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.agent, isSigner: false, isWritable: false },
      { pubkey: params.capabilityPda, isSigner: false, isWritable: false },
      { pubkey: freezePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_IDS.delegation,
    data: DISCRIMINATORS.emergencyFreeze,
  });
}

export function buildUnfreezeAgentIx(params: {
  principal: PublicKey;
  agent: PublicKey;
}): TransactionInstruction {
  const [freezePda] = deriveFreezePda(params.principal, params.agent);
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: freezePda, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_IDS.delegation,
    data: DISCRIMINATORS.unfreeze,
  });
}

export function buildRevokeCapabilityIx(params: {
  principal: PublicKey;
  capabilityPda: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.capabilityPda, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_IDS.delegation,
    data: DISCRIMINATORS.revokeCapability,
  });
}

// ============================================================================
// Receipts
// ============================================================================
export function buildCreateReceiptIx(params: {
  agent: PublicKey;
  principal: PublicKey;
  capability: PublicKey;
  actionType: number;
  amount: bigint;
  destination: PublicKey;
  memo: string;
  nonce: bigint;
}): TransactionInstruction {
  const programId = PROGRAM_IDS.receipts;
  const [receiptPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), params.agent.toBuffer(), u64LE(params.nonce)],
    programId
  );

  // Build CreateReceiptParams
  // action_hash: [u8;32], result_hash: [u8;32], action_type: u8, value: u64,
  // destination: Pubkey, timestamp: i64, block_hash: [u8;32], offchain_ref: [u8;64],
  // has_offchain_ref: bool, sequence: u64
  const actionHash = Buffer.alloc(32);
  const resultHash = Buffer.alloc(32);
  const blockHash = Buffer.alloc(32);
  const offchainRef = Buffer.alloc(64);
  const memoBytes = Buffer.from(params.memo.slice(0, 64), "utf-8");
  memoBytes.copy(offchainRef);
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsData = Buffer.concat([
    actionHash,
    resultHash,
    u8(params.actionType),
    u64LE(params.amount),
    params.destination.toBuffer(),
    i64LE(timestamp),
    blockHash,
    offchainRef,
    u8(params.memo ? 1 : 0),
    u64LE(0), // sequence
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.agent, isSigner: true, isWritable: true },
      { pubkey: params.principal, isSigner: false, isWritable: false },
      { pubkey: params.capability, isSigner: false, isWritable: false },
      { pubkey: receiptPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.concat([DISCRIMINATORS.createReceipt, paramsData]),
  });
}

// ============================================================================
// Document Registry
// ============================================================================
export function buildRegisterDocumentIx(params: {
  creator: PublicKey;
  docHash: Uint8Array;
  schema: string;
  uri?: string | null;
}): TransactionInstruction {
  const programId = PROGRAM_IDS.documentRegistry;
  const [documentPda] = deriveDocumentPda(Buffer.from(params.docHash));

  const buffer = Buffer.alloc(8 + 32 + 1 + 32 + 128 + 1 + 32 + 1 + 1 + 32);
  let offset = 0;

  // discriminator
  DISCRIMINATORS.registerDocument.copy(buffer, offset);
  offset += 8;

  // doc_hash
  Buffer.from(params.docHash).copy(buffer, offset);
  offset += 32;

  // hash_algorithm (Sha256 = 0)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // schema
  const schemaBytes = Buffer.alloc(32);
  Buffer.from(params.schema.slice(0, 32), "utf-8").copy(schemaBytes);
  schemaBytes.copy(buffer, offset);
  offset += 32;

  // uri
  if (params.uri) {
    const uriBytes = Buffer.alloc(128);
    Buffer.from(params.uri.slice(0, 128), "utf-8").copy(uriBytes);
    uriBytes.copy(buffer, offset);
  }
  offset += 128;

  // has_uri
  buffer.writeUInt8(params.uri ? 1 : 0, offset);
  offset += 1;

  // metadata_hash (empty)
  offset += 32;

  // has_metadata
  buffer.writeUInt8(0, offset);
  offset += 1;

  // version_of (None)
  buffer.writeUInt8(0, offset);
  offset += 1;

  const data = buffer.slice(0, offset);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: documentPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });
}

export function buildSignDocumentIx(params: {
  signer: PublicKey;
  documentPda: PublicKey;
  role: string;
}): TransactionInstruction {
  const programId = PROGRAM_IDS.documentRegistry;
  const humanRegistryId = PROGRAM_IDS.humanRegistry;
  const [humanProfilePda] = deriveHumanProfilePda(params.signer);

  const roleBytes = Buffer.alloc(32);
  Buffer.from(params.role.slice(0, 32), "utf-8").copy(roleBytes);

  const [signatureRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("signature"), params.documentPda.toBuffer(), params.signer.toBuffer(), roleBytes],
    programId
  );

  const [signingReceiptPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("signing_receipt"), params.documentPda.toBuffer(), params.signer.toBuffer(), roleBytes],
    programId
  );

  const buffer = Buffer.alloc(8 + 32 + 64 + 1);
  let offset = 0;
  DISCRIMINATORS.signDocumentVerified.copy(buffer, offset);
  offset += 8;
  roleBytes.copy(buffer, offset);
  offset += 32;
  // signature_metadata (empty)
  offset += 64;
  // has_metadata
  buffer.writeUInt8(0, offset);
  offset += 1;

  const data = buffer.slice(0, offset);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.signer, isSigner: true, isWritable: true },
      { pubkey: humanProfilePda, isSigner: false, isWritable: false },
      { pubkey: params.documentPda, isSigner: false, isWritable: true },
      { pubkey: signatureRecordPda, isSigner: false, isWritable: true },
      { pubkey: signingReceiptPda, isSigner: false, isWritable: true },
      { pubkey: humanRegistryId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });
}

// ============================================================================
// HumanPay (simplified direct SOL transfer + receipt)
// ============================================================================
export function buildDirectPaymentIx(params: {
  from: PublicKey;
  to: PublicKey;
  amount: bigint;
}): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: params.from,
    toPubkey: params.to,
    lamports: BigInt(params.amount),
  });
}
