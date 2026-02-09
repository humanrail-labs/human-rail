import {
  PublicKey,
  TransactionInstruction,
  Ed25519Program,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import { ATTESTATION_DOMAIN_SEPARATOR, ATTESTATION_SIGNING_BYTES_LEN } from './constants';

/**
 * Build the 146-byte signing message that matches on-chain create_signing_bytes:
 *
 *   24B  domain separator  "humanrail:attestation:v1"
 *   32B  profile PDA
 *   32B  issuer PDA
 *   32B  payload_hash
 *    2B  weight (u16 LE)
 *    8B  issued_at (i64 LE)
 *    8B  expires_at (i64 LE)
 *    8B  nonce (u64 LE)
 *  ────
 *  146B total
 */
export function createAttestationSigningBytes(params: {
  profilePda: PublicKey;
  issuerPda: PublicKey;
  payloadHash: Uint8Array; // 32 bytes
  weight: number;
  issuedAt: bigint | number;
  expiresAt: bigint | number;
  nonce: bigint | number;
}): Buffer {
  const buf = Buffer.alloc(ATTESTATION_SIGNING_BYTES_LEN);
  let offset = 0;

  // domain separator (24 bytes, utf-8, exact fit)
  buf.write(ATTESTATION_DOMAIN_SEPARATOR, offset, 'utf-8');
  offset += 24;

  // profile PDA (32 bytes)
  params.profilePda.toBuffer().copy(buf, offset);
  offset += 32;

  // issuer PDA (32 bytes)
  params.issuerPda.toBuffer().copy(buf, offset);
  offset += 32;

  // payload_hash (32 bytes)
  Buffer.from(params.payloadHash).copy(buf, offset);
  offset += 32;

  // weight (u16 LE)
  buf.writeUInt16LE(params.weight, offset);
  offset += 2;

  // issued_at (i64 LE)
  buf.writeBigInt64LE(BigInt(params.issuedAt), offset);
  offset += 8;

  // expires_at (i64 LE)
  buf.writeBigInt64LE(BigInt(params.expiresAt), offset);
  offset += 8;

  // nonce (u64 LE)
  buf.writeBigUInt64LE(BigInt(params.nonce), offset);
  offset += 8;

  if (offset !== ATTESTATION_SIGNING_BYTES_LEN) {
    throw new Error(`Signing bytes length mismatch: expected ${ATTESTATION_SIGNING_BYTES_LEN}, got ${offset}`);
  }

  return buf;
}

/**
 * Sign the 146-byte message with an Ed25519 secret key (64 bytes).
 * Returns { publicKey, signature }.
 */
export function signAttestationBytes(
  message: Buffer,
  secretKey: Uint8Array
): { publicKey: Uint8Array; signature: Uint8Array } {
  const signature = nacl.sign.detached(message, secretKey);
  const publicKey = secretKey.slice(32, 64);
  return { publicKey, signature };
}

/**
 * Build the Ed25519SigVerify precompile instruction.
 * Must appear BEFORE the issue_attestation ix in the same tx.
 */
export function createEd25519VerifyInstruction(
  publicKey: Uint8Array,
  message: Buffer,
  signature: Uint8Array
): TransactionInstruction {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey,
    message,
    signature,
  });
}

/**
 * Convenience: sign + build precompile ix in one call.
 */
export function prepareAttestationSignature(params: {
  profilePda: PublicKey;
  issuerPda: PublicKey;
  payloadHash: Uint8Array;
  weight: number;
  issuedAt: bigint | number;
  expiresAt: bigint | number;
  nonce: bigint | number;
  issuerSecretKey: Uint8Array;
}): {
  message: Buffer;
  signature: Uint8Array;
  publicKey: Uint8Array;
  ed25519Ix: TransactionInstruction;
} {
  const message = createAttestationSigningBytes(params);
  const { publicKey, signature } = signAttestationBytes(message, params.issuerSecretKey);
  const ed25519Ix = createEd25519VerifyInstruction(publicKey, message, signature);
  return { message, signature, publicKey, ed25519Ix };
}
