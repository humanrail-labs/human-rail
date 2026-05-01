#!/usr/bin/env tsx
/**
 * Phase 5D — Approve Guarded Message via HumanRail Guard CPI
 *
 * This script:
 * 1. Reads dWallet and GuardedDwallet artifacts
 * 2. Verifies preconditions (dWallet exists, authority == Guard CPI, policy exists, not frozen)
 * 3. Builds a policy-valid signing request
 * 4. Derives GuardSigningRequest PDA and Ika MessageApproval PDA
 * 5. Sends approve_guarded_message instruction (Guard program CPI-calls Ika approve_message)
 * 6. Verifies GuardSigningRequest status == approved
 * 7. Verifies Ika MessageApproval exists and status == Pending
 * 8. Writes .local-ika/signing-request.json artifact
 *
 * Usage:
 *   npm run ika:approve-message
 *   KEYPAIR_PATH=/custom/path npm run ika:approve-message
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
import { keccak_256 } from "@noble/hashes/sha3.js";

import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_SOLANA_RPC_DEVNET,
} from "../lib/ika/constants";
import { parseIkaDwalletAccount, parseIkaMessageApprovalAccount } from "../lib/ika/parsers";
import { DWalletState, DWalletCurve } from "../lib/ika/types";
import {
  deriveIkaMessageApprovalPda,
  deriveHumanRailGuardCpiAuthority,
} from "../lib/ika/pda";
import { buildApproveGuardedMessageIx } from "../lib/dwallet-guard/instructions";

// ── Active HumanRail Guard program ID ──
const HUMANRAIL_GUARD_PROGRAM_ID = new PublicKey(
  "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
);

const DWALLET_ARTIFACT = ".local-ika/dwallet.json";
const GUARDED_ARTIFACT = ".local-ika/guarded-dwallet.json";
const SIGNING_REQUEST_ARTIFACT = ".local-ika/signing-request.json";
const RPC = IKA_SOLANA_RPC_DEVNET;

function loadKeypair(): Keypair {
  const path = process.env.KEYPAIR_PATH || os.homedir() + "/.config/solana/id.json";
  const secret = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

function keccak256(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return keccak_256(bytes);
}

function hashPolicyInput(input: string): Uint8Array {
  return keccak_256(new TextEncoder().encode(input));
}

function solanaFmLink(pubkey: string, path: "address" | "tx" = "address"): string {
  return `https://solana.fm/${path}/${pubkey}?cluster=devnet-alpha`;
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

// ── Main ──
async function main() {
  console.log("========================================");
  console.log("Phase 5D — Approve Guarded Message");
  console.log("========================================\n");

  // 1. Load payer
  const payer = loadKeypair();
  console.log("Payer (requester):", payer.publicKey.toBase58());

  // 2. Load artifacts
  if (!fs.existsSync(DWALLET_ARTIFACT)) {
    console.error("ERROR: dWallet artifact not found:", DWALLET_ARTIFACT);
    console.error("Run `npm run ika:create-dwallet` first.");
    process.exit(1);
  }
  if (!fs.existsSync(GUARDED_ARTIFACT)) {
    console.error("ERROR: GuardedDwallet artifact not found:", GUARDED_ARTIFACT);
    console.error("Run `npm run ika:create-guarded-policy` first.");
    process.exit(1);
  }

  const dwalletArtifact = JSON.parse(fs.readFileSync(DWALLET_ARTIFACT, "utf-8")) as {
    dwallet_pda: string;
    dwallet_signing_public_key_hex: string;
    curve: string;
    authority: string;
    state: string;
  };

  const guardedArtifact = JSON.parse(fs.readFileSync(GUARDED_ARTIFACT, "utf-8")) as {
    guardedDwalletPda: string;
    principal: string;
    agent: string;
    humanProfile: string;
    humanrailCapability: string;
    dwallet: string;
    policy: {
      allowedChainId: number;
      allowedAssetHash: string;
      allowedRecipientHash: string;
      perTxLimit: string;
      dailyLimit: string;
      totalLimit: string;
      expiresAt: string;
    };
    parsed?: { frozen: boolean; bump: number };
  };

  const dwalletPda = new PublicKey(dwalletArtifact.dwallet_pda);
  const guardedDwalletPda = new PublicKey(guardedArtifact.guardedDwalletPda);
  console.log("dWallet PDA:", dwalletPda.toBase58());
  console.log("GuardedDwallet PDA:", guardedDwalletPda.toBase58());

  // 3. Derive Guard CPI authority
  const [guardCpiAuthority] = deriveHumanRailGuardCpiAuthority(HUMANRAIL_GUARD_PROGRAM_ID);
  console.log("Guard CPI Authority PDA:", guardCpiAuthority.toBase58());

  // 4. Connect and verify on-chain state
  const connection = new Connection(RPC, "confirmed");

  // 4a. Verify dWallet
  const dwalletInfo = await connection.getAccountInfo(dwalletPda);
  if (!dwalletInfo) {
    console.error("ERROR: dWallet account not found on-chain.", dwalletPda.toBase58());
    process.exit(1);
  }
  const parsedDwallet = parseIkaDwalletAccount(dwalletInfo.data as Buffer);
  if (!parsedDwallet) {
    console.error("ERROR: Failed to parse dWallet account.");
    process.exit(1);
  }

  console.log("\nOn-chain dWallet state:");
  console.log("  Authority:", parsedDwallet.authority.toBase58());
  console.log("  State:", DWalletState[parsedDwallet.state], `(${parsedDwallet.state})`);
  console.log("  Curve:", parsedDwallet.curve);
  console.log("  Public key len:", parsedDwallet.publicKeyLen);

  if (parsedDwallet.authority.toBase58() !== guardCpiAuthority.toBase58()) {
    console.error("\nERROR: dWallet authority is NOT the Guard CPI PDA.");
    console.error("  Expected:", guardCpiAuthority.toBase58());
    console.error("  Actual:  ", parsedDwallet.authority.toBase58());
    process.exit(1);
  }
  if (parsedDwallet.state !== DWalletState.Active) {
    console.error("\nERROR: dWallet is not Active. State =", DWalletState[parsedDwallet.state]);
    process.exit(1);
  }
  console.log("✅ dWallet authority == Guard CPI PDA and state == Active");

  // 4b. Verify GuardedDwallet
  const guardedInfo = await connection.getAccountInfo(guardedDwalletPda);
  if (!guardedInfo) {
    console.error("ERROR: GuardedDwallet not found on-chain.", guardedDwalletPda.toBase58());
    process.exit(1);
  }
  console.log("GuardedDwallet account size:", guardedInfo.data.length, "bytes");

  // Parse GuardedDwallet manually (skip 8-byte discriminator)
  const gdData = guardedInfo.data as Buffer;
  const gdDwallet = new PublicKey(gdData.slice(8 + 1 + 32 + 32 + 32 + 32, 8 + 1 + 32 + 32 + 32 + 32 + 32));
  const gdFrozen = gdData[8 + 1 + 32 + 32 + 32 + 32 + 32 + 4 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1] === 1;

  if (gdDwallet.toBase58() !== dwalletPda.toBase58()) {
    console.error("\nERROR: GuardedDwallet.dwallet does not match real dWallet PDA.");
    console.error("  Expected:", dwalletPda.toBase58());
    console.error("  Actual:  ", gdDwallet.toBase58());
    process.exit(1);
  }
  if (gdFrozen) {
    console.error("\nERROR: GuardedDwallet is frozen.");
    process.exit(1);
  }
  console.log("✅ GuardedDwallet linked to real dWallet and not frozen");

  // 5. Build policy-valid request
  const preimage = "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42";
  const messageDigest = keccak256(preimage);
  const messageMetadataDigest = new Uint8Array(32); // all zeros
  const destinationChainId = 84532;
  const assetHash = hashPolicyInput("USDC:BASE_SEPOLIA");
  const recipientHash = hashPolicyInput("0x1111111111111111111111111111111111111111");
  const amount = BigInt(42_000_000);
  const signatureScheme = 0; // EcdsaKeccak256

  // Verify hashes match policy
  const policyAssetHash = Buffer.from(guardedArtifact.policy.allowedAssetHash, "hex");
  const policyRecipientHash = Buffer.from(guardedArtifact.policy.allowedRecipientHash, "hex");
  if (!Buffer.from(assetHash).equals(policyAssetHash)) {
    console.error("ERROR: Asset hash does not match policy.");
    process.exit(1);
  }
  if (!Buffer.from(recipientHash).equals(policyRecipientHash)) {
    console.error("ERROR: Recipient hash does not match policy.");
    process.exit(1);
  }
  console.log("✅ Asset hash and recipient hash match policy");

  // Deterministic request_id
  const requestIdInput = "phase-5d-approved-" + Buffer.from(messageDigest).toString("hex");
  const requestId = keccak256(requestIdInput);
  console.log("\nRequest parameters:");
  console.log("  Preimage:", preimage);
  console.log("  Message digest:", Buffer.from(messageDigest).toString("hex"));
  console.log("  Message metadata digest:", Buffer.from(messageMetadataDigest).toString("hex"));
  console.log("  Request ID:", Buffer.from(requestId).toString("hex"));
  console.log("  Destination chain:", destinationChainId);
  console.log("  Asset hash:", Buffer.from(assetHash).toString("hex"));
  console.log("  Recipient hash:", Buffer.from(recipientHash).toString("hex"));
  console.log("  Amount:", amount.toString());
  console.log("  Signature scheme:", signatureScheme, "(EcdsaKeccak256)");

  // 6. Derive PDAs
  // GuardSigningRequest PDA
  const [guardSigningRequestPda, gsrBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("guard_signing_request"),
      guardedDwalletPda.toBuffer(),
      Buffer.from(requestId),
    ],
    HUMANRAIL_GUARD_PROGRAM_ID
  );
  console.log("\nGuardSigningRequest PDA:", guardSigningRequestPda.toBase58());
  console.log("  Bump:", gsrBump);

  // Ika MessageApproval PDA
  // The devnet Ika program may use either the old litesvm-style seeds
  // or the newer e2e-rust hierarchical seeds. We try both and use the
  // one that succeeds.
  const publicKeyBytes = Buffer.from(dwalletArtifact.dwallet_signing_public_key_hex, "hex");
  const curveEnum: DWalletCurve =
    dwalletArtifact.curve === "Secp256k1"
      ? DWalletCurve.Secp256k1
      : dwalletArtifact.curve === "Secp256r1"
      ? DWalletCurve.Secp256r1
      : dwalletArtifact.curve === "Curve25519"
      ? DWalletCurve.Curve25519
      : DWalletCurve.Ristretto;

  // E2E-rust style (newer)
  const [messageApprovalPdaE2e, maBumpE2e] = deriveIkaMessageApprovalPda(
    curveEnum,
    publicKeyBytes,
    signatureScheme,
    messageDigest
  );

  // Litesvm style (older)
  const [messageApprovalPdaLite, maBumpLite] = PublicKey.findProgramAddressSync(
    [Buffer.from("message_approval"), dwalletPda.toBuffer(), Buffer.from(messageDigest)],
    IKA_DWALLET_PROGRAM_ID_DEVNET
  );

  console.log("MessageApproval PDA (e2e-rust style):", messageApprovalPdaE2e.toBase58(), "bump:", maBumpE2e);
  console.log("MessageApproval PDA (litesvm style): ", messageApprovalPdaLite.toBase58(), "bump:", maBumpLite);

  // With metadata digest (zeros) included in seeds
  const [messageApprovalPdaMeta, maBumpMeta] = deriveIkaMessageApprovalPda(
    curveEnum,
    publicKeyBytes,
    signatureScheme,
    messageDigest,
    messageMetadataDigest // includes zeros
  );
  console.log("MessageApproval PDA (with zero metadata):", messageApprovalPdaMeta.toBase58(), "bump:", maBumpMeta);

  // Default to e2e-rust style; override via env var if needed
  const useLitesvmStyle = process.env.IKA_MA_LITE_STYLE === "1";
  const useMetaStyle = process.env.IKA_MA_META_STYLE === "1";
  let messageApprovalPda: PublicKey;
  let maBump: number;
  if (useMetaStyle) {
    messageApprovalPda = messageApprovalPdaMeta;
    maBump = maBumpMeta;
  } else if (useLitesvmStyle) {
    messageApprovalPda = messageApprovalPdaLite;
    maBump = maBumpLite;
  } else {
    messageApprovalPda = messageApprovalPdaE2e;
    maBump = maBumpE2e;
  }
  console.log("Using:", useMetaStyle ? "with metadata" : useLitesvmStyle ? "litesvm style" : "e2e-rust style");
  console.log("Ika MessageApproval PDA:", messageApprovalPda.toBase58());
  console.log("  Bump:", maBump);

  // Coordinator PDA
  const [coordinatorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dwallet_coordinator")],
    IKA_DWALLET_PROGRAM_ID_DEVNET
  );
  console.log("Ika Coordinator PDA:", coordinatorPda.toBase58());

  // 7. Build approve_guarded_message instruction
  const ix = buildApproveGuardedMessageIx(HUMANRAIL_GUARD_PROGRAM_ID, {
    requester: payer.publicKey,
    guardedDwallet: guardedDwalletPda,
    guardSigningRequest: guardSigningRequestPda,
    dwallet: dwalletPda,
    agentRegistryAccount: null, // principal signs directly, no agent registry needed
    cpiAuthority: guardCpiAuthority,
    coordinator: coordinatorPda,
    messageApproval: messageApprovalPda,
    requestId,
    messageDigest,
    messageMetadataDigest,
    destinationChainId,
    assetHash,
    recipientHash,
    amount,
    userPubkey: payer.publicKey.toBytes(),
    signatureScheme,
    messageApprovalBump: maBump,
  });

  console.log("\nInstruction accounts:");
  ix.keys.forEach((meta, i) => {
    console.log(`  ${i}. ${meta.pubkey.toBase58()} signer=${meta.isSigner} writable=${meta.isWritable}`);
  });

  // 8. Send transaction
  console.log("\nSending approve_guarded_message...");
  let sig: string;
  try {
    sig = await sendTx(connection, ix, [payer]);
  } catch (err) {
    console.error("\n❌ Transaction failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log("\n✅ Transaction confirmed!");
  console.log("  Signature:", sig);
  console.log("  Explorer:", solanaFmLink(sig, "tx"));

  // 9. Verify GuardSigningRequest
  console.log("\nVerifying GuardSigningRequest...");
  await new Promise((r) => setTimeout(r, 2000)); // brief delay for RPC propagation

  const gsrInfo = await connection.getAccountInfo(guardSigningRequestPda);
  if (!gsrInfo) {
    console.error("ERROR: GuardSigningRequest not found on-chain!");
    process.exit(1);
  }

  // Parse GuardSigningRequest (skip 8-byte discriminator)
  const gsrData = gsrInfo.data as Buffer;
  let off = 8;
  const gsrVersion = gsrData[off++];
  const gsrRequestId = new Uint8Array(gsrData.slice(off, off + 32)); off += 32;
  const gsrGuardedDwallet = new PublicKey(gsrData.slice(off, off + 32)); off += 32;
  const gsrPrincipal = new PublicKey(gsrData.slice(off, off + 32)); off += 32;
  const gsrAgent = new PublicKey(gsrData.slice(off, off + 32)); off += 32;
  const gsrDwallet = new PublicKey(gsrData.slice(off, off + 32)); off += 32;
  const gsrMessageDigest = new Uint8Array(gsrData.slice(off, off + 32)); off += 32;
  const gsrMessageMetadataDigest = new Uint8Array(gsrData.slice(off, off + 32)); off += 32;
  const gsrDestinationChainId = gsrData.readUInt32LE(off); off += 4;
  const gsrAssetHash = new Uint8Array(gsrData.slice(off, off + 32)); off += 32;
  const gsrRecipientHash = new Uint8Array(gsrData.slice(off, off + 32)); off += 32;
  const gsrAmount = gsrData.readBigUInt64LE(off); off += 8;
  const gsrSignatureScheme = gsrData.readUInt16LE(off); off += 2;
  const gsrStatus = gsrData[off++];
  const gsrRejectionCode = gsrData.readUInt16LE(off); off += 2;
  const gsrIkaMessageApproval = new PublicKey(gsrData.slice(off, off + 32)); off += 32;
  const gsrCreatedAt = gsrData.readBigInt64LE(off); off += 8;
  const gsrBumpOnChain = gsrData[off];

  console.log("GuardSigningRequest parsed:");
  console.log("  Version:", gsrVersion);
  console.log("  Request ID:", Buffer.from(gsrRequestId).toString("hex"));
  console.log("  GuardedDwallet:", gsrGuardedDwallet.toBase58());
  console.log("  dWallet:", gsrDwallet.toBase58());
  console.log("  Message digest:", Buffer.from(gsrMessageDigest).toString("hex"));
  console.log("  Destination chain:", gsrDestinationChainId);
  console.log("  Amount:", gsrAmount.toString());
  console.log("  Signature scheme:", gsrSignatureScheme);
  console.log("  Status:", gsrStatus, gsrStatus === 1 ? "(approved)" : gsrStatus === 2 ? "(rejected)" : "(unknown)");
  console.log("  Rejection code:", gsrRejectionCode);
  console.log("  Ika MessageApproval:", gsrIkaMessageApproval.toBase58());
  console.log("  Bump:", gsrBump);

  if (gsrStatus !== 1) {
    console.error("\nERROR: GuardSigningRequest status is NOT approved!");
    console.error("  Status:", gsrStatus, "Rejection code:", gsrRejectionCode);
    process.exit(1);
  }
  if (gsrRejectionCode !== 0) {
    console.error("\nERROR: GuardSigningRequest has non-zero rejection code!");
    process.exit(1);
  }
  if (gsrIkaMessageApproval.toBase58() !== messageApprovalPda.toBase58()) {
    console.error("\nERROR: GuardSigningRequest.ika_message_approval mismatch!");
    console.error("  Expected:", messageApprovalPda.toBase58());
    console.error("  Actual:  ", gsrIkaMessageApproval.toBase58());
    process.exit(1);
  }
  console.log("✅ GuardSigningRequest verified: approved, no rejection, MessageApproval PDA matches");

  // 10. Verify Ika MessageApproval
  console.log("\nVerifying Ika MessageApproval...");
  const maInfo = await connection.getAccountInfo(messageApprovalPda);
  if (!maInfo) {
    console.error("ERROR: Ika MessageApproval not found on-chain!");
    console.error("  This may mean the Ika CPI failed silently or the PDA derivation is wrong.");
    process.exit(1);
  }

  const parsedMa = parseIkaMessageApprovalAccount(maInfo.data as Buffer);
  if (!parsedMa) {
    console.error("ERROR: Failed to parse MessageApproval account.");
    console.error("  Data length:", maInfo.data.length);
    console.error("  First 16 bytes:", Buffer.from(maInfo.data.slice(0, 16)).toString("hex"));
    process.exit(1);
  }

  console.log("MessageApproval parsed:");
  console.log("  Discriminator:", parsedMa.discriminator);
  console.log("  dWallet:", parsedMa.dwallet.toBase58());
  console.log("  Message digest:", Buffer.from(parsedMa.messageDigest).toString("hex"));
  console.log("  Message metadata digest:", Buffer.from(parsedMa.messageMetadataDigest).toString("hex"));
  console.log("  Approver:", parsedMa.approver.toBase58());
  console.log("  User pubkey:", parsedMa.userPubkey.toBase58());
  console.log("  Signature scheme:", parsedMa.signatureScheme);
  console.log("  Epoch:", parsedMa.epoch.toString());
  console.log("  Status:", parsedMa.status, parsedMa.status === 0 ? "(Pending)" : parsedMa.status === 1 ? "(Signed)" : "(?)");
  console.log("  Signature len:", parsedMa.signatureLen);
  console.log("  Bump:", parsedMa.bump);

  if (parsedMa.dwallet.toBase58() !== dwalletPda.toBase58()) {
    console.error("\nERROR: MessageApproval.dwallet mismatch!");
    process.exit(1);
  }
  if (!Buffer.from(parsedMa.messageDigest).equals(Buffer.from(messageDigest))) {
    console.error("\nERROR: MessageApproval.message_digest mismatch!");
    process.exit(1);
  }
  if (parsedMa.signatureScheme !== signatureScheme) {
    console.error("\nERROR: MessageApproval.signature_scheme mismatch!");
    process.exit(1);
  }
  if (parsedMa.status !== 0) {
    console.error("\nERROR: MessageApproval status is NOT Pending(0)!");
    console.error("  Status:", parsedMa.status);
    process.exit(1);
  }
  console.log("✅ MessageApproval verified: exists, matches dWallet/digest/scheme, status=Pending");

  // 11. Write artifact
  const artifact = {
    createdAt: new Date().toISOString(),
    preimage,
    messageDigestHex: Buffer.from(messageDigest).toString("hex"),
    messageMetadataDigestHex: Buffer.from(messageMetadataDigest).toString("hex"),
    signatureScheme: "EcdsaKeccak256",
    requestIdHex: Buffer.from(requestId).toString("hex"),
    guardedDwalletPda: guardedDwalletPda.toBase58(),
    guardSigningRequestPda: guardSigningRequestPda.toBase58(),
    ikaMessageApprovalPda: messageApprovalPda.toBase58(),
    approveGuardedMessageSignature: sig,
    amount: amount.toString(),
    destinationChainId,
    assetHashHex: Buffer.from(assetHash).toString("hex"),
    recipientHashHex: Buffer.from(recipientHash).toString("hex"),
    status: "PendingIkaSignature",
    notes: "Ika pre-alpha mock signer; gRPC Sign not yet called.",
  };

  fs.mkdirSync(".local-ika", { recursive: true });
  fs.writeFileSync(SIGNING_REQUEST_ARTIFACT, JSON.stringify(artifact, null, 2));
  console.log("\nArtifact written:", SIGNING_REQUEST_ARTIFACT);

  // 12. Summary
  console.log("\n========================================");
  console.log("Phase 5D Complete — Summary");
  console.log("========================================");
  console.log("Preimage:", preimage);
  console.log("Message digest:", artifact.messageDigestHex);
  console.log("Request ID:", artifact.requestIdHex);
  console.log("GuardSigningRequest PDA:", guardSigningRequestPda.toBase58());
  console.log("Ika MessageApproval PDA:", messageApprovalPda.toBase58());
  console.log("Approve tx:", sig);
  console.log("MessageApproval status:", "Pending (0)");
  console.log("\nNext step: Phase 5E — gRPC Sign and signature commit.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
