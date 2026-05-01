/**
 * Ika dWallet Protocol — PDA Derivation Helpers
 *
 * Mirrors the on-chain DWalletPdaSeeds::new logic from the Ika program.
 * Verified against:
 * - chains/solana/examples/_shared/ika-setup.ts (dwalletPdaSeeds)
 * - chains/solana/examples/voting/e2e-rust/src/main.rs (pack_dwallet_seed_payload)
 */

import { PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_SEED_DWALLET,
  IKA_SEED_MESSAGE_APPROVAL,
  IKA_CPI_AUTHORITY_SEED,
} from "./constants";
import { DWalletCurve, IkaSignatureScheme } from "./types";

/**
 * Build the dWallet PDA seed list for `findProgramAddress`.
 *
 * Concatenates `curve_u16_le || public_key` into a single buffer and splits
 * it into 32-byte chunks (Solana's MAX_SEED_LEN). Each chunk becomes its own
 * seed. The total seed count varies by pubkey length but stays under MAX_SEEDS.
 *
 *   - 32-byte pubkey (Ed25519/Curve25519/Ristretto): payload 34 bytes → [32, 2]
 *   - 33-byte pubkey (compressed Secp256k1/r1):      payload 35 bytes → [32, 3]
 *   - 65-byte pubkey (uncompressed SEC1):            payload 67 bytes → [32, 32, 3]
 */
export function dwalletPdaSeeds(
  curve: DWalletCurve,
  publicKey: Uint8Array
): Buffer[] {
  const payload = Buffer.alloc(2 + publicKey.length);
  payload.writeUInt16LE(curve, 0);
  Buffer.from(publicKey).copy(payload, 2);

  const seeds: Buffer[] = [Buffer.from(IKA_SEED_DWALLET)];
  for (let i = 0; i < payload.length; i += 32) {
    seeds.push(payload.subarray(i, Math.min(i + 32, payload.length)));
  }
  return seeds;
}

/**
 * Derive the Ika dWallet PDA address.
 *
 * @param curve - The dWallet curve (u16 LE encoded in seeds).
 * @param publicKey - The raw dWallet public key bytes.
 * @param programId - Ika dWallet program ID (defaults to devnet).
 */
export function deriveIkaDwalletPda(
  curve: DWalletCurve,
  publicKey: Uint8Array,
  programId: PublicKey = IKA_DWALLET_PROGRAM_ID_DEVNET
): [PublicKey, number] {
  const seeds = dwalletPdaSeeds(curve, publicKey).map((b) => b);
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Derive the Ika MessageApproval PDA address.
 *
 * The seeds are hierarchical: they reuse the dWallet PDA seed prefix,
 * then append "message_approval", the scheme as u16 LE, the message digest,
 * and optionally the message_metadata_digest (only included when non-zero).
 *
 * Seeds: ["dwallet", chunks(curve_u16_le || pk), "message_approval", scheme_u16_le, message_digest, [message_metadata_digest]]
 *
 * Per the Ika docs, the message_metadata_digest seed is only included when
 * it is non-zero. Using the wrong seeds will produce a PDA mismatch.
 *
 * @param curve - The dWallet curve.
 * @param publicKey - The raw dWallet public key bytes.
 * @param signatureScheme - The signature scheme (u16 LE encoded).
 * @param messageDigest - The keccak256 message digest (32 bytes).
 * @param messageMetadataDigest - Optional keccak256 metadata digest (32 bytes). Only included in seeds when non-zero.
 * @param programId - Ika dWallet program ID (defaults to devnet).
 */
export function deriveIkaMessageApprovalPda(
  curve: DWalletCurve,
  publicKey: Uint8Array,
  signatureScheme: IkaSignatureScheme,
  messageDigest: Uint8Array,
  messageMetadataDigest?: Uint8Array,
  programId: PublicKey = IKA_DWALLET_PROGRAM_ID_DEVNET
): [PublicKey, number] {
  const schemeBuf = Buffer.alloc(2);
  schemeBuf.writeUInt16LE(signatureScheme, 0);

  const seeds = [
    ...dwalletPdaSeeds(curve, publicKey),
    Buffer.from(IKA_SEED_MESSAGE_APPROVAL),
    schemeBuf,
    Buffer.from(messageDigest),
  ];

  // Per Ika docs: message_metadata_digest seed is only included when non-zero
  if (messageMetadataDigest) {
    const metaBuf = Buffer.from(messageMetadataDigest);
    if (metaBuf.length === 32) {
      const isZero = metaBuf.every((b) => b === 0);
      if (!isZero) {
        seeds.push(metaBuf);
      }
    }
  }

  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Derive the CPI authority PDA for a given caller program.
 *
 * This PDA is what the Ika program expects as the dWallet authority
 * when a program calls approve_message via CPI.
 *
 * @param callerProgramId - The program that will invoke Ika via CPI.
 */
export function deriveIkaCpiAuthorityPda(
  callerProgramId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(IKA_CPI_AUTHORITY_SEED)],
    callerProgramId
  );
}

/**
 * Derive the DWalletCoordinator PDA.
 *
 * @param programId - Ika dWallet program ID (defaults to devnet).
 */
export function deriveIkaCoordinatorPda(
  programId: PublicKey = IKA_DWALLET_PROGRAM_ID_DEVNET
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dwallet_coordinator")],
    programId
  );
}

/**
 * Derive the GasDeposit PDA for a user.
 *
 * Seeds: ["gas_deposit", user_pubkey]
 *
 * @param userPubkey - The user's Ed25519 public key (32 bytes).
 * @param programId - Ika dWallet program ID (defaults to devnet).
 */
export function deriveIkaGasDepositPda(
  userPubkey: Uint8Array,
  programId: PublicKey = IKA_DWALLET_PROGRAM_ID_DEVNET
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gas_deposit"), Buffer.from(userPubkey)],
    programId
  );
}

/**
 * Derive the HumanRail Guard CPI authority PDA.
 *
 * Convenience wrapper that uses the active HumanRail Guard program ID.
 */
export function deriveHumanRailGuardCpiAuthority(
  guardProgramId: PublicKey
): [PublicKey, number] {
  return deriveIkaCpiAuthorityPda(guardProgramId);
}
