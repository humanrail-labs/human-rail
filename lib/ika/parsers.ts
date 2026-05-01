/**
 * Ika dWallet Protocol — Raw Account Parsers
 *
 * Parses raw Solana account data (including discriminator + version prefix)
 * into typed field accessors.
 *
 * Layouts verified from:
 * - Real 153-byte devnet dWallet accounts (Phase 5B)
 * - chains/solana/examples/voting/e2e-rust/src/main.rs (MessageApproval offsets)
 */

import { PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_LEN,
  IKA_MESSAGE_APPROVAL_LEN,
  IKA_DISC_DWALLET,
  IKA_DISC_MESSAGE_APPROVAL,
  IKA_DW_OFFSET_AUTHORITY,
  IKA_DW_OFFSET_CURVE,
  IKA_DW_OFFSET_STATE,
  IKA_DW_OFFSET_PUBLIC_KEY_LEN,
  IKA_DW_OFFSET_PUBLIC_KEY,
  IKA_DW_OFFSET_CREATED_EPOCH,
  IKA_DW_OFFSET_NOA_PUBLIC_KEY,
  IKA_DW_OFFSET_IS_IMPORTED,
  IKA_DW_OFFSET_BUMP,
  IKA_MA_OFFSET_DWALLET,
  IKA_MA_OFFSET_MESSAGE_DIGEST,
  IKA_MA_OFFSET_MESSAGE_METADATA_DIGEST,
  IKA_MA_OFFSET_APPROVER,
  IKA_MA_OFFSET_USER_PUBKEY,
  IKA_MA_OFFSET_SIGNATURE_SCHEME,
  IKA_MA_OFFSET_EPOCH,
  IKA_MA_OFFSET_STATUS,
  IKA_MA_OFFSET_SIGNATURE_LEN,
  IKA_MA_OFFSET_SIGNATURE,
  IKA_MA_OFFSET_BUMP,
} from "./constants";
import {
  DWalletCurve,
  DWalletState,
  IkaSignatureScheme,
  MessageApprovalStatus,
  IkaDwallet,
  IkaMessageApproval,
  IkaAccountParseError,
} from "./types";

/** Check if a 32-byte array is all zeros. */
export function isZero32(bytes: Uint8Array): boolean {
  if (bytes.length !== 32) return false;
  for (let i = 0; i < 32; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

// ── DWallet Parser ──

/**
 * Parse raw Ika dWallet account data.
 *
 * Layout (153 bytes):
 *   0      discriminator (1)
 *   1      version (1)
 *   2..34  authority (32)
 *   34..36 curve u16 LE (2)
 *   36     state (1)
 *   37     public_key_len (1)
 *   38..103 public_key (65 bytes padded)
 *   103..111 created_epoch u64 LE (8)
 *   111..143 noa_public_key (32)
 *   143    is_imported (1)
 *   144    bump (1)
 *   145..153 reserved (8)
 *
 * @param data - Raw account data from Solana RPC.
 * @returns Parsed IkaDwallet or null if data is invalid/too short.
 * @throws IkaAccountParseError if data is malformed in an unexpected way.
 */
export function parseIkaDwalletAccount(data: Buffer | Uint8Array): IkaDwallet | null {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (buf.length < IKA_DWALLET_LEN) {
    return null;
  }

  const discriminator = buf[0];
  if (discriminator !== IKA_DISC_DWALLET) {
    return null;
  }

  const version = buf[1];
  if (version !== 1) {
    console.warn(
      `[parseIkaDwalletAccount] Unexpected version ${version} (expected 1). ` +
        `Ika program revision may have changed.`
    );
  }

  try {
    const authority = new PublicKey(
      buf.slice(IKA_DW_OFFSET_AUTHORITY, IKA_DW_OFFSET_AUTHORITY + 32)
    );

    // Curve is stored as u16 LE (2 bytes). All current curve values fit in the low byte.
    const curveRaw = buf.readUInt16LE(IKA_DW_OFFSET_CURVE);
    const curve = Object.values(DWalletCurve).includes(curveRaw)
      ? (curveRaw as DWalletCurve)
      : DWalletCurve.Secp256k1;

    const stateRaw = buf[IKA_DW_OFFSET_STATE];
    const state = Object.values(DWalletState).includes(stateRaw)
      ? (stateRaw as DWalletState)
      : DWalletState.DKGInProgress;

    const publicKeyLen = buf[IKA_DW_OFFSET_PUBLIC_KEY_LEN];
    const publicKey = new Uint8Array(
      buf.slice(
        IKA_DW_OFFSET_PUBLIC_KEY,
        IKA_DW_OFFSET_PUBLIC_KEY + Math.min(publicKeyLen, 65)
      )
    );

    const createdEpoch = buf.readBigUInt64LE(IKA_DW_OFFSET_CREATED_EPOCH);

    const noaPublicKey = new PublicKey(
      buf.slice(IKA_DW_OFFSET_NOA_PUBLIC_KEY, IKA_DW_OFFSET_NOA_PUBLIC_KEY + 32)
    );

    const isImported = buf[IKA_DW_OFFSET_IS_IMPORTED] === 1;
    const bump = buf[IKA_DW_OFFSET_BUMP];

    return {
      discriminator,
      version,
      authority,
      curve,
      state,
      publicKeyLen,
      publicKey,
      createdEpoch,
      noaPublicKey,
      isImported,
      bump,
    };
  } catch (err) {
    throw new IkaAccountParseError(
      `Failed to parse dWallet account: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ── MessageApproval Parser ──

/**
 * Parse raw Ika MessageApproval account data.
 *
 * Layout (312 bytes):
 *   0      discriminator (1)
 *   1      version (1)
 *   2..34  dwallet (32)
 *   34..66 message_digest (32)
 *   66..98 message_metadata_digest (32)
 *   98..130 approver (32)
 *   130..162 user_pubkey (32)
 *   162..164 signature_scheme u16 LE (2)
 *   164..172 epoch u64 LE (8)
 *   172    status (1)
 *   173..175 signature_len u16 LE (2)
 *   175..303 signature (128 bytes padded)
 *   303    bump (1)
 *   304..312 reserved (8)
 *
 * @param data - Raw account data from Solana RPC.
 * @returns Parsed IkaMessageApproval or null if data is invalid/too short.
 * @throws IkaAccountParseError if data is malformed in an unexpected way.
 */
export function parseIkaMessageApprovalAccount(
  data: Buffer | Uint8Array
): IkaMessageApproval | null {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

  // Need at least up to the bump byte (303) + 1 = 304, or the full 312 bytes
  if (buf.length < IKA_MESSAGE_APPROVAL_LEN) {
    return null;
  }

  const discriminator = buf[0];
  if (discriminator !== IKA_DISC_MESSAGE_APPROVAL) {
    return null;
  }

  const version = buf[1];
  if (version !== 1) {
    console.warn(
      `[parseIkaMessageApprovalAccount] Unexpected version ${version} (expected 1). ` +
        `Ika program revision may have changed.`
    );
  }

  try {
    const dwallet = new PublicKey(
      buf.slice(IKA_MA_OFFSET_DWALLET, IKA_MA_OFFSET_DWALLET + 32)
    );

    const messageDigest = new Uint8Array(
      buf.slice(IKA_MA_OFFSET_MESSAGE_DIGEST, IKA_MA_OFFSET_MESSAGE_DIGEST + 32)
    );

    const messageMetadataDigest = new Uint8Array(
      buf.slice(IKA_MA_OFFSET_MESSAGE_METADATA_DIGEST, IKA_MA_OFFSET_MESSAGE_METADATA_DIGEST + 32)
    );

    const approver = new PublicKey(
      buf.slice(IKA_MA_OFFSET_APPROVER, IKA_MA_OFFSET_APPROVER + 32)
    );

    const userPubkey = new PublicKey(
      buf.slice(IKA_MA_OFFSET_USER_PUBKEY, IKA_MA_OFFSET_USER_PUBKEY + 32)
    );

    // signature_scheme is stored as u16 LE in the account data
    const schemeRaw = buf.readUInt16LE(IKA_MA_OFFSET_SIGNATURE_SCHEME);
    const signatureScheme = Object.values(IkaSignatureScheme).includes(schemeRaw)
      ? (schemeRaw as IkaSignatureScheme)
      : IkaSignatureScheme.EcdsaKeccak256;

    const epoch = buf.readBigUInt64LE(IKA_MA_OFFSET_EPOCH);

    const statusRaw = buf[IKA_MA_OFFSET_STATUS];
    const status =
      statusRaw === 1
        ? MessageApprovalStatus.Signed
        : MessageApprovalStatus.Pending;

    const signatureLen = buf.readUInt16LE(IKA_MA_OFFSET_SIGNATURE_LEN);

    // Validate signature doesn't overflow buffer
    const sigEnd = IKA_MA_OFFSET_SIGNATURE + signatureLen;
    if (sigEnd > buf.length) {
      throw new IkaAccountParseError(
        `Signature length ${signatureLen} exceeds account data length ${buf.length}`
      );
    }

    const signature = new Uint8Array(
      buf.slice(IKA_MA_OFFSET_SIGNATURE, sigEnd)
    );

    const bump = buf[IKA_MA_OFFSET_BUMP];

    return {
      discriminator,
      version,
      dwallet,
      messageDigest,
      messageMetadataDigest,
      approver,
      userPubkey,
      signatureScheme,
      epoch,
      status,
      signatureLen,
      signature,
      bump,
    };
  } catch (err) {
    if (err instanceof IkaAccountParseError) throw err;
    throw new IkaAccountParseError(
      `Failed to parse MessageApproval account: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
