/**
 * Ika dWallet Protocol — TypeScript Types and Enums
 *
 * Mirrors the Rust types from crates/ika-dwallet-types/src/lib.rs
 * and chains/solana/sdk/types/src/accounts.rs.
 */

import { PublicKey } from "@solana/web3.js";

// ── dWallet Curve ──

export enum DWalletCurve {
  Secp256k1 = 0,
  Secp256r1 = 1,
  Curve25519 = 2,
  Ristretto = 3,
}

// ── dWallet State ──

export enum DWalletState {
  DKGInProgress = 0,
  Active = 1,
  Frozen = 2,
}

// ── Ika Signature Scheme ──

export enum IkaSignatureScheme {
  EcdsaKeccak256 = 0,
  EcdsaSha256 = 1,
  EcdsaDoubleSha256 = 2,
  TaprootSha256 = 3,
  EcdsaBlake2b256 = 4,
  EddsaSha512 = 5,
  SchnorrkelMerlin = 6,
}

// ── MessageApproval Status ──

export enum MessageApprovalStatus {
  Pending = 0,
  Signed = 1,
}

// ── Parsed Account Types ──

export interface IkaDwallet {
  /** Account discriminator (should be 2). */
  discriminator: number;
  /** Account version (should be 1). */
  version: number;
  /** Current authority of the dWallet. */
  authority: PublicKey;
  /** Cryptographic curve. */
  curve: DWalletCurve;
  /** Current state. */
  state: DWalletState;
  /** Length of the public key bytes actually stored. */
  publicKeyLen: number;
  /** Public key bytes (up to 65 bytes). */
  publicKey: Uint8Array;
  /** Epoch when the dWallet was created. */
  createdEpoch: bigint;
  /** Network-owned address (NOA) public key. */
  noaPublicKey: PublicKey;
  /** Whether this is an imported key dWallet. */
  isImported: boolean;
  /** PDA bump. */
  bump: number;
}

export interface IkaMessageApproval {
  /** Account discriminator (should be 14). */
  discriminator: number;
  /** Account version (should be 1). */
  version: number;
  /** The dWallet this approval is for. */
  dwallet: PublicKey;
  /** The message hash (keccak256) that was approved. */
  messageDigest: Uint8Array;
  /** The approver pubkey (usually CPI authority PDA). */
  approver: PublicKey;
  /** The user pubkey associated with this approval. */
  userPubkey: PublicKey;
  /** Signature scheme used. */
  signatureScheme: IkaSignatureScheme;
  /** Current status. */
  status: MessageApprovalStatus;
  /** Length of the committed signature (0 if pending). */
  signatureLen: number;
  /** The committed signature bytes. */
  signature: Uint8Array;
}

// ── gRPC Types (honest stubs — not faked) ──

export interface IkaSignRequest {
  dwalletId: string;
  messageDigest: Uint8Array;
  signatureScheme: IkaSignatureScheme;
  approvalProof: Uint8Array;
}

export interface IkaSignResult {
  signature: Uint8Array;
  status: "pending" | "signed" | "failed";
}

// ── Error Types ──

export class IkaNotImplementedError extends Error {
  constructor(method: string) {
    super(
      `IkaClient.${method} is not yet implemented. ` +
        `This operation requires a real Ika dWallet created via gRPC DKG. ` +
        `See docs/IKA_INTEGRATION_RUNBOOK.md for Phase 5B planning.`
    );
    this.name = "IkaNotImplementedError";
  }
}

export class IkaAccountParseError extends Error {
  constructor(message: string) {
    super(`Ika account parse error: ${message}`);
    this.name = "IkaAccountParseError";
  }
}
