#!/usr/bin/env tsx
/**
 * Devnet Ika Inspector — Read-only script for Phase 5A
 *
 * Prints Ika configuration, derives PDAs, and optionally fetches
 * dWallet / MessageApproval accounts from Solana devnet.
 *
 * Usage:
 *   npm run devnet:inspect-ika
 *
 * Optional environment variables:
 *   IKA_DWALLET_PUBLIC_KEY  — base58 public key of an existing dWallet
 *   IKA_DWALLET_CURVE       — curve enum value (0=Secp256k1, 1=Secp256r1, 2=Curve25519, 3=Ristretto)
 *   IKA_MESSAGE_APPROVAL    — base58 pubkey of a MessageApproval account
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_GRPC_ENDPOINT_DEVNET,
  IKA_SOLANA_RPC_DEVNET,
  IKA_CPI_AUTHORITY_SEED,
} from "../lib/ika/constants";
import {
  DWalletCurve,
  DWalletState,
  IkaSignatureScheme,
  MessageApprovalStatus,
} from "../lib/ika/types";
import {
  deriveIkaDwalletPda,
  deriveIkaCoordinatorPda,
  deriveHumanRailGuardCpiAuthority,
} from "../lib/ika/pda";
import {
  parseIkaDwalletAccount,
  parseIkaMessageApprovalAccount,
} from "../lib/ika/parsers";
// import { getProgramId } from "../lib/programs";

// ── Active HumanRail Guard program ID ──
const HUMANRAIL_GUARD_PROGRAM_ID = new PublicKey(
  "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
);

// ── Explorer links ──
function solanaFmLink(pubkey: PublicKey, path: "address" | "tx" = "address"): string {
  return `https://solana.fm/${path}/${pubkey.toBase58()}?cluster=devnet-alpha`;
}

// ── Main ──
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Ika Devnet Inspector — Phase 5A Read-Only Helpers");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Print active HumanRail Guard program ID
  console.log("HumanRail dWallet Guard Program:");
  console.log(`  ID:     ${HUMANRAIL_GUARD_PROGRAM_ID.toBase58()}`);
  console.log(`  Link:   ${solanaFmLink(HUMANRAIL_GUARD_PROGRAM_ID)}`);
  console.log();

  // 2. Derive Guard CPI authority PDA
  const [guardCpiAuthority, guardCpiBump] = deriveHumanRailGuardCpiAuthority(
    HUMANRAIL_GUARD_PROGRAM_ID
  );
  console.log("HumanRail Guard CPI Authority PDA:");
  console.log(`  PDA:    ${guardCpiAuthority.toBase58()}`);
  console.log(`  Bump:   ${guardCpiBump}`);
  console.log(`  Seed:   "${IKA_CPI_AUTHORITY_SEED}"`);
  console.log(`  Link:   ${solanaFmLink(guardCpiAuthority)}`);
  console.log();

  // 3. Print Ika configuration
  console.log("Ika dWallet Program:");
  console.log(`  ID:       ${IKA_DWALLET_PROGRAM_ID_DEVNET.toBase58()}`);
  console.log(`  Link:     ${solanaFmLink(IKA_DWALLET_PROGRAM_ID_DEVNET)}`);
  console.log(`  gRPC:     ${IKA_GRPC_ENDPOINT_DEVNET}`);
  console.log(`  Solana:   ${IKA_SOLANA_RPC_DEVNET}`);
  console.log();

  // 4. Verify Ika program exists on devnet
  const connection = new Connection(IKA_SOLANA_RPC_DEVNET, "confirmed");
  console.log("Checking Ika program on devnet...");
  let ikaExecutable = false;
  try {
    const ikaInfo = await connection.getAccountInfo(IKA_DWALLET_PROGRAM_ID_DEVNET);
    ikaExecutable = ikaInfo?.executable === true;
    console.log(`  Executable: ${ikaExecutable ? "YES ✓" : "NO ✗"}`);
    console.log(`  Data size:  ${ikaInfo?.data.length ?? 0} bytes`);
    console.log(`  Balance:    ${(ikaInfo?.lamports ?? 0) / 1e9} SOL`);
  } catch (err) {
    console.log(`  Error:      ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log();

  // 5. Derive and print Coordinator PDA
  const [coordinatorPda] = deriveIkaCoordinatorPda();
  console.log("Ika DWalletCoordinator PDA:");
  console.log(`  PDA:      ${coordinatorPda.toBase58()}`);
  console.log(`  Link:     ${solanaFmLink(coordinatorPda)}`);

  try {
    const coordInfo = await connection.getAccountInfo(coordinatorPda);
    if (coordInfo) {
      console.log(`  Exists:   YES (size=${coordInfo.data.length}, executable=${coordInfo.executable})`);
    } else {
      console.log(`  Exists:   NO — coordinator not found (devnet may be resetting)`);
    }
  } catch (err) {
    console.log(`  Error:    ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log();

  // 6. Optional: inspect dWallet from env vars
  const envDwalletPubkey = process.env.IKA_DWALLET_PUBLIC_KEY;
  const envDwalletCurve = process.env.IKA_DWALLET_CURVE;

  if (envDwalletPubkey) {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  Inspecting dWallet from environment");
    console.log("═══════════════════════════════════════════════════════════\n");

    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = new PublicKey(envDwalletPubkey).toBytes();
    } catch {
      console.error(`Invalid IKA_DWALLET_PUBLIC_KEY: ${envDwalletPubkey}`);
      process.exit(1);
    }

    const curve = Number(envDwalletCurve ?? DWalletCurve.Curve25519);
    if (!Object.values(DWalletCurve).includes(curve)) {
      console.error(`Invalid IKA_DWALLET_CURVE: ${envDwalletCurve}`);
      console.error(`Valid values: ${Object.values(DWalletCurve).filter((v) => typeof v === "number").join(", ")}`);
      process.exit(1);
    }

    const [dwalletPda] = deriveIkaDwalletPda(curve as DWalletCurve, publicKeyBytes);
    console.log(`dWallet public key:  ${envDwalletPubkey}`);
    console.log(`Curve:               ${DWalletCurve[curve]} (${curve})`);
    console.log(`Derived PDA:         ${dwalletPda.toBase58()}`);
    console.log(`Link:                ${solanaFmLink(dwalletPda)}`);

    try {
      const info = await connection.getAccountInfo(dwalletPda);
      if (info) {
        const parsed = parseIkaDwalletAccount(info.data as Buffer);
        if (parsed) {
          console.log(`\nParsed dWallet account:`);
          console.log(`  Discriminator:     ${parsed.discriminator}`);
          console.log(`  Version:           ${parsed.version}`);
          console.log(`  Authority:         ${parsed.authority.toBase58()}`);
          console.log(`  Curve:             ${DWalletCurve[parsed.curve]} (${parsed.curve})`);
          console.log(`  State:             ${DWalletState[parsed.state]} (${parsed.state})`);
          console.log(`  Public key len:    ${parsed.publicKeyLen}`);
          console.log(`  Public key (hex):  ${Buffer.from(parsed.publicKey).toString("hex")}`);
          console.log(`  Created epoch:     ${parsed.createdEpoch}`);
          console.log(`  NOA public key:    ${parsed.noaPublicKey.toBase58()}`);
          console.log(`  Is imported:       ${parsed.isImported}`);
          console.log(`  Bump:              ${parsed.bump}`);
        } else {
          console.log(`\nAccount exists but could not be parsed as dWallet.`);
          console.log(`  Raw data length:   ${info.data.length}`);
          console.log(`  First 16 bytes:    ${Buffer.from(info.data.slice(0, 16)).toString("hex")}`);
        }
      } else {
        console.log(`\nAccount not found on devnet.`);
      }
    } catch (err) {
      console.log(`\nError fetching dWallet: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log();
  }

  // 7. Optional: inspect MessageApproval from env var
  const envMessageApproval = process.env.IKA_MESSAGE_APPROVAL;

  if (envMessageApproval) {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  Inspecting MessageApproval from environment");
    console.log("═══════════════════════════════════════════════════════════\n");

    let maPubkey: PublicKey;
    try {
      maPubkey = new PublicKey(envMessageApproval);
    } catch {
      console.error(`Invalid IKA_MESSAGE_APPROVAL: ${envMessageApproval}`);
      process.exit(1);
    }

    console.log(`MessageApproval pubkey:  ${maPubkey.toBase58()}`);
    console.log(`Link:                    ${solanaFmLink(maPubkey)}`);

    try {
      const info = await connection.getAccountInfo(maPubkey);
      if (info) {
        const parsed = parseIkaMessageApprovalAccount(info.data as Buffer);
        if (parsed) {
          console.log(`\nParsed MessageApproval account:`);
          console.log(`  Discriminator:      ${parsed.discriminator}`);
          console.log(`  Version:            ${parsed.version}`);
          console.log(`  dWallet:            ${parsed.dwallet.toBase58()}`);
          console.log(`  Message digest:     ${Buffer.from(parsed.messageDigest).toString("hex")}`);
          console.log(`  Approver:           ${parsed.approver.toBase58()}`);
          console.log(`  User pubkey:        ${parsed.userPubkey.toBase58()}`);
          console.log(`  Signature scheme:   ${IkaSignatureScheme[parsed.signatureScheme]} (${parsed.signatureScheme})`);
          console.log(`  Status:             ${MessageApprovalStatus[parsed.status]} (${parsed.status})`);
          console.log(`  Signature len:      ${parsed.signatureLen}`);
          if (parsed.signatureLen > 0) {
            console.log(`  Signature (hex):    ${Buffer.from(parsed.signature).toString("hex")}`);
          }
        } else {
          console.log(`\nAccount exists but could not be parsed as MessageApproval.`);
          console.log(`  Raw data length:    ${info.data.length}`);
          console.log(`  First 16 bytes:     ${Buffer.from(info.data.slice(0, 16)).toString("hex")}`);
        }
      } else {
        console.log(`\nAccount not found on devnet.`);
      }
    } catch (err) {
      console.log(`\nError fetching MessageApproval: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log();
  }

  // 8. Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Summary");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Ika program executable:   ${ikaExecutable ? "YES" : "NO / UNKNOWN"}`);
  console.log(`Guard CPI authority:      ${guardCpiAuthority.toBase58()}`);
  console.log(`Coordinator PDA:          ${coordinatorPda.toBase58()}`);
  if (!envDwalletPubkey) {
    console.log(`\nTo inspect a dWallet, set:`);
    console.log(`  IKA_DWALLET_PUBLIC_KEY=<base58_pubkey> IKA_DWALLET_CURVE=2 npm run devnet:inspect-ika`);
  }
  if (!envMessageApproval) {
    console.log(`To inspect a MessageApproval, set:`);
    console.log(`  IKA_MESSAGE_APPROVAL=<base58_pubkey> npm run devnet:inspect-ika`);
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
