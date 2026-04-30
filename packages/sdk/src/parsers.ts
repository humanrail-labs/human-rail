import { PublicKey } from "@solana/web3.js";
import { ACCOUNT_DISCRIMINATORS } from "./constants.js";
import type {
  HumanProfile,
  AgentAccount,
  Capability,
  FreezeAccount,
  Receipt,
  DocumentRecord,
  SignatureRecord,
  GuardSigningRequest,
  GuardedDwallet,
} from "./types.js";
import { guardRejectionCodeFromNumber } from "./types.js";

export function parseAgentStatus(statusByte: number): "Active" | "Suspended" | "Revoked" {
  switch (statusByte) {
    case 0: return "Active";
    case 1: return "Suspended";
    case 2: return "Revoked";
    default: return "Active";
  }
}

export function parseCapabilityStatus(statusByte: number): "Active" | "Frozen" | "Revoked" | "Disputed" {
  switch (statusByte) {
    case 0: return "Active";
    case 1: return "Frozen";
    case 2: return "Revoked";
    case 3: return "Disputed";
    default: return "Active";
  }
}

export function parseDocumentStatus(byte: number): "Draft" | "Active" | "Finalized" | "Disputed" {
  switch (byte) {
    case 0: return "Draft";
    case 1: return "Active";
    case 2: return "Finalized";
    case 3: return "Disputed";
    default: return "Draft";
  }
}

export function parseSignerType(byte: number): "Human" | "Agent" | "Organization" {
  switch (byte) {
    case 0: return "Human";
    case 1: return "Agent";
    case 2: return "Organization";
    default: return "Human";
  }
}

export function parseSignatureTier(byte: number): "WalletNotarization" | "VerifiedSigner" | "AgentOnBehalf" {
  switch (byte) {
    case 0: return "WalletNotarization";
    case 1: return "VerifiedSigner";
    case 2: return "AgentOnBehalf";
    default: return "WalletNotarization";
  }
}

export function parseSignatureStatus(byte: number): "Active" | "Revoked" {
  return byte === 0 ? "Active" : "Revoked";
}

export function parseHumanProfile(data: Buffer): HumanProfile | null {
  try {
    if (data.length < 80) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.HumanProfile)) return null;
    let offset = 8; // Skip discriminator

    const wallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanScore = data.readUInt16LE(offset);
    offset += 2;

    const isUnique = data[offset] === 1;
    offset += 1;

    const totalAttestationCount = data.readUInt32LE(offset);
    offset += 4;

    const activeAttestationCount = data.readUInt32LE(offset);
    offset += 4;

    const lastAttestationAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastScoreUpdate = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip attestations vec (4 bytes length + variable data)
    const attestationsLen = data.readUInt32LE(offset);
    offset += 4;
    offset += attestationsLen * 75;

    const canRegisterAgents = data[offset] === 1;
    offset += 1;

    const agentsRegistered = data.readUInt32LE(offset);
    offset += 4;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const bump = data[offset];

    return {
      wallet,
      humanScore,
      isUnique,
      totalAttestationCount,
      activeAttestationCount,
      lastAttestationAt,
      lastScoreUpdate,
      canRegisterAgents,
      agentsRegistered,
      createdAt,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse human profile:", e);
    return null;
  }
}

export function parseAgentProfile(data: Buffer, pda: PublicKey): AgentAccount | null {
  try {
    if (data.length < 200) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.AgentProfile)) return null;
    let offset = 8; // Skip discriminator

    const ownerPrincipal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const signingKey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const nameBytes = data.slice(offset, offset + 32);
    const name = Buffer.from(nameBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const metadataHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const teeMeasurement = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const hasTeeMeasurement = data[offset] === 1;
    offset += 1;

    const status = parseAgentStatus(data[offset]);
    offset += 1;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastStatusChange = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastMetadataUpdate = Number(data.readBigInt64LE(offset));
    offset += 8;

    const capabilityCount = data.readUInt32LE(offset);
    offset += 4;

    const actionCount = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const nonce = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      ownerPrincipal,
      signingKey,
      name,
      metadataHash,
      teeMeasurement,
      hasTeeMeasurement,
      status,
      createdAt,
      lastStatusChange,
      lastMetadataUpdate,
      capabilityCount,
      actionCount,
      nonce,
      bump,
      pda,
    };
  } catch (e) {
    console.error("Failed to parse agent profile:", e);
    return null;
  }
}

export function parseCapability(data: Buffer, pda: PublicKey): Capability | null {
  try {
    if (data.length < 400) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.Capability)) return null;
    let offset = 8; // Skip discriminator

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const allowedPrograms = data.readBigUInt64LE(offset);
    offset += 8;

    const allowedAssets = data.readBigUInt64LE(offset);
    offset += 8;

    const perTxLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailyLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const totalLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const maxSlippageBps = data.readUInt16LE(offset);
    offset += 2;

    const maxFee = data.readBigUInt64LE(offset);
    offset += 8;

    const validFrom = Number(data.readBigInt64LE(offset));
    offset += 8;

    const expiresAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const cooldownSeconds = data.readUInt32LE(offset);
    offset += 4;

    const riskTier = data[offset];
    offset += 1;

    const status = parseCapabilityStatus(data[offset]);
    offset += 1;

    const issuedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastUsedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const dailySpent = data.readBigUInt64LE(offset);
    offset += 8;

    const currentDay = data.readUInt32LE(offset);
    offset += 4;

    const totalSpent = data.readBigUInt64LE(offset);
    offset += 8;

    const useCount = data.readBigUInt64LE(offset);
    offset += 8;

    const enforceAllowlist = data[offset] === 1;
    offset += 1;

    // Skip allowlist_count (1 byte) + destination_allowlist (10 * 32 bytes) + dispute_reason (32 bytes)
    offset += 1 + 320 + 32;

    const nonce = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      principal,
      agent,
      allowedPrograms,
      allowedAssets,
      perTxLimit,
      dailyLimit,
      totalLimit,
      maxSlippageBps,
      maxFee,
      validFrom,
      expiresAt,
      cooldownSeconds,
      riskTier,
      status,
      issuedAt,
      lastUsedAt,
      dailySpent,
      currentDay,
      totalSpent,
      useCount,
      enforceAllowlist,
      nonce,
      bump,
      pda,
      isFrozen: false, // resolved externally by checking freeze PDA
    };
  } catch (e) {
    console.error("Failed to parse capability:", e);
    return null;
  }
}

export function parseFreezeAccount(data: Buffer): FreezeAccount | null {
  try {
    if (data.length < 80) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.EmergencyFreezeRecord)) return null;
    let offset = 8; // Skip discriminator

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const frozen = data[offset] === 1;
    offset += 1;

    const frozenAt = data.readBigInt64LE(offset);

    return {
      principal,
      agent,
      frozen,
      frozenAt: frozenAt > 0 ? frozenAt : null,
    };
  } catch (e) {
    console.error("Failed to parse freeze account:", e);
    return null;
  }
}

export function parseReceipt(data: Buffer, pda: PublicKey): Receipt | null {
  try {
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.ActionReceipt)) return null;

    let offset = 8;
    const principalId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const agentId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const capabilityId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const actionHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const resultHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const actionType = data[offset]; offset += 1;
    const amount = data.readBigUInt64LE(offset); offset += 8;
    const destination = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const timestamp = Number(data.readBigInt64LE(offset)); offset += 8;
    const slot = data.readBigUInt64LE(offset); offset += 8;
    const blockHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const offchainRef = new Uint8Array(data.slice(offset, offset + 64)); offset += 64;
    const hasOffchainRef = data[offset] === 1; offset += 1;
    const sequence = data.readBigUInt64LE(offset); offset += 8;
    const nonce = data.readBigUInt64LE(offset); offset += 8;
    const bump = data[offset];

    return {
      principalId,
      agentId,
      capabilityId,
      actionHash,
      resultHash,
      actionType,
      amount,
      destination,
      timestamp,
      slot,
      blockHash,
      offchainRef,
      hasOffchainRef,
      sequence,
      nonce,
      bump,
      pda,
    };
  } catch (err) {
    console.error("Failed to parse ActionReceipt:", err);
    return null;
  }
}

export function parseDocument(pubkey: PublicKey, data: Buffer): DocumentRecord | null {
  try {
    if (data.length < 150) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.Document)) return null;
    let offset = 8; // Skip discriminator

    const docHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    // hash_algorithm (1 byte)
    offset += 1;

    const schemaBytes = data.slice(offset, offset + 32);
    const schema = Buffer.from(schemaBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const uriBytes = data.slice(offset, offset + 128);
    offset += 128;

    const hasUri = data[offset] === 1;
    offset += 1;

    const uri = hasUri ? Buffer.from(uriBytes).toString("utf-8").replace(/\0/g, "").trim() : null;

    // Skip metadata_hash (32) + has_metadata (1)
    offset += 33;

    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const status = parseDocumentStatus(data[offset]);
    offset += 1;

    const signatureCount = data.readUInt32LE(offset);
    offset += 4;

    // Skip required_signers_count (1)
    offset += 1;

    const createdAtSlot = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip finalized_at_slot
    offset += 8;

    const finalizedAtTs = Number(data.readBigInt64LE(offset));
    const finalizedAt = finalizedAtTs > 0 ? finalizedAtTs : null;

    return {
      pubkey,
      docHash,
      docHashHex: bytesToHex(docHash),
      creator,
      schema,
      uri,
      status,
      signatureCount,
      createdAt,
      finalizedAt,
    };
  } catch (e) {
    console.error("Failed to parse document:", e);
    return null;
  }
}

export function parseSignatureRecord(pubkey: PublicKey, data: Buffer): SignatureRecord | null {
  try {
    if (data.length < 200) return null;
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.SignatureRecord)) return null;
    let offset = 8; // Skip discriminator

    const document = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const signerType = parseSignerType(data[offset]);
    offset += 1;

    const signerPubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Skip principal_pubkey (32) + has_principal (1) + capability_id (32) + has_capability (1)
    // + attestation_id (32) + has_attestation (1) + signature_mode (1) + signature_bytes (64) + has_signature_bytes (1)
    offset += 32 + 1 + 32 + 1 + 32 + 1 + 1 + 64 + 1;

    const roleBytes = data.slice(offset, offset + 32);
    const role = Buffer.from(roleBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const tier = parseSignatureTier(data[offset]);
    offset += 1;

    const status = parseSignatureStatus(data[offset]);
    offset += 1;

    // Skip signed_at_slot
    offset += 8;

    const signedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip revoked_at_slot (8) + revoked_at_ts (8) + metadata (64) + has_metadata (1)
    offset += 8 + 8 + 64 + 1;

    const humanScoreAtSigning = data.readUInt16LE(offset);

    return {
      pubkey,
      document,
      signerPubkey,
      signerType,
      role,
      tier,
      status,
      signedAt,
      humanScoreAtSigning,
    };
  } catch (e) {
    console.error("Failed to parse signature record:", e);
    return null;
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length !== 64) {
    throw new Error("Invalid SHA-256 hash: must be 64 hex characters");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function getActionTypeName(actionType: number): string {
  const names: Record<number, string> = {
    0: "Transfer", 1: "Swap", 2: "Stake", 3: "Unstake",
    4: "Task Response", 5: "Document Sign", 6: "Payment", 7: "Custom",
  };
  return names[actionType] || `Action #${actionType}`;
}

// ============================================================================
// HUMANRAIL DWALLET GUARD PARSERS (Phase 2 — skeleton)
// ============================================================================
// These parsers are placeholder skeletons. Once the Anchor IDL is generated
// from the Rust program, the exact discriminators and field offsets should be
// verified and these parsers completed.



export function parseGuardedDwalletStatus(frozen: boolean): "Active" | "Frozen" {
  return frozen ? "Frozen" : "Active";
}

export function parseGuardSigningRequestStatus(statusByte: number): GuardSigningRequest["status"] {
  switch (statusByte) {
    case 0: return "Pending";
    case 1: return "Approved";
    case 2: return "Rejected";
    default: return "Pending";
  }
}

/** Parse a GuardedDwallet account from raw on-chain data.
 *  TODO: verify offsets against generated IDL after Anchor build.
 */
export function parseGuardedDwallet(data: Buffer, pda: PublicKey): GuardedDwallet | null {
  try {
    if (data.length < 80) return null;
    let offset = 8; // Skip discriminator

    const version = data[offset];
    offset += 1;

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanProfile = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanrailCapability = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const dwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const allowedChainId = data.readUInt32LE(offset);
    offset += 4;

    const allowedAssetHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const allowedRecipientHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const perTxLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailyLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const totalLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailySpent = data.readBigUInt64LE(offset);
    offset += 8;

    const totalSpent = data.readBigUInt64LE(offset);
    offset += 8;

    const lastSpendDay = data.readBigInt64LE(offset);
    offset += 8;

    const expiresAt = data.readBigInt64LE(offset);
    offset += 8;

    const frozen = data[offset] === 1;
    offset += 1;

    const bump = data[offset];

    return {
      version,
      principal,
      humanProfile,
      agent,
      humanrailCapability,
      dwallet,
      allowedChainId,
      allowedAssetHash,
      allowedRecipientHash,
      perTxLimit,
      dailyLimit,
      totalLimit,
      dailySpent,
      totalSpent,
      lastSpendDay,
      expiresAt,
      frozen,
      bump,
      pda,
    };
  } catch (e) {
    console.error("Failed to parse GuardedDwallet:", e);
    return null;
  }
}

/** Parse a GuardSigningRequest account from raw on-chain data.
 *  TODO: verify offsets against generated IDL after Anchor build.
 */
export function parseGuardSigningRequest(data: Buffer, pda: PublicKey): GuardSigningRequest | null {
  try {
    if (data.length < 200) return null;
    let offset = 8; // Skip discriminator

    const version = data[offset];
    offset += 1;

    const requestId = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const guardedDwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const dwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const messageDigest = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const messageMetadataDigest = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const destinationChainId = data.readUInt32LE(offset);
    offset += 4;

    const assetHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const recipientHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const amount = data.readBigUInt64LE(offset);
    offset += 8;

    const signatureScheme = data.readUInt16LE(offset);
    offset += 2;

    const statusByte = data[offset];
    const status = parseGuardSigningRequestStatus(statusByte);
    offset += 1;

    const rejectionCodeNum = data.readUInt16LE(offset);
    const rejectionCode = guardRejectionCodeFromNumber(rejectionCodeNum);
    offset += 2;

    const ikaMessageApproval = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const createdAt = data.readBigInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      version,
      requestId,
      guardedDwallet,
      principal,
      agent,
      dwallet,
      messageDigest,
      messageMetadataDigest,
      destinationChainId,
      assetHash,
      recipientHash,
      amount,
      signatureScheme,
      status,
      rejectionCode,
      ikaMessageApproval,
      createdAt,
      bump,
      pda,
    };
  } catch (e) {
    console.error("Failed to parse GuardSigningRequest:", e);
    return null;
  }
}
