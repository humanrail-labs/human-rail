/**
 * Minimal Ika types for worker live execution.
 * Duplicated from lib/ika/types.ts and lib/ika/constants.ts
 * to avoid cross-package import issues.
 */

import { PublicKey } from "@solana/web3.js";

export enum DWalletCurve {
  Secp256k1 = 0,
  Secp256r1 = 1,
  Curve25519 = 2,
  Ristretto = 3,
}

export enum DWalletState {
  DKGInProgress = 0,
  Active = 1,
  Frozen = 2,
}

export enum IkaSignatureScheme {
  EcdsaKeccak256 = 0,
  EcdsaSha256 = 1,
  EcdsaDoubleSha256 = 2,
  TaprootSha256 = 3,
  EcdsaBlake2b256 = 4,
  EddsaSha512 = 5,
  SchnorrkelMerlin = 6,
}

export enum MessageApprovalStatus {
  Pending = 0,
  Signed = 1,
}

export const IKA_DWALLET_PROGRAM_ID_DEVNET = new PublicKey(
  "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"
);

export const IKA_DISC_DWALLET = 2;
export const IKA_DISC_MESSAGE_APPROVAL = 14;
export const IKA_DWALLET_LEN = 153;
export const IKA_MESSAGE_APPROVAL_LEN = 312;

export const IKA_SEED_DWALLET = "dwallet";
export const IKA_SEED_MESSAGE_APPROVAL = "message_approval";
export const IKA_CPI_AUTHORITY_SEED = "__ika_cpi_authority";

export interface IkaDwallet {
  discriminator: number;
  version: number;
  authority: PublicKey;
  curve: DWalletCurve;
  state: DWalletState;
  publicKeyLen: number;
  publicKey: Uint8Array;
  createdEpoch: bigint;
  noaPublicKey: PublicKey;
  isImported: boolean;
  bump: number;
}

export interface IkaMessageApproval {
  discriminator: number;
  version: number;
  dwallet: PublicKey;
  messageDigest: Uint8Array;
  messageMetadataDigest: Uint8Array;
  approver: PublicKey;
  userPubkey: PublicKey;
  signatureScheme: IkaSignatureScheme;
  epoch: bigint;
  status: MessageApprovalStatus;
  signatureLen: number;
  signature: Uint8Array;
  bump: number;
}
