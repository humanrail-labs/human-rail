#!/usr/bin/env tsx
/**
 * Phase 4B / 5C — Create Guarded dWallet Policy on Devnet
 *
 * This script:
 * 1. Creates a GuardedDwallet policy using the devnet-only demo initializer
 *    (skips HumanRail owner checks since canRegisterAgents is blocked)
 * 2. Supports two modes:
 *    - Default (Phase 4B): uses placeholder dWallet
 *    - --real-ika (Phase 5C): uses real Ika dWallet PDA
 * 3. Tests freeze/unfreeze (Phase 4B only)
 * 4. Tests a rejected signing request (Phase 4B only)
 * 5. Fetches and verifies all accounts
 *
 * Usage:
 *   npx tsx scripts/devnet-create-guarded-dwallet.ts
 *   npx tsx scripts/devnet-create-guarded-dwallet.ts --real-ika
 *   KEYPAIR_PATH=/custom/path npx tsx scripts/devnet-create-guarded-dwallet.ts --real-ika
 *   FORCE=1 npx tsx scripts/devnet-create-guarded-dwallet.ts --real-ika
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import fs from "fs";
import os from "os";
import {
  deriveGuardedDwalletPda,
  deriveGuardSigningRequestPda,
  getDwalletGuardProgramId,
} from "../packages/sdk/src/index.js";
import {
  parseIkaDwalletAccount,
} from "../lib/ika/parsers";
import { deriveHumanRailGuardCpiAuthority } from "../lib/ika/pda";

// ---------------------------------------------------------------------------
// Account discriminators from Anchor IDL
// ---------------------------------------------------------------------------
const GUARDED_DWALLET_DISCRIMINATOR = Buffer.from([12, 125, 217, 8, 251, 154, 190, 73]);
const GUARD_SIGNING_REQUEST_DISCRIMINATOR = Buffer.from([114, 10, 219, 237, 226, 180, 54, 33]);

// Instruction discriminators
const IX_INIT_DEMO = Buffer.from([119, 131, 122, 191, 76, 83, 31, 246]);
const IX_FREEZE = Buffer.from([151, 57, 89, 252, 123, 234, 123, 61]);
const IX_UNFREEZE = Buffer.from([223, 101, 174, 85, 26, 221, 221, 194]);
const IX_APPROVE = Buffer.from([161, 49, 124, 159, 1, 54, 243, 30]);

const RPC = "https://api.devnet.solana.com";
const SLEEP_MS = 2000;

const DEMO_CHAIN_ID = 84532; // Base Sepolia
const PER_TX_LIMIT = BigInt(100_000_000);
const DAILY_LIMIT = BigInt(500_000_000);
const TOTAL_LIMIT = BigInt(1_000_000_000);

const DEMO_DWALLET_LABEL = "DEMO_DWALLET_PLACEHOLDER_FOR_PHASE_4B";
const REAL_IKA_LABEL = "REAL_IKA_DWALLET_WITH_DEMO_HUMANRAIL_REFS";

const DWALLET_ARTIFACT_PATH = ".local-ika/dwallet.json";
const GUARDED_ARTIFACT_PATH = ".local-ika/guarded-dwallet.json";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashInput(input: string): Uint8Array {
  return keccak_256(new TextEncoder().encode(input));
}

function loadKeypair(): Keypair {
  const path = process.env.KEYPAIR_PATH || os.homedir() + "/.config/solana/id.json";
  const secret = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function sendTx(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[]
): Promise<string> {
  const rb = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = rb.blockhash;
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction({ signature: sig, ...rb }, "confirmed");
  return sig;
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------
function buildInitializeGuardedDwalletDemoIx(
  guardProgramId: PublicKey,
  params: {
    principal: PublicKey;
    guardedDwallet: PublicKey;
    humanProfile: PublicKey;
    agent: PublicKey;
    humanrailCapability: PublicKey;
    dwallet: PublicKey;
    allowedChainId: number;
    allowedAssetHash: Uint8Array;
    allowedRecipientHash: Uint8Array;
    perTxLimit: bigint;
    dailyLimit: bigint;
    totalLimit: bigint;
    expiresAt: bigint;
  }
): Transaction {
  const data = Buffer.alloc(8 + 4 + 32 + 32 + 8 + 8 + 8 + 8);
  let offset = 0;
  IX_INIT_DEMO.copy(data, offset);
  offset += 8;
  data.writeUInt32LE(params.allowedChainId, offset);
  offset += 4;
  Buffer.from(params.allowedAssetHash).copy(data, offset);
  offset += 32;
  Buffer.from(params.allowedRecipientHash).copy(data, offset);
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset, 32);
  view.setBigUint64(0, params.perTxLimit, true);
  view.setBigUint64(8, params.dailyLimit, true);
  view.setBigUint64(16, params.totalLimit, true);
  view.setBigInt64(24, params.expiresAt, true);

  const ix = {
    keys: [
      { pubkey: params.principal, isSigner: true, isWritable: true },
      { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
      { pubkey: params.humanProfile, isSigner: false, isWritable: false },
      { pubkey: params.agent, isSigner: false, isWritable: false },
      { pubkey: params.humanrailCapability, isSigner: false, isWritable: false },
      { pubkey: params.dwallet, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: guardProgramId,
    data,
  };
  return new Transaction().add(ix as unknown as import("@solana/web3.js").TransactionInstruction);
}

function buildFreezeGuardedDwalletIx(
  guardProgramId: PublicKey,
  principal: PublicKey,
  guardedDwallet: PublicKey
): Transaction {
  const ix = {
    keys: [
      { pubkey: principal, isSigner: true, isWritable: false },
      { pubkey: guardedDwallet, isSigner: false, isWritable: true },
    ],
    programId: guardProgramId,
    data: IX_FREEZE,
  };
  return new Transaction().add(ix as unknown as import("@solana/web3.js").TransactionInstruction);
}

function buildUnfreezeGuardedDwalletIx(
  guardProgramId: PublicKey,
  principal: PublicKey,
  guardedDwallet: PublicKey
): Transaction {
  const ix = {
    keys: [
      { pubkey: principal, isSigner: true, isWritable: false },
      { pubkey: guardedDwallet, isSigner: false, isWritable: true },
    ],
    programId: guardProgramId,
    data: IX_UNFREEZE,
  };
  return new Transaction().add(ix as unknown as import("@solana/web3.js").TransactionInstruction);
}

function buildApproveGuardedMessageIx(
  guardProgramId: PublicKey,
  params: {
    requester: PublicKey;
    guardedDwallet: PublicKey;
    guardSigningRequest: PublicKey;
    dwallet: PublicKey;
    cpiAuthority: PublicKey;
    coordinator: PublicKey;
    messageApproval: PublicKey;
    requestId: Uint8Array;
    messageDigest: Uint8Array;
    messageMetadataDigest: Uint8Array;
    destinationChainId: number;
    assetHash: Uint8Array;
    recipientHash: Uint8Array;
    amount: bigint;
    signatureScheme: number;
    messageApprovalBump: number;
  }
): Transaction {
  const data = Buffer.alloc(8 + 32 + 32 + 32 + 4 + 32 + 32 + 8 + 32 + 2 + 1);
  let offset = 0;
  IX_APPROVE.copy(data, offset);
  offset += 8;
  Buffer.from(params.requestId).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageDigest).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageMetadataDigest).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(params.destinationChainId, offset);
  offset += 4;
  Buffer.from(params.assetHash).copy(data, offset);
  offset += 32;
  Buffer.from(params.recipientHash).copy(data, offset);
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset, 11);
  view.setBigUint64(0, params.amount, true);
  view.setUint16(8, params.signatureScheme, true);
  view.setUint8(10, params.messageApprovalBump);

  // Anchor expects all accounts in order, including Option<AccountInfo>.
  // When agent_registry_account is None, pass the program ID as placeholder.
  const keys = [
    { pubkey: params.requester, isSigner: true, isWritable: true },
    { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
    { pubkey: params.guardSigningRequest, isSigner: false, isWritable: true },
    { pubkey: params.dwallet, isSigner: false, isWritable: false },
    { pubkey: guardProgramId, isSigner: false, isWritable: false }, // agent_registry_account: None placeholder
    { pubkey: params.cpiAuthority, isSigner: false, isWritable: false },
    { pubkey: guardProgramId, isSigner: false, isWritable: false }, // program (this program)
    { pubkey: new PublicKey("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"), isSigner: false, isWritable: false },
    { pubkey: params.coordinator, isSigner: false, isWritable: false },
    { pubkey: params.messageApproval, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new Transaction().add({ keys, programId: guardProgramId, data } as unknown as import("@solana/web3.js").TransactionInstruction);
}

// ---------------------------------------------------------------------------
// Account parsers
// ---------------------------------------------------------------------------
function parseGuardedDwallet(data: Buffer) {
  if (data.length < 8 + 319) throw new Error("GuardedDwallet data too short");
  const d = Buffer.from(data);
  const disc = d.slice(0, 8);
  if (!disc.equals(GUARDED_DWALLET_DISCRIMINATOR)) {
    throw new Error("Invalid GuardedDwallet discriminator");
  }
  let off = 8;
  const version = d.readUInt8(off); off += 1;
  const principal = new PublicKey(d.slice(off, off + 32)); off += 32;
  const humanProfile = new PublicKey(d.slice(off, off + 32)); off += 32;
  const agent = new PublicKey(d.slice(off, off + 32)); off += 32;
  const humanrailCapability = new PublicKey(d.slice(off, off + 32)); off += 32;
  const dwallet = new PublicKey(d.slice(off, off + 32)); off += 32;
  const allowedChainId = d.readUInt32LE(off); off += 4;
  const allowedAssetHash = d.slice(off, off + 32); off += 32;
  const allowedRecipientHash = d.slice(off, off + 32); off += 32;
  const perTxLimit = d.readBigUInt64LE(off); off += 8;
  const dailyLimit = d.readBigUInt64LE(off); off += 8;
  const totalLimit = d.readBigUInt64LE(off); off += 8;
  const dailySpent = d.readBigUInt64LE(off); off += 8;
  const totalSpent = d.readBigUInt64LE(off); off += 8;
  const lastSpendDay = d.readBigInt64LE(off); off += 8;
  const expiresAt = d.readBigInt64LE(off); off += 8;
  const frozen = d.readUInt8(off) !== 0; off += 1;
  const bump = d.readUInt8(off); off += 1;
  return {
    version, principal, humanProfile, agent, humanrailCapability, dwallet,
    allowedChainId, allowedAssetHash, allowedRecipientHash,
    perTxLimit, dailyLimit, totalLimit, dailySpent, totalSpent, lastSpendDay,
    expiresAt, frozen, bump,
  };
}

function parseGuardSigningRequest(data: Buffer) {
  if (data.length < 8 + 379) throw new Error("GuardSigningRequest data too short");
  const d = Buffer.from(data);
  const disc = d.slice(0, 8);
  if (!disc.equals(GUARD_SIGNING_REQUEST_DISCRIMINATOR)) {
    throw new Error("Invalid GuardSigningRequest discriminator");
  }
  let off = 8;
  const version = d.readUInt8(off); off += 1;
  const requestId = d.slice(off, off + 32); off += 32;
  const guardedDwallet = new PublicKey(d.slice(off, off + 32)); off += 32;
  const principal = new PublicKey(d.slice(off, off + 32)); off += 32;
  const agent = new PublicKey(d.slice(off, off + 32)); off += 32;
  const dwallet = new PublicKey(d.slice(off, off + 32)); off += 32;
  const messageDigest = d.slice(off, off + 32); off += 32;
  const messageMetadataDigest = d.slice(off, off + 32); off += 32;
  const destinationChainId = d.readUInt32LE(off); off += 4;
  const assetHash = d.slice(off, off + 32); off += 32;
  const recipientHash = d.slice(off, off + 32); off += 32;
  const amount = d.readBigUInt64LE(off); off += 8;
  const signatureScheme = d.readUInt16LE(off); off += 2;
  const status = d.readUInt8(off); off += 1;
  const rejectionCode = d.readUInt16LE(off); off += 2;
  const ikaMessageApproval = new PublicKey(d.slice(off, off + 32)); off += 32;
  const createdAt = d.readBigInt64LE(off); off += 8;
  const bump = d.readUInt8(off); off += 1;
  return {
    version, requestId, guardedDwallet, principal, agent, dwallet,
    messageDigest, messageMetadataDigest, destinationChainId,
    assetHash, recipientHash, amount, signatureScheme, status,
    rejectionCode, ikaMessageApproval, createdAt, bump,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const useRealIka = process.argv.includes("--real-ika");

  console.log("========================================");
  if (useRealIka) {
    console.log("Phase 5C — Create Real Ika Guarded dWallet Policy");
  } else {
    console.log("Phase 4B — Create Guarded dWallet Policy");
  }
  console.log("========================================\n");

  // 1. Load payer
  const keypair = loadKeypair();
  const principal = keypair.publicKey;
  console.log("Principal:", principal.toBase58());

  const connection = new Connection(RPC, "confirmed");
  const balance = await connection.getBalance(principal);
  console.log("Balance:", (balance / 1e9).toFixed(4), "SOL\n");

  if (balance < 0.05e9) {
    console.error("ERROR: Insufficient balance. Need at least 0.05 SOL for devnet fees.");
    process.exit(1);
  }

  const guardProgramId = getDwalletGuardProgramId();
  console.log("Guard Program ID:", guardProgramId.toBase58());

  // Verify guard program is executable
  const guardAccount = await connection.getAccountInfo(guardProgramId);
  if (!guardAccount || !guardAccount.executable) {
    console.error("ERROR: Guard program is not deployed or not executable on devnet.");
    process.exit(1);
  }
  console.log("Guard program: EXECUTABLE ✅\n");

  // ------------------------------------------------------------------
  // 2. Determine dWallet
  // ------------------------------------------------------------------
  let dwallet: PublicKey;
  let dwalletLabel: string;

  if (useRealIka) {
    console.log("--- Mode: REAL IKA DWALLET ---");
    if (!fs.existsSync(DWALLET_ARTIFACT_PATH)) {
      console.error("ERROR: dWallet artifact not found:", DWALLET_ARTIFACT_PATH);
      console.error("Run `npm run ika:create-dwallet` first.");
      process.exit(1);
    }

    const dwalletArtifact = JSON.parse(fs.readFileSync(DWALLET_ARTIFACT_PATH, "utf-8"));
    dwallet = new PublicKey(dwalletArtifact.dwallet_pda);
    dwalletLabel = REAL_IKA_LABEL;

    console.log("dWallet PDA (from artifact):", dwallet.toBase58());
    console.log("dWallet curve:", dwalletArtifact.curve);

    // Verify dWallet authority == Guard CPI PDA
    const dwalletInfo = await connection.getAccountInfo(dwallet);
    if (!dwalletInfo) {
      console.error("ERROR: dWallet account not found on-chain.");
      process.exit(1);
    }

    const parsed = parseIkaDwalletAccount(dwalletInfo.data as Buffer);
    if (!parsed) {
      console.error("ERROR: Failed to parse dWallet account.");
      process.exit(1);
    }

    const [guardCpiAuthority] = deriveHumanRailGuardCpiAuthority(guardProgramId);
    console.log("Expected authority (Guard CPI PDA):", guardCpiAuthority.toBase58());
    console.log("Actual authority:", parsed.authority.toBase58());

    if (parsed.authority.toBase58() !== guardCpiAuthority.toBase58()) {
      console.error("\nERROR: dWallet authority is NOT the Guard CPI PDA.");
      console.error("Run `npm run ika:transfer-authority` first.");
      process.exit(1);
    }
    console.log("  ✅ dWallet authority verified as Guard CPI PDA\n");
  } else {
    console.log("--- Mode: PLACEHOLDER DWALLET (Phase 4B) ---");
    const dwalletSeed = "phase-4b-demo-dwallet-seed-v1";
    dwallet = await PublicKey.createWithSeed(principal, dwalletSeed, SystemProgram.programId);
    dwalletLabel = DEMO_DWALLET_LABEL;
    console.log("dWallet pubkey (placeholder):", dwallet.toBase58());
    console.log("  Label:", dwalletLabel);
    console.log("  ✅ Placeholder ready\n");
  }

  // ------------------------------------------------------------------
  // 3. Demo reference accounts
  // ------------------------------------------------------------------
  console.log("--- Step 1: Demo Reference Accounts ---");
  const humanProfile = await PublicKey.createWithSeed(principal, "phase4b-human-profile", SystemProgram.programId);
  const agent = await PublicKey.createWithSeed(principal, "phase4b-agent", SystemProgram.programId);
  const humanrailCapability = await PublicKey.createWithSeed(principal, "phase4b-capability", SystemProgram.programId);
  console.log("Human Profile (demo):", humanProfile.toBase58());
  console.log("Agent (demo):", agent.toBase58());
  console.log("Capability (demo):", humanrailCapability.toBase58());
  console.log("  ✅ Demo references ready (no owner checks in demo mode)\n");

  // ------------------------------------------------------------------
  // 4. GuardedDwallet
  // ------------------------------------------------------------------
  console.log("--- Step 2: GuardedDwallet ---");
  const [guardedDwalletPda, guardedBump] = deriveGuardedDwalletPda(
    principal,
    agent,
    dwallet,
    guardProgramId
  );
  console.log("GuardedDwallet PDA:", guardedDwalletPda.toBase58());
  console.log("  Bump:", guardedBump);

  const existingGuarded = await connection.getAccountInfo(guardedDwalletPda);
  if (existingGuarded && !process.env.FORCE) {
    console.log("GuardedDwallet already exists. Fetching...");
  } else {
    const assetHash = hashInput("USDC:BASE_SEPOLIA");
    const recipientHash = hashInput("0x1111111111111111111111111111111111111111");
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);

    console.log("Policy values:");
    console.log("  allowed_chain_id:", DEMO_CHAIN_ID);
    console.log("  per_tx_limit:", PER_TX_LIMIT.toString());
    console.log("  daily_limit:", DAILY_LIMIT.toString());
    console.log("  total_limit:", TOTAL_LIMIT.toString());
    console.log("  expires_at:", new Date(Number(expiresAt) * 1000).toISOString());

    const tx = buildInitializeGuardedDwalletDemoIx(guardProgramId, {
      principal,
      guardedDwallet: guardedDwalletPda,
      humanProfile,
      agent,
      humanrailCapability,
      dwallet,
      allowedChainId: DEMO_CHAIN_ID,
      allowedAssetHash: assetHash,
      allowedRecipientHash: recipientHash,
      perTxLimit: PER_TX_LIMIT,
      dailyLimit: DAILY_LIMIT,
      totalLimit: TOTAL_LIMIT,
      expiresAt,
    });
    const sig = await sendTx(connection, tx, [keypair]);
    console.log("  initialize_guarded_dwallet_demo tx:", sig);
    await sleep(SLEEP_MS);
  }

  const guardedData = await connection.getAccountInfo(guardedDwalletPda);
  if (!guardedData) {
    console.error("ERROR: GuardedDwallet not found after creation.");
    process.exit(1);
  }

  const parsed = parseGuardedDwallet(guardedData.data);
  console.log("\nParsed GuardedDwallet:");
  console.log("  version:", parsed.version);
  console.log("  principal:", parsed.principal.toBase58());
  console.log("  human_profile:", parsed.humanProfile.toBase58());
  console.log("  agent:", parsed.agent.toBase58());
  console.log("  humanrail_capability:", parsed.humanrailCapability.toBase58());
  console.log("  dwallet:", parsed.dwallet.toBase58());
  console.log("  allowed_chain_id:", parsed.allowedChainId);
  console.log("  per_tx_limit:", parsed.perTxLimit.toString());
  console.log("  daily_limit:", parsed.dailyLimit.toString());
  console.log("  total_limit:", parsed.totalLimit.toString());
  console.log("  daily_spent:", parsed.dailySpent.toString());
  console.log("  total_spent:", parsed.totalSpent.toString());
  console.log("  expires_at:", new Date(Number(parsed.expiresAt) * 1000).toISOString());
  console.log("  frozen:", parsed.frozen);
  console.log("  bump:", parsed.bump);
  console.log("  ✅ GuardedDwallet created and parsed\n");

  // ------------------------------------------------------------------
  // 5. Freeze / Unfreeze / Rejected request (Phase 4B only)
  // ------------------------------------------------------------------
  if (!useRealIka) {
    // Freeze
    console.log("--- Step 3: Freeze ---");
    if (parsed.frozen) {
      console.log("Already frozen. Skipping freeze.");
    } else {
      const tx = buildFreezeGuardedDwalletIx(guardProgramId, principal, guardedDwalletPda);
      const sig = await sendTx(connection, tx, [keypair]);
      console.log("  freeze_guarded_dwallet tx:", sig);
      await sleep(SLEEP_MS);

      const frozenData = await connection.getAccountInfo(guardedDwalletPda);
      if (!frozenData) throw new Error("GuardedDwallet disappeared after freeze");
      const frozenParsed = parseGuardedDwallet(frozenData.data);
      console.log("  frozen:", frozenParsed.frozen);
      if (!frozenParsed.frozen) {
        console.error("ERROR: Freeze did not set frozen=true");
        process.exit(1);
      }
    }
    console.log("  ✅ Frozen verified\n");

    // Unfreeze
    console.log("--- Step 4: Unfreeze ---");
    const preUnfreezeData = await connection.getAccountInfo(guardedDwalletPda);
    if (!preUnfreezeData) throw new Error("GuardedDwallet not found before unfreeze");
    const preUnfreezeParsed = parseGuardedDwallet(preUnfreezeData.data);

    if (!preUnfreezeParsed.frozen) {
      console.log("Already unfrozen. Skipping unfreeze.");
    } else {
      const tx = buildUnfreezeGuardedDwalletIx(guardProgramId, principal, guardedDwalletPda);
      const sig = await sendTx(connection, tx, [keypair]);
      console.log("  unfreeze_guarded_dwallet tx:", sig);
      await sleep(SLEEP_MS);

      const unfrozenData = await connection.getAccountInfo(guardedDwalletPda);
      if (!unfrozenData) throw new Error("GuardedDwallet disappeared after unfreeze");
      const unfrozenParsed = parseGuardedDwallet(unfrozenData.data);
      console.log("  frozen:", unfrozenParsed.frozen);
      if (unfrozenParsed.frozen) {
        console.error("ERROR: Unfreeze did not set frozen=false");
        process.exit(1);
      }
    }
    console.log("  ✅ Unfrozen verified\n");

    // Rejected Signing Request
    console.log("--- Step 5: Rejected Signing Request ---");
    const message = "HumanRail Guarded dWallet demo rejected request";
    const messageDigest = hashInput(message);
    const messageMetadataDigest = hashInput("phase-4b-metadata");
    const requestId = hashInput("phase-4b-rejected-request-" + Date.now().toString());
    const assetHash = hashInput("USDC:BASE_SEPOLIA");
    const recipientHash = hashInput("0x1111111111111111111111111111111111111111");
    const rejectAmount = BigInt(101_000_000);

    const [guardSigningRequestPda, requestBump] = deriveGuardSigningRequestPda(
      guardedDwalletPda,
      requestId,
      guardProgramId
    );
    console.log("GuardSigningRequest PDA:", guardSigningRequestPda.toBase58());
    console.log("  Bump:", requestBump);

    const [cpiAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("__ika_cpi_authority")],
      guardProgramId
    );
    console.log("CPI Authority PDA:", cpiAuthority.toBase58());

    const dummyCoordinator = Keypair.generate().publicKey;
    const dummyMessageApproval = Keypair.generate().publicKey;

    const tx = buildApproveGuardedMessageIx(guardProgramId, {
      requester: principal,
      guardedDwallet: guardedDwalletPda,
      guardSigningRequest: guardSigningRequestPda,
      dwallet,
      cpiAuthority,
      coordinator: dummyCoordinator,
      messageApproval: dummyMessageApproval,
      requestId,
      messageDigest,
      messageMetadataDigest,
      destinationChainId: DEMO_CHAIN_ID,
      assetHash,
      recipientHash,
      amount: rejectAmount,
      signatureScheme: 0,
      messageApprovalBump: 0,
    });
    const sig = await sendTx(connection, tx, [keypair]);
    console.log("  approve_guarded_message tx:", sig);
    await sleep(SLEEP_MS);

    const requestData = await connection.getAccountInfo(guardSigningRequestPda);
    if (!requestData) {
      console.error("ERROR: GuardSigningRequest not found after transaction.");
      process.exit(1);
    }

    const parsedRequest = parseGuardSigningRequest(requestData.data);
    console.log("\nParsed GuardSigningRequest:");
    console.log("  version:", parsedRequest.version);
    console.log("  request_id:", Buffer.from(parsedRequest.requestId).toString("hex").slice(0, 16) + "...");
    console.log("  guarded_dwallet:", parsedRequest.guardedDwallet.toBase58());
    console.log("  principal:", parsedRequest.principal.toBase58());
    console.log("  agent:", parsedRequest.agent.toBase58());
    console.log("  dwallet:", parsedRequest.dwallet.toBase58());
    console.log("  destination_chain_id:", parsedRequest.destinationChainId);
    console.log("  amount:", parsedRequest.amount.toString());
    console.log("  signature_scheme:", parsedRequest.signatureScheme);
    console.log("  status:", parsedRequest.status, "(1=approved, 2=rejected)");
    console.log("  rejection_code:", parsedRequest.rejectionCode, "(7=per_tx_limit_exceeded)");
    console.log("  ika_message_approval:", parsedRequest.ikaMessageApproval.toBase58());
    console.log("  created_at:", new Date(Number(parsedRequest.createdAt) * 1000).toISOString());
    console.log("  bump:", parsedRequest.bump);

    if (parsedRequest.status !== 2) {
      console.error("ERROR: Expected status=2 (rejected), got", parsedRequest.status);
      process.exit(1);
    }
    if (parsedRequest.rejectionCode !== 7) {
      console.error("ERROR: Expected rejection_code=7 (per_tx_limit_exceeded), got", parsedRequest.rejectionCode);
      process.exit(1);
    }
    console.log("  ✅ Rejected request verified (status=2, code=7, no Ika CPI)\n");
  }

  // ------------------------------------------------------------------
  // 6. Write artifact (Phase 5C only)
  // ------------------------------------------------------------------
  if (useRealIka) {
    const assetHash = hashInput("USDC:BASE_SEPOLIA");
    const recipientHash = hashInput("0x1111111111111111111111111111111111111111");

    const artifact = {
      label: REAL_IKA_LABEL,
      createdAt: new Date().toISOString(),
      guardedDwalletPda: guardedDwalletPda.toBase58(),
      principal: principal.toBase58(),
      humanProfile: humanProfile.toBase58(),
      agent: agent.toBase58(),
      humanrailCapability: humanrailCapability.toBase58(),
      dwallet: dwallet.toBase58(),
      policy: {
        allowedChainId: DEMO_CHAIN_ID,
        allowedAssetHash: Buffer.from(assetHash).toString("hex"),
        allowedRecipientHash: Buffer.from(recipientHash).toString("hex"),
        perTxLimit: PER_TX_LIMIT.toString(),
        dailyLimit: DAILY_LIMIT.toString(),
        totalLimit: TOTAL_LIMIT.toString(),
        expiresAt: new Date(Number(parsed.expiresAt) * 1000).toISOString(),
      },
      parsed: {
        version: parsed.version,
        frozen: parsed.frozen,
        bump: parsed.bump,
      },
      note: "Demo HumanRail refs; real Ika dWallet.",
    };

    fs.writeFileSync(GUARDED_ARTIFACT_PATH, JSON.stringify(artifact, null, 2));
    console.log("Artifact written:", GUARDED_ARTIFACT_PATH);
  }

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log("========================================");
  if (useRealIka) {
    console.log("Phase 5C Complete — Summary");
  } else {
    console.log("Phase 4B Complete — Summary");
  }
  console.log("========================================");
  console.log("Principal:", principal.toBase58());
  console.log("Human Profile (demo):", humanProfile.toBase58());
  console.log("Agent (demo):", agent.toBase58());
  console.log("Capability (demo):", humanrailCapability.toBase58());
  console.log("dWallet:", dwallet.toBase58());
  console.log("  Label:", dwalletLabel);
  console.log("GuardedDwallet PDA:", guardedDwalletPda.toBase58());
  if (!useRealIka) {
    console.log("GuardSigningRequest PDA:", "(see above)");
  }
  console.log("\nAll transactions confirmed on devnet.");
  if (useRealIka) {
    console.log("\nNext step: approved approve_guarded_message → Phase 5D.");
  } else {
    console.log("Placeholder dWallet used:", DEMO_DWALLET_LABEL);
    console.log("Real Ika dWallet + authority transfer → Phase 5.");
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
