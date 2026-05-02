import { PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_SEED_DWALLET,
  IKA_SEED_MESSAGE_APPROVAL,
  IKA_CPI_AUTHORITY_SEED,
} from "./types.js";
import type { DWalletCurve, IkaSignatureScheme } from "./types.js";

export function dwalletPdaSeeds(curve: DWalletCurve, publicKey: Uint8Array): Buffer[] {
  const payload = Buffer.alloc(2 + publicKey.length);
  payload.writeUInt16LE(curve, 0);
  Buffer.from(publicKey).copy(payload, 2);
  const seeds: Buffer[] = [Buffer.from(IKA_SEED_DWALLET)];
  for (let i = 0; i < payload.length; i += 32) {
    seeds.push(payload.subarray(i, Math.min(i + 32, payload.length)));
  }
  return seeds;
}

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
  if (messageMetadataDigest) {
    const metaBuf = Buffer.from(messageMetadataDigest);
    if (metaBuf.length === 32) {
      const isZero = metaBuf.every((b) => b === 0);
      if (!isZero) seeds.push(metaBuf);
    }
  }
  return PublicKey.findProgramAddressSync(seeds, programId);
}

export function deriveIkaCpiAuthorityPda(callerProgramId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(IKA_CPI_AUTHORITY_SEED)],
    callerProgramId
  );
}

export function deriveIkaCoordinatorPda(
  programId: PublicKey = IKA_DWALLET_PROGRAM_ID_DEVNET
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dwallet_coordinator")],
    programId
  );
}

export function deriveHumanRailGuardCpiAuthority(
  guardProgramId: PublicKey
): [PublicKey, number] {
  return deriveIkaCpiAuthorityPda(guardProgramId);
}
