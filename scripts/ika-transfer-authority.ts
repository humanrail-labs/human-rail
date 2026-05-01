#!/usr/bin/env tsx
/**
 * Phase 5C — Transfer Ika dWallet Authority to HumanRail Guard CPI PDA
 *
 * This script:
 * 1. Reads the dWallet artifact from .local-ika/dwallet.json
 * 2. Verifies the dWallet exists on-chain and is in Active state
 * 3. Verifies current authority == payer
 * 4. Builds and sends transfer_ownership instruction (discriminator 24)
 * 5. Verifies authority changed to Guard CPI PDA
 * 6. Updates .local-ika/dwallet.json with transfer metadata
 *
 * Usage:
 *   npm run ika:transfer-authority
 *   KEYPAIR_PATH=/custom/path npm run ika:transfer-authority
 *   FORCE=1 npm run ika:transfer-authority  # skip authority==payer check
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_SOLANA_RPC_DEVNET,
  IKA_IX_TRANSFER_OWNERSHIP,
} from "../lib/ika/constants";
import { parseIkaDwalletAccount } from "../lib/ika/parsers";
import { DWalletState } from "../lib/ika/types";
import { deriveHumanRailGuardCpiAuthority } from "../lib/ika/pda";

// ── Active HumanRail Guard program ID ──
const HUMANRAIL_GUARD_PROGRAM_ID = new PublicKey(
  "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
);

const ARTIFACT_PATH = ".local-ika/dwallet.json";
const RPC = IKA_SOLANA_RPC_DEVNET;

function loadKeypair(): Keypair {
  const path = process.env.KEYPAIR_PATH || os.homedir() + "/.config/solana/id.json";
  const secret = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function sendTx(
  connection: Connection,
  ix: TransactionInstruction,
  signers: Keypair[]
): Promise<string> {
  const rb = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.recentBlockhash = rb.blockhash;
  tx.feePayer = signers[0].publicKey;
  tx.add(ix);
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction({ signature: sig, ...rb }, "confirmed");
  return sig;
}

function solanaFmLink(pubkey: string, path: "address" | "tx" = "address"): string {
  return `https://solana.fm/${path}/${pubkey}?cluster=devnet-alpha`;
}

// ── Main ──
async function main() {
  console.log("========================================");
  console.log("Phase 5C — Transfer Ika dWallet Authority");
  console.log("========================================\n");

  // 1. Load payer
  const payer = loadKeypair();
  console.log("Payer (current authority):", payer.publicKey.toBase58());

  // 2. Load artifact
  if (!fs.existsSync(ARTIFACT_PATH)) {
    console.error("ERROR: Artifact not found:", ARTIFACT_PATH);
    console.error("Run `npm run ika:create-dwallet` first.");
    process.exit(1);
  }

  const artifactRaw = fs.readFileSync(ARTIFACT_PATH, "utf-8");
  const artifact = JSON.parse(artifactRaw) as {
    dwallet_pda: string;
    dwallet_signing_public_key_hex: string;
    curve: string;
    authority: string;
    state: string;
  };

  const dwalletPda = new PublicKey(artifact.dwallet_pda);
  console.log("dWallet PDA:", dwalletPda.toBase58());
  console.log("dWallet curve:", artifact.curve);
  console.log("Artifact authority:", artifact.authority);

  // 3. Derive Guard CPI authority
  const [guardCpiAuthority] = deriveHumanRailGuardCpiAuthority(HUMANRAIL_GUARD_PROGRAM_ID);
  console.log("Guard CPI Authority PDA:", guardCpiAuthority.toBase58());

  // 4. Connect and verify on-chain state
  const connection = new Connection(RPC, "confirmed");

  const dwalletInfo = await connection.getAccountInfo(dwalletPda);
  if (!dwalletInfo) {
    console.error("ERROR: dWallet account not found on-chain.");
    process.exit(1);
  }
  console.log("dWallet account size:", dwalletInfo.data.length, "bytes");

  const parsed = parseIkaDwalletAccount(dwalletInfo.data as Buffer);
  if (!parsed) {
    console.error("ERROR: Failed to parse dWallet account.");
    process.exit(1);
  }

  console.log("\nOn-chain dWallet state:");
  console.log("  Authority:", parsed.authority.toBase58());
  console.log("  State:", DWalletState[parsed.state], `(${parsed.state})`);
  console.log("  Curve:", parsed.curve);
  console.log("  Public key len:", parsed.publicKeyLen);

  // 5. Pre-transfer checks
  if (parsed.authority.toBase58() !== payer.publicKey.toBase58()) {
    if (parsed.authority.toBase58() === guardCpiAuthority.toBase58()) {
      console.log("\n✅ dWallet authority is ALREADY the Guard CPI PDA.");
      console.log("   No transfer needed.");
      process.exit(0);
    }
    if (!process.env.FORCE) {
      console.error("\nERROR: Current dWallet authority does not match payer.");
      console.error("  Current:", parsed.authority.toBase58());
      console.error("  Payer:  ", payer.publicKey.toBase58());
      console.error("Set FORCE=1 to override (not recommended).");
      process.exit(1);
    }
  }

  if (parsed.state !== DWalletState.Active) {
    console.error("\nERROR: dWallet is not Active. State =", DWalletState[parsed.state]);
    process.exit(1);
  }

  console.log("\n✅ Pre-transfer checks passed.");

  // 6. Build transfer_ownership instruction
  // Instruction data: [discriminator 24] + new_authority(32 bytes)
  const ixData = Buffer.alloc(1 + 32);
  ixData[0] = IKA_IX_TRANSFER_OWNERSHIP;
  guardCpiAuthority.toBuffer().copy(ixData, 1);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false }, // current authority
      { pubkey: dwalletPda, isSigner: false, isWritable: true },      // dwallet
    ],
    programId: IKA_DWALLET_PROGRAM_ID_DEVNET,
    data: ixData,
  });

  console.log("\nSending transfer_ownership instruction...");
  console.log("  Discriminator:", IKA_IX_TRANSFER_OWNERSHIP);
  console.log("  New authority:", guardCpiAuthority.toBase58());

  // 7. Send transaction
  const sig = await sendTx(connection, ix, [payer]);
  console.log("\n✅ Transaction confirmed!");
  console.log("  Signature:", sig);
  console.log("  Explorer:", solanaFmLink(sig, "tx"));

  // 8. Verify post-transfer state
  console.log("\nVerifying post-transfer state...");
  const postInfo = await connection.getAccountInfo(dwalletPda);
  if (!postInfo) {
    console.error("ERROR: dWallet disappeared after transfer!");
    process.exit(1);
  }

  const postParsed = parseIkaDwalletAccount(postInfo.data as Buffer);
  if (!postParsed) {
    console.error("ERROR: Failed to parse dWallet after transfer.");
    process.exit(1);
  }

  console.log("Post-transfer authority:", postParsed.authority.toBase58());
  if (postParsed.authority.toBase58() !== guardCpiAuthority.toBase58()) {
    console.error("\nERROR: Authority transfer did not succeed!");
    console.error("  Expected:", guardCpiAuthority.toBase58());
    console.error("  Actual:  ", postParsed.authority.toBase58());
    process.exit(1);
  }

  console.log("\n✅ Authority transfer verified!");
  console.log("  dWallet authority is now the HumanRail Guard CPI PDA.");

  // 9. Update artifact
  const updatedArtifact = {
    ...artifact,
    authorityTransferredAt: new Date().toISOString(),
    authorityTransferSignature: sig,
    authorityBefore: payer.publicKey.toBase58(),
    authorityAfter: guardCpiAuthority.toBase58(),
    authority: guardCpiAuthority.toBase58(),
    state: DWalletState[postParsed.state],
    notes: (artifact.state || "") + " | Authority transferred to HumanRail Guard CPI PDA.",
  };

  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(updatedArtifact, null, 2));
  console.log("\nArtifact updated:", ARTIFACT_PATH);

  // 10. Summary
  console.log("\n========================================");
  console.log("Phase 5C Complete — Summary");
  console.log("========================================");
  console.log("dWallet PDA:", dwalletPda.toBase58());
  console.log("Authority before:", payer.publicKey.toBase58());
  console.log("Authority after:", guardCpiAuthority.toBase58());
  console.log("Transfer tx:", sig);
  console.log("\nNext step: create a GuardedDwallet policy linked to this dWallet.");
  console.log("  npm run ika:create-guarded-policy");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
