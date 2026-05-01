#!/usr/bin/env tsx
/**
 * Lightweight parser tests for Ika dWallet and MessageApproval accounts.
 *
 * Creates synthetic buffers with known values and verifies parsed output.
 * Run: npx tsx scripts/test-ika-parsers.ts
 */

import { PublicKey } from "@solana/web3.js";
import {
  parseIkaDwalletAccount,
  parseIkaMessageApprovalAccount,
  dwalletPdaSeeds,
  deriveIkaDwalletPda,
  DWalletCurve,
  DWalletState,
  IkaSignatureScheme,
  MessageApprovalStatus,
  IKA_DISC_DWALLET,
  IKA_DISC_MESSAGE_APPROVAL,
} from "../lib/ika";

let passed = 0;
let failed = 0;

function assertEq(actual: unknown, expected: unknown, msg: string) {
  let match = false;
  if (typeof actual === "bigint" && typeof expected === "bigint") {
    match = actual === expected;
  } else {
    match = JSON.stringify(actual) === JSON.stringify(expected);
  }
  if (!match) {
    console.error(`  FAIL: ${msg}`);
    console.error(`    expected: ${String(expected)}`);
    console.error(`    actual:   ${String(actual)}`);
    failed++;
  } else {
    passed++;
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failed++;
  } else {
    passed++;
  }
}

console.log("═══════════════════════════════════════════════════════════");
console.log("  Ika Parser Unit Tests");
console.log("═══════════════════════════════════════════════════════════\n");

// ── Test 1: Synthetic dWallet (153 bytes, Secp256k1) ──
console.log("Test 1: parseIkaDwalletAccount with synthetic 153-byte buffer");
{
  const buf = Buffer.alloc(153);
  buf[0] = IKA_DISC_DWALLET; // discriminator
  buf[1] = 1; // version

  const authority = new PublicKey("5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y");
  authority.toBuffer().copy(buf, 2); // authority @ 2

  buf.writeUInt16LE(DWalletCurve.Secp256k1, 34); // curve @ 34
  buf[36] = DWalletState.Active; // state @ 36
  buf[37] = 33; // public_key_len @ 37

  const publicKey = Buffer.alloc(65);
  publicKey[0] = 0x02; // compressed Secp256k1 prefix
  for (let i = 1; i < 33; i++) publicKey[i] = i;
  publicKey.copy(buf, 38); // public_key @ 38

  buf.writeBigUInt64LE(BigInt(42), 103); // created_epoch @ 103

  const noaPubkey = new PublicKey("11111111111111111111111111111111");
  noaPubkey.toBuffer().copy(buf, 111); // noa_public_key @ 111

  buf[143] = 0; // is_imported @ 143
  buf[144] = 254; // bump @ 144

  const parsed = parseIkaDwalletAccount(buf);
  assertTrue(parsed !== null, "parsed should not be null");
  if (parsed) {
    assertEq(parsed.discriminator, IKA_DISC_DWALLET, "discriminator");
    assertEq(parsed.version, 1, "version");
    assertEq(parsed.authority.toBase58(), authority.toBase58(), "authority");
    assertEq(parsed.curve, DWalletCurve.Secp256k1, "curve");
    assertEq(parsed.state, DWalletState.Active, "state");
    assertEq(parsed.publicKeyLen, 33, "publicKeyLen");
    assertEq(Buffer.from(parsed.publicKey).toString("hex"), publicKey.slice(0, 33).toString("hex"), "publicKey");
    assertEq(parsed.createdEpoch, BigInt(42), "createdEpoch");
    assertEq(parsed.noaPublicKey.toBase58(), noaPubkey.toBase58(), "noaPublicKey");
    assertEq(parsed.isImported, false, "isImported");
    assertEq(parsed.bump, 254, "bump");
  }
}

// ── Test 2: Synthetic dWallet (Secp256r1) ──
console.log("Test 2: parseIkaDwalletAccount with Secp256r1 curve");
{
  const buf = Buffer.alloc(153);
  buf[0] = IKA_DISC_DWALLET;
  buf[1] = 1;
  buf.writeUInt16LE(DWalletCurve.Secp256r1, 34);
  buf[36] = DWalletState.Frozen;
  buf[37] = 33;
  buf[144] = 255;

  const parsed = parseIkaDwalletAccount(buf);
  assertTrue(parsed !== null, "parsed should not be null");
  if (parsed) {
    assertEq(parsed.curve, DWalletCurve.Secp256r1, "curve");
    assertEq(parsed.state, DWalletState.Frozen, "state");
    assertEq(parsed.bump, 255, "bump");
  }
}

// ── Test 3: Wrong discriminator returns null ──
console.log("Test 3: parseIkaDwalletAccount with wrong discriminator returns null");
{
  const buf = Buffer.alloc(153);
  buf[0] = 99; // wrong discriminator
  const parsed = parseIkaDwalletAccount(buf);
  assertEq(parsed, null, "should return null for wrong discriminator");
}

// ── Test 4: Buffer too short returns null ──
console.log("Test 4: parseIkaDwalletAccount with short buffer returns null");
{
  const buf = Buffer.alloc(100);
  const parsed = parseIkaDwalletAccount(buf);
  assertEq(parsed, null, "should return null for short buffer");
}

// ── Test 5: Synthetic MessageApproval (312 bytes) ──
console.log("Test 5: parseIkaMessageApprovalAccount with synthetic 312-byte buffer");
{
  const buf = Buffer.alloc(312);
  buf[0] = IKA_DISC_MESSAGE_APPROVAL;
  buf[1] = 1;

  const dwallet = new PublicKey("A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp");
  dwallet.toBuffer().copy(buf, 2); // dwallet @ 2

  const messageDigest = Buffer.alloc(32);
  messageDigest.fill(0xab); // message_digest @ 34
  messageDigest.copy(buf, 34);

  const messageMetadataDigest = Buffer.alloc(32);
  messageMetadataDigest.fill(0xcd); // message_metadata_digest @ 66
  messageMetadataDigest.copy(buf, 66);

  const approver = new PublicKey("FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd");
  approver.toBuffer().copy(buf, 98); // approver @ 98

  const userPubkey = new PublicKey("5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y");
  userPubkey.toBuffer().copy(buf, 130); // user_pubkey @ 130

  buf.writeUInt16LE(IkaSignatureScheme.EcdsaKeccak256, 162); // signature_scheme @ 162
  buf.writeBigUInt64LE(BigInt(7), 164); // epoch @ 164
  buf[172] = MessageApprovalStatus.Signed; // status @ 172
  buf.writeUInt16LE(64, 173); // signature_len @ 173

  const signature = Buffer.alloc(64);
  signature.fill(0xef); // signature @ 175
  signature.copy(buf, 175);

  buf[303] = 253; // bump @ 303

  const parsed = parseIkaMessageApprovalAccount(buf);
  assertTrue(parsed !== null, "parsed should not be null");
  if (parsed) {
    assertEq(parsed.discriminator, IKA_DISC_MESSAGE_APPROVAL, "discriminator");
    assertEq(parsed.version, 1, "version");
    assertEq(parsed.dwallet.toBase58(), dwallet.toBase58(), "dwallet");
    assertEq(Buffer.from(parsed.messageDigest).toString("hex"), messageDigest.toString("hex"), "messageDigest");
    assertEq(Buffer.from(parsed.messageMetadataDigest).toString("hex"), messageMetadataDigest.toString("hex"), "messageMetadataDigest");
    assertEq(parsed.approver.toBase58(), approver.toBase58(), "approver");
    assertEq(parsed.userPubkey.toBase58(), userPubkey.toBase58(), "userPubkey");
    assertEq(parsed.signatureScheme, IkaSignatureScheme.EcdsaKeccak256, "signatureScheme");
    assertEq(parsed.epoch, BigInt(7), "epoch");
    assertEq(parsed.status, MessageApprovalStatus.Signed, "status");
    assertEq(parsed.signatureLen, 64, "signatureLen");
    assertEq(Buffer.from(parsed.signature).toString("hex"), signature.toString("hex"), "signature");
    assertEq(parsed.bump, 253, "bump");
  }
}

// ── Test 6: MessageApproval too short returns null ──
console.log("Test 6: parseIkaMessageApprovalAccount with short buffer returns null");
{
  const buf = Buffer.alloc(200);
  const parsed = parseIkaMessageApprovalAccount(buf);
  assertEq(parsed, null, "should return null for short buffer");
}

// ── Test 7: dWallet PDA seed chunking for 33-byte Secp256k1 pubkey ──
console.log("Test 7: dwalletPdaSeeds for 33-byte Secp256k1 public key");
{
  const publicKey = Buffer.alloc(33);
  publicKey[0] = 0x02;
  for (let i = 1; i < 33; i++) publicKey[i] = i;

  const seeds = dwalletPdaSeeds(DWalletCurve.Secp256k1, publicKey);
  assertEq(seeds.length, 3, "should have 3 seeds (dwallet + 32-byte chunk + 3-byte chunk)");
  assertEq(seeds[0].toString(), "dwallet", "first seed is 'dwallet'");
  assertEq(seeds[1].length, 32, "second seed is 32 bytes");
  assertEq(seeds[2].length, 3, "third seed is 3 bytes (curve u16 LE + first byte of remaining pubkey)");

  // Verify payload encoding: curve u16 LE (0x00, 0x00) || publicKey
  const expectedPayload = Buffer.concat([Buffer.from([0x00, 0x00]), publicKey]);
  assertEq(seeds[1].toString("hex"), expectedPayload.slice(0, 32).toString("hex"), "first chunk matches");
  assertEq(seeds[2].toString("hex"), expectedPayload.slice(32).toString("hex"), "second chunk matches");
}

// ── Test 8: deriveIkaDwalletPda determinism ──
console.log("Test 8: deriveIkaDwalletPda is deterministic");
{
  const publicKey = Buffer.from("02e2d5f1c3a8b7e6d4c5a9f0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d", "hex");
  const [pda1] = deriveIkaDwalletPda(DWalletCurve.Secp256k1, publicKey);
  const [pda2] = deriveIkaDwalletPda(DWalletCurve.Secp256k1, publicKey);
  assertEq(pda1.toBase58(), pda2.toBase58(), "same inputs produce same PDA");
}

// ── Summary ──
console.log("\n═══════════════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════════");

if (failed > 0) {
  process.exit(1);
}
