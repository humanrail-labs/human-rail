"use client";

import { PublicKey } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Ika Signature Schemes (pre-alpha values — subject to change)
// Source: docs/IKA_TECHNICAL_NOTES.md
// ---------------------------------------------------------------------------
export enum IkaSignatureScheme {
  EcdsaKeccak256 = 0,      // Ethereum personal sign / raw ECDSA
  EcdsaSha256 = 1,         // Standard ECDSA
  EcdsaDoubleSha256 = 2,   // Bitcoin transaction signing
  TaprootSha256 = 3,       // Bitcoin Taproot
  EcdsaBlake2b256 = 4,     // Cosmos / Substrate
  EddsaSha512 = 5,         // Ed25519 — Solana, Cardano
  SchnorrkelMerlin = 6,    // Substrate / Polkadot
}

export function signatureSchemeName(scheme: IkaSignatureScheme): string {
  switch (scheme) {
    case IkaSignatureScheme.EcdsaKeccak256: return "EcdsaKeccak256 (Ethereum)";
    case IkaSignatureScheme.EcdsaSha256: return "EcdsaSha256";
    case IkaSignatureScheme.EcdsaDoubleSha256: return "EcdsaDoubleSha256 (Bitcoin)";
    case IkaSignatureScheme.TaprootSha256: return "TaprootSha256 (Bitcoin)";
    case IkaSignatureScheme.EcdsaBlake2b256: return "EcdsaBlake2b256 (Cosmos)";
    case IkaSignatureScheme.EddsaSha512: return "EddsaSha512 (Ed25519)";
    case IkaSignatureScheme.SchnorrkelMerlin: return "SchnorrkelMerlin (Polkadot)";
    default: return `Unknown (${scheme})`;
  }
}

// ---------------------------------------------------------------------------
// keccak256 — used by Ika for message digests
// ---------------------------------------------------------------------------
let keccak256Impl: ((data: Uint8Array) => Uint8Array) | null = null;

async function loadKeccak256(): Promise<(data: Uint8Array) => Uint8Array> {
  if (keccak256Impl) return keccak256Impl;
  try {
    const mod = await import("@noble/hashes/sha3");
    keccak256Impl = mod.keccak_256 as (data: Uint8Array) => Uint8Array;
    return keccak256Impl;
  } catch {
    throw new Error("@noble/hashes/keccak256 not available. Install with: npm i @noble/hashes");
  }
}

export async function keccak256(data: Uint8Array | string): Promise<Uint8Array> {
  const hash = await loadKeccak256();
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return hash(bytes);
}

// ---------------------------------------------------------------------------
// Hash helpers for demo policy inputs
// These are labeled as demo utilities — they hash a string or pubkey into
// a fixed [u8;32] for use as policy constraints.
// ---------------------------------------------------------------------------
export async function hashPolicyInput(input: string | PublicKey): Promise<Uint8Array> {
  const hash = await loadKeccak256();
  const bytes = input instanceof PublicKey ? input.toBytes() : new TextEncoder().encode(input);
  return hash(bytes);
}

// ---------------------------------------------------------------------------
// u32 LE encoding for instruction data
// ---------------------------------------------------------------------------
export function writeU32LE(value: number, buf: Buffer, offset: number): void {
  buf.writeUInt32LE(value, offset);
}

export function writeU64LE(value: bigint, buf: Buffer, offset: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  view.setBigUint64(0, value, true);
}

export function writeI64LE(value: bigint, buf: Buffer, offset: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  view.setBigInt64(0, value, true);
}
