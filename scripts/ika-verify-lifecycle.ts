#!/usr/bin/env tsx
/**
 * Phase 5C — Verify Ika dWallet + GuardedDwallet Lifecycle
 *
 * This script reads both artifacts and verifies on-chain state:
 * 1. dWallet exists and authority == Guard CPI PDA
 * 2. GuardedDwallet exists and dwallet field == dWallet PDA
 *
 * Usage:
 *   npm run ika:verify-lifecycle
 */

import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";
import {
  IKA_SOLANA_RPC_DEVNET,
  IKA_DWALLET_PROGRAM_ID_DEVNET,
} from "../lib/ika/constants";
import { parseIkaDwalletAccount } from "../lib/ika/parsers";
import { deriveHumanRailGuardCpiAuthority } from "../lib/ika/pda";

const HUMANRAIL_GUARD_PROGRAM_ID = new PublicKey(
  "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
);

const DWALLET_ARTIFACT = ".local-ika/dwallet.json";
const GUARDED_ARTIFACT = ".local-ika/guarded-dwallet.json";

function solanaFmLink(pubkey: string): string {
  return `https://solana.fm/address/${pubkey}?cluster=devnet-alpha`;
}

async function main() {
  console.log("========================================");
  console.log("Phase 5C — Verify Ika dWallet Lifecycle");
  console.log("========================================\n");

  const connection = new Connection(IKA_SOLANA_RPC_DEVNET, "confirmed");
  const [guardCpiAuthority] = deriveHumanRailGuardCpiAuthority(HUMANRAIL_GUARD_PROGRAM_ID);

  let allOk = true;

  // ── 1. Verify dWallet ──
  console.log("--- 1. Ika dWallet ---");
  if (!fs.existsSync(DWALLET_ARTIFACT)) {
    console.error("  MISSING:", DWALLET_ARTIFACT);
    console.error("  Run `npm run ika:create-dwallet` first.");
    allOk = false;
  } else {
    const artifact = JSON.parse(fs.readFileSync(DWALLET_ARTIFACT, "utf-8"));
    const dwalletPda = new PublicKey(artifact.dwallet_pda);
    console.log("  PDA:", dwalletPda.toBase58());
    console.log("  Link:", solanaFmLink(dwalletPda.toBase58()));

    const info = await connection.getAccountInfo(dwalletPda);
    if (!info) {
      console.error("  ERROR: dWallet not found on-chain.");
      allOk = false;
    } else {
      const parsed = parseIkaDwalletAccount(info.data as Buffer);
      if (!parsed) {
        console.error("  ERROR: Failed to parse dWallet.");
        allOk = false;
      } else {
        console.log("  Authority:", parsed.authority.toBase58());
        console.log("  State:", parsed.state, "(1=Active)");
        console.log("  Curve:", parsed.curve);
        console.log("  Public key len:", parsed.publicKeyLen);

        if (parsed.authority.toBase58() === guardCpiAuthority.toBase58()) {
          console.log("  ✅ Authority == Guard CPI PDA");
        } else {
          console.error("  ❌ Authority != Guard CPI PDA");
          console.error("     Expected:", guardCpiAuthority.toBase58());
          console.error("     Actual:  ", parsed.authority.toBase58());
          allOk = false;
        }

        if (parsed.state === 1) {
          console.log("  ✅ State is Active");
        } else {
          console.error("  ❌ State is not Active:", parsed.state);
          allOk = false;
        }
      }
    }

    if (artifact.authorityTransferSignature) {
      console.log("  Transfer tx:", artifact.authorityTransferSignature);
    }
  }

  // ── 2. Verify GuardedDwallet ──
  console.log("\n--- 2. GuardedDwallet ---");
  if (!fs.existsSync(GUARDED_ARTIFACT)) {
    console.error("  MISSING:", GUARDED_ARTIFACT);
    console.error("  Run `npm run ika:create-guarded-policy` first.");
    allOk = false;
  } else {
    const artifact = JSON.parse(fs.readFileSync(GUARDED_ARTIFACT, "utf-8"));
    const guardedPda = new PublicKey(artifact.guardedDwalletPda);
    const expectedDwallet = new PublicKey(artifact.dwallet);

    console.log("  GuardedDwallet PDA:", guardedPda.toBase58());
    console.log("  Expected dwallet:", expectedDwallet.toBase58());
    console.log("  Link:", solanaFmLink(guardedPda.toBase58()));

    const info = await connection.getAccountInfo(guardedPda);
    if (!info) {
      console.error("  ERROR: GuardedDwallet not found on-chain.");
      allOk = false;
    } else {
      // Parse GuardedDwallet from raw data (simplified)
      const data = Buffer.from(info.data);
      const dwalletField = new PublicKey(data.slice(8 + 1 + 32 * 4, 8 + 1 + 32 * 5));
      console.log("  On-chain dwallet:", dwalletField.toBase58());

      if (dwalletField.toBase58() === expectedDwallet.toBase58()) {
        console.log("  ✅ dwallet field matches artifact");
      } else {
        console.error("  ❌ dwallet field mismatch");
        allOk = false;
      }

      const frozen = data.readUInt8(293) !== 0;
      console.log("  Frozen:", frozen);
      if (!frozen) {
        console.log("  ✅ Not frozen");
      } else {
        console.error("  ❌ GuardedDwallet is frozen");
        allOk = false;
      }
    }
  }

  // ── Summary ──
  console.log("\n========================================");
  if (allOk) {
    console.log("  ✅ ALL CHECKS PASSED");
    console.log("========================================");
    console.log("\nLifecycle is ready for Phase 5D:");
    console.log("  npm run devnet:inspect-ika");
  } else {
    console.log("  ❌ SOME CHECKS FAILED");
    console.log("========================================");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
