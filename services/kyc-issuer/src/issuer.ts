import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Ed25519Program,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import * as crypto from 'crypto';

const DOMAIN = 'humanrail:attestation:v1';
const MSG_LEN = 146;
const HUMAN_REGISTRY_PROGRAM_ID = new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo');
const SYSVAR_INSTRUCTIONS = new PublicKey('Sysvar1nstructions1111111111111111111111111');
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');

export function deriveProfilePda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('human_profile'), wallet.toBuffer()],
    HUMAN_REGISTRY_PROGRAM_ID
  );
}

export function deriveIssuerPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('issuer'), authority.toBuffer()],
    HUMAN_REGISTRY_PROGRAM_ID
  );
}

export function deriveAttestationPda(
  profile: PublicKey, issuer: PublicKey, nonce: number
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(nonce));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('attestation'), profile.toBuffer(), issuer.toBuffer(), buf],
    HUMAN_REGISTRY_PROGRAM_ID
  );
}

function buildSigningBytes(
  profilePda: PublicKey,
  issuerPda: PublicKey,
  payloadHash: Uint8Array,
  weight: number,
  issuedAt: number,
  expiresAt: number,
  nonce: number
): Uint8Array {
  const buf = new ArrayBuffer(MSG_LEN);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);

  let off = 0;
  // domain (24 bytes)
  const domBytes = new TextEncoder().encode(DOMAIN);
  arr.set(domBytes, off); off += 24;
  // profile (32)
  arr.set(profilePda.toBytes(), off); off += 32;
  // issuer (32)
  arr.set(issuerPda.toBytes(), off); off += 32;
  // payload_hash (32)
  arr.set(payloadHash, off); off += 32;
  // weight u16 LE
  view.setUint16(off, weight, true); off += 2;
  // issued_at i64 LE
  view.setBigInt64(off, BigInt(issuedAt), true); off += 8;
  // expires_at i64 LE
  view.setBigInt64(off, BigInt(expiresAt), true); off += 8;
  // nonce u64 LE
  view.setBigUint64(off, BigInt(nonce), true); off += 8;

  return arr;
}

function buildIssueAttestationIxData(
  payloadHash: Uint8Array,
  weight: number,
  issuedAt: number,
  expiresAt: number,
  nonce: number,
  signature: Uint8Array
): Buffer {
  const discSrc = crypto.createHash('sha256').update('global:issue_attestation').digest();
  const disc = new Uint8Array(discSrc.buffer, discSrc.byteOffset, 8);

  const total = 8 + 32 + 2 + 8 + 8 + 8 + 64; // 130
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);
  let off = 0;

  arr.set(disc, off); off += 8;
  arr.set(payloadHash, off); off += 32;
  view.setUint16(off, weight, true); off += 2;
  view.setBigInt64(off, BigInt(issuedAt), true); off += 8;
  view.setBigInt64(off, BigInt(expiresAt), true); off += 8;
  view.setBigUint64(off, BigInt(nonce), true); off += 8;
  arr.set(signature, off); off += 64;

  return Buffer.from(buf);
}

export interface IssueAttestationResult {
  txSignature: string;
  attestationPda: string;
  profilePda: string;
}

export async function issueAttestationOnChain(params: {
  connection: Connection;
  issuerKeypair: Keypair;
  walletPubkey: PublicKey;
  payloadHash: Uint8Array;
  weight: number;
  validitySeconds: number;
  nonce: number;
}): Promise<IssueAttestationResult> {
  const { connection, issuerKeypair, walletPubkey, payloadHash, weight, validitySeconds, nonce } = params;

  const [profilePda] = deriveProfilePda(walletPubkey);
  const [issuerPda] = deriveIssuerPda(issuerKeypair.publicKey);
  const [attestationPda] = deriveAttestationPda(profilePda, issuerPda, nonce);

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + validitySeconds;

  const message = buildSigningBytes(profilePda, issuerPda, payloadHash, weight, issuedAt, expiresAt, nonce);
  const signature = nacl.sign.detached(message, issuerKeypair.secretKey);

  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: issuerKeypair.publicKey.toBytes(),
    message,
    signature,
  });

  const ixData = buildIssueAttestationIxData(payloadHash, weight, issuedAt, expiresAt, nonce, signature);

  const issueIx: TransactionInstruction = {
    programId: HUMAN_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: issuerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: issuerPda, isSigner: false, isWritable: true },
      { pubkey: profilePda, isSigner: false, isWritable: true },
      { pubkey: attestationPda, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: ixData,
  };

  const tx = new Transaction().add(ed25519Ix, issueIx);
  const txSignature = await sendAndConfirmTransaction(connection, tx, [issuerKeypair], {
    commitment: 'confirmed',
  });

  return {
    txSignature,
    attestationPda: attestationPda.toBase58(),
    profilePda: profilePda.toBase58(),
  };
}
