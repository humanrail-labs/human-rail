/**
 * Ika dWallet Protocol — Raw Account Parsers
 *
 * Parses raw Solana account data (including discriminator + version prefix)
 * into typed field accessors.
 *
 * Layouts verified from:
 * - chains/solana/examples/voting/e2e-rust/src/main.rs (MessageApproval offsets)
 * - chains/solana/examples/voting/pinocchio/tests/litesvm.rs (DWallet offsets)
 *
 * Note: The litesvm test uses a simplified DWallet layout for mock testing.
 * The e2e-rust examples confirm the MessageApproval offsets against the
 * real on-chain Ika program. DWallet offsets are the best available source
 * and should be re-verified when a real on-chain dWallet is inspected.
 */

import { PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_LEN,
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
  IKA_MA_OFFSET_MESSAGE_HASH,
  IKA_MA_OFFSET_APPROVER,
  IKA_MA_OFFSET_USER_PUBKEY,
  IKA_MA_OFFSET_SIGNATURE_SCHEME,
  IKA_MA_OFFSET_STATUS,
  IKA_MA_OFFSET_SIGNATURE_LEN,
  IKA_MA_OFFSET_SIGNATURE,
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
    // Version mismatch — may indicate a different Ika program revision.
    // We still attempt to parse but warn.
    console.warn(
      `[parseIkaDwalletAccount] Unexpected version ${version} (expected 1). ` +
        `Ika program revision may have changed.`
    );
  }

  try {
    const authority = new PublicKey(
      buf.slice(IKA_DW_OFFSET_AUTHORITY, IKA_DW_OFFSET_AUTHORITY + 32)
    );

    const curveRaw = buf[IKA_DW_OFFSET_CURVE];
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
 * Offsets verified from e2e-rust examples (voting + multisig).
 *
 * @param data - Raw account data from Solana RPC.
 * @returns Parsed IkaMessageApproval or null if data is invalid/too short.
 * @throws IkaAccountParseError if data is malformed in an unexpected way.
 */
export function parseIkaMessageApprovalAccount(
  data: Buffer | Uint8Array
): IkaMessageApproval | null {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

  // Minimum size: header(2) + dwallet(32) + message_hash(32) + approver(32) +
  //               user_pubkey(32) + signature_scheme(?) + status(1) = ~131
  // But we need at least up to the status byte (172) + signature_len (2) = 174
  if (buf.length < 174) {
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
      buf.slice(IKA_MA_OFFSET_MESSAGE_HASH, IKA_MA_OFFSET_MESSAGE_HASH + 32)
    );

    const approver = new PublicKey(
      buf.slice(IKA_MA_OFFSET_APPROVER, IKA_MA_OFFSET_APPROVER + 32)
    );

    const userPubkey = new PublicKey(
      buf.slice(IKA_MA_OFFSET_USER_PUBKEY, IKA_MA_OFFSET_USER_PUBKEY + 32)
    );

    // signature_scheme is stored as a single byte in the current pre-alpha
    // layout (e2e-rust reads ma_data[MA_SIGNATURE_SCHEME] as a single byte).
    // The Anchor CPI passes it as u16 in instruction data, but the account
    // stores only the low byte. This may change in future Ika revisions.
    const schemeRaw = buf[IKA_MA_OFFSET_SIGNATURE_SCHEME];
    const signatureScheme = Object.values(IkaSignatureScheme).includes(schemeRaw)
      ? (schemeRaw as IkaSignatureScheme)
      : IkaSignatureScheme.EcdsaKeccak256;

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

    return {
      discriminator,
      version,
      dwallet,
      messageDigest,
      approver,
      userPubkey,
      signatureScheme,
      status,
      signatureLen,
      signature,
    };
  } catch (err) {
    if (err instanceof IkaAccountParseError) throw err;
    throw new IkaAccountParseError(
      `Failed to parse MessageApproval account: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
