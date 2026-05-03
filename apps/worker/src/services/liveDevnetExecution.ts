/**
 * Live devnet execution service for Mandara signing requests.
 *
 * Phase P4B — HumanRail Guard CPI + Ika gRPC Sign
 *
 * Architecture:
 * 1. TypeScript: Build and submit approve_guarded_message transaction
 * 2. TypeScript: Verify GuardSigningRequest + MessageApproval on-chain
 * 3. TypeScript: Write temporary request artifact
 * 4. Spawn: Rust CLI (ika-dkg-cli sign-approved-message)
 * 5. TypeScript: Poll MessageApproval for signature
 * 6. TypeScript: Update DB records
 *
 * Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.
 * Devnet only. Not production custody.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { prisma } from "@mandara/db";
import { env } from "../config.js";
import { logger } from "../lib/logger.js";
import { recordAuditEvent } from "../lib/audit.js";
import { scheduleWebhookEvent } from "./webhookEvents.js";

import { buildApproveGuardedMessageIx } from "../solana/instructions.js";
import {
  deriveIkaMessageApprovalPda,
  deriveHumanRailGuardCpiAuthority,
  deriveIkaCoordinatorPda,
} from "../solana/pda.js";
import {
  parseIkaDwalletAccount,
  parseIkaMessageApprovalAccount,
} from "../solana/parsers.js";
import {
  DWalletCurve,
  DWalletState,
  IkaSignatureScheme,
  MessageApprovalStatus,
} from "../solana/types.js";

// ── Constants ──

const HUMANRAIL_GUARD_PROGRAM_ID = new PublicKey(
  env.MANDARA_HUMANRAIL_GUARD_PROGRAM_ID
);
const DWALLET_ARTIFACT_PATH = ".local-ika/dwallet.json";
const WORKER_ARTIFACT_DIR = ".local-worker";

// ── Types ──

export interface LiveExecutionResult {
  success: boolean;
  status:
    | "guard_approved"
    | "ika_pending"
    | "signed"
    | "policy_rejected"
    | "failed";
  approveTxSignature?: string;
  guardSigningRequestPda?: string;
  ikaMessageApprovalPda?: string;
  signatureHex?: string;
  signatureBase64?: string;
  signatureLen?: number;
  error?: string;
}

interface DwalletArtifact {
  dwallet_pda: string;
  dwallet_signing_public_key_hex: string;
  curve: string;
  authority: string;
  state: string;
}

// ── Helpers ──

function loadServiceWallet(): Keypair {
  const walletPath = env.MANDARA_SERVICE_WALLET_PATH;
  if (!walletPath) {
    throw new Error("MANDARA_SERVICE_WALLET_PATH is required for live execution");
  }
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Service wallet not found at ${walletPath}`);
  }
  const secret = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

function loadDwalletArtifact(): DwalletArtifact {
  if (!fs.existsSync(DWALLET_ARTIFACT_PATH)) {
    throw new Error(`dWallet artifact not found at ${DWALLET_ARTIFACT_PATH}. Run DKG first.`);
  }
  return JSON.parse(fs.readFileSync(DWALLET_ARTIFACT_PATH, "utf-8"));
}

function keccak256(data: Uint8Array | string): Uint8Array {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return keccak_256(bytes);
}

function hashPolicyInput(input: string): Uint8Array {
  return keccak_256(new TextEncoder().encode(input));
}

function parseCurve(name: string): DWalletCurve {
  switch (name) {
    case "Secp256k1": return DWalletCurve.Secp256k1;
    case "Secp256r1": return DWalletCurve.Secp256r1;
    case "Curve25519": return DWalletCurve.Curve25519;
    case "Ristretto": return DWalletCurve.Ristretto;
    default: return DWalletCurve.Secp256k1;
  }
}

function parseSignatureScheme(name: string): IkaSignatureScheme {
  switch (name) {
    case "EcdsaKeccak256": return IkaSignatureScheme.EcdsaKeccak256;
    case "EcdsaSha256": return IkaSignatureScheme.EcdsaSha256;
    case "EcdsaDoubleSha256": return IkaSignatureScheme.EcdsaDoubleSha256;
    case "EddsaSha512": return IkaSignatureScheme.EddsaSha512;
    default: return IkaSignatureScheme.EcdsaKeccak256;
  }
}

async function sendAndConfirmTx(
  connection: Connection,
  ix: ReturnType<typeof buildApproveGuardedMessageIx>,
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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollMessageApprovalSigned(
  connection: Connection,
  maPda: PublicKey,
  timeoutMs: number = 180_000
): Promise<{ signatureLen: number; signature: Uint8Array }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const acct = await connection.getAccountInfo(maPda, "confirmed");
    if (acct && acct.data.length >= 312 && acct.data[0] === 14) {
      const status = acct.data[172];
      const sigLen = acct.data.readUInt16LE(173);
      if (status === 1 && sigLen > 0) {
        const sig = acct.data.slice(175, 175 + sigLen);
        return { signatureLen: sigLen, signature: sig };
      }
    }
    await sleep(3000);
  }
  throw new Error("Timeout waiting for MessageApproval to become Signed");
}

async function runIkaSignCli(
  requestArtifactPath: string,
  timeoutMs: number = 300_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const args = [
      "run",
      "--manifest-path",
      "tools/ika-dkg-cli/Cargo.toml",
      "--",
      "sign-approved-message",
      "--keypair",
      env.MANDARA_SERVICE_WALLET_PATH,
      "--rpc-url",
      env.MANDARA_SOLANA_RPC_URL,
      "--grpc-url",
      env.MANDARA_IKA_GRPC_URL,
      "--dwallet-artifact",
      DWALLET_ARTIFACT_PATH,
      "--request-artifact",
      requestArtifactPath,
    ];

    logger.info("Spawning ika-dkg-cli sign-approved-message", { args: args.map((a) => (a.includes("/") ? "..." : a)) });

    const child = spawn("cargo", args, {
      cwd: process.cwd(),
      timeout: timeoutMs,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString("utf-8");
      stdout += chunk;
      // Log truncated stdout
      const lines = chunk.split("\n").filter((l) => l.trim());
      for (const line of lines.slice(-5)) {
        logger.info("[ika-cli] " + line.slice(0, 200));
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString("utf-8");
      stderr += chunk;
      const lines = chunk.split("\n").filter((l) => l.trim());
      for (const line of lines.slice(-5)) {
        logger.warn("[ika-cli] " + line.slice(0, 200));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`ika-dkg-cli spawn error: ${err.message}`));
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

// ── Main execution ──

export async function executeLiveDevnetSigningRequest(
  signingRequestId: string,
  organizationId: string
): Promise<LiveExecutionResult> {
  logger.info("Starting live devnet execution", { signingRequestId });

  // 1. Load prerequisites
  const payer = loadServiceWallet();
  const dwalletArtifact = loadDwalletArtifact();
  const connection = new Connection(env.MANDARA_SOLANA_RPC_URL, "confirmed");

  logger.info("Service wallet loaded", { pubkey: payer.publicKey.toBase58() });

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  logger.info("Service wallet balance", { sol: balance / 1e9 });
  if (balance < 1_000_000) {
    throw new Error(`Service wallet balance too low: ${balance} lamports`);
  }

  // 2. Load DB signing request
  const signingRequest = await prisma.signingRequest.findUnique({
    where: { id: signingRequestId },
    include: {
      policy: {
        include: {
          agent: { select: { status: true } },
          ikaDwallet: { select: { state: true, onChainPda: true } },
        },
      },
      agent: { select: { status: true } },
      ikaDwallet: { select: { state: true, onChainPda: true } },
      messageApproval: true,
    },
  });

  if (!signingRequest) {
    throw new Error(`Signing request ${signingRequestId} not found in DB`);
  }

  const policy = signingRequest.policy;
  if (!policy.onChainPda) {
    throw new Error("Policy does not have an on-chain GuardedDwallet PDA");
  }

  const dwalletPda = new PublicKey(dwalletArtifact.dwallet_pda);
  const guardedDwalletPda = new PublicKey(policy.onChainPda);
  const [guardCpiAuthority] = deriveHumanRailGuardCpiAuthority(HUMANRAIL_GUARD_PROGRAM_ID);
  const [coordinatorPda] = deriveIkaCoordinatorPda();

  logger.info("On-chain addresses", {
    dwallet: dwalletPda.toBase58(),
    guardedDwallet: guardedDwalletPda.toBase58(),
    guardCpiAuthority: guardCpiAuthority.toBase58(),
  });

  // 3. Verify dWallet on-chain
  const dwalletInfo = await connection.getAccountInfo(dwalletPda, "confirmed");
  if (!dwalletInfo) throw new Error("dWallet account not found on-chain");
  const parsedDwallet = parseIkaDwalletAccount(dwalletInfo.data);
  if (!parsedDwallet) throw new Error("Failed to parse dWallet account");

  if (parsedDwallet.authority.toBase58() !== guardCpiAuthority.toBase58()) {
    throw new Error(`dWallet authority mismatch: expected ${guardCpiAuthority.toBase58()}, got ${parsedDwallet.authority.toBase58()}`);
  }
  if (parsedDwallet.state !== DWalletState.Active) {
    throw new Error(`dWallet not Active: state=${parsedDwallet.state}`);
  }
  logger.info("dWallet verified: Active, authority matches Guard CPI");

  // 4. Build request parameters
  const message = signingRequest.message ?? "";
  const messageDigest = keccak256(message);
  const messageMetadataDigest = new Uint8Array(32); // all zeros
  const destinationChainId = signingRequest.destinationChainId;
  const assetHash = hashPolicyInput(signingRequest.asset ?? "");
  const recipientHash = hashPolicyInput(signingRequest.recipient ?? "");
  const amount = BigInt(signingRequest.amount.toString());
  const signatureScheme = parseSignatureScheme(signingRequest.signatureScheme);
  const publicKeyBytes = Buffer.from(dwalletArtifact.dwallet_signing_public_key_hex, "hex");
  const curveEnum = parseCurve(dwalletArtifact.curve);

  // Unique requestId: keccak256(signingRequest.id + ":" + messageDigestHex)
  const requestIdInput = signingRequestId + ":" + Buffer.from(messageDigest).toString("hex");
  const requestId = keccak256(requestIdInput);

  logger.info("Request parameters", {
    messageDigest: Buffer.from(messageDigest).toString("hex"),
    requestId: Buffer.from(requestId).toString("hex"),
    destinationChainId,
    amount: amount.toString(),
  });

  // 5. Derive PDAs
  const [guardSigningRequestPda, gsrBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("guard_signing_request"), guardedDwalletPda.toBuffer(), Buffer.from(requestId)],
    HUMANRAIL_GUARD_PROGRAM_ID
  );

  const [messageApprovalPda, maBump] = deriveIkaMessageApprovalPda(
    curveEnum,
    publicKeyBytes,
    signatureScheme,
    messageDigest,
    messageMetadataDigest
  );

  logger.info("Derived PDAs", {
    guardSigningRequest: guardSigningRequestPda.toBase58(),
    messageApproval: messageApprovalPda.toBase58(),
  });

  // 6. Check MessageApproval idempotency
  const existingMa = await connection.getAccountInfo(messageApprovalPda, "confirmed");
  let parsedMa: import("../solana/types.js").IkaMessageApproval | null = null;
  let skipGuardCpi = false;
  let approveTxSignature = "";

  if (existingMa) {
    parsedMa = parseIkaMessageApprovalAccount(existingMa.data);
    if (parsedMa) {
      const digestMatch = Buffer.from(parsedMa.messageDigest).equals(Buffer.from(messageDigest));
      const dwalletMatch = parsedMa.dwallet.toBase58() === dwalletPda.toBase58();

      if (!digestMatch || !dwalletMatch) {
        throw new Error("MessageApproval exists but does not match this request (mismatch)");
      }

      if (parsedMa.status === MessageApprovalStatus.Signed && parsedMa.signatureLen > 0) {
        logger.info("MessageApproval already signed — idempotent success", {
          signatureLen: parsedMa.signatureLen,
        });
        const signatureHex = Buffer.from(parsedMa.signature).toString("hex");
        const signatureBase64 = Buffer.from(parsedMa.signature).toString("base64");

        // Update DB
        await upsertMessageApproval(signingRequestId, organizationId, messageApprovalPda.toBase58(), parsedMa);
        await prisma.signingRequest.update({
          where: { id: signingRequestId },
          data: {
            status: "signed",
            onChainRequestPda: guardSigningRequestPda.toBase58(),
            onChainMessageApprovalPda: messageApprovalPda.toBase58(),
            signatureHex,
            signatureBase64,
            signedAt: new Date(),
          },
        });

        await recordAuditEvent({
          organizationId,
          actorType: "worker",
          eventType: "ika_signature_committed",
          resourceType: "signing_request",
          resourceId: signingRequestId,
          summary: `Idempotent: MessageApproval already signed for ${signingRequestId}`,
          metadata: { signatureLen: parsedMa.signatureLen, idempotent: true },
        });

        return {
          success: true,
          status: "signed",
          guardSigningRequestPda: guardSigningRequestPda.toBase58(),
          ikaMessageApprovalPda: messageApprovalPda.toBase58(),
          signatureHex,
          signatureBase64,
          signatureLen: parsedMa.signatureLen,
        };
      }

      if (parsedMa.status === MessageApprovalStatus.Pending) {
        // Verify GuardSigningRequest also exists and is approved
        const gsrInfo = await connection.getAccountInfo(guardSigningRequestPda, "confirmed");
        if (gsrInfo && gsrInfo.data.length > 312) {
          const gsrStatus = gsrInfo.data[311];
          if (gsrStatus === 1) {
            logger.info("MessageApproval Pending + GSR approved — skipping Guard CPI");
            skipGuardCpi = true;
          } else {
            throw new Error(`GuardSigningRequest exists but status=${gsrStatus} (expected approved)`);
          }
        } else {
          throw new Error("MessageApproval is Pending but GuardSigningRequest not found — inconsistent state");
        }
      }
    }
  }

  // 7. Build and send approve_guarded_message (if not skipped)
  if (!skipGuardCpi) {
    const ix = buildApproveGuardedMessageIx(HUMANRAIL_GUARD_PROGRAM_ID, {
      requester: payer.publicKey,
      guardedDwallet: guardedDwalletPda,
      guardSigningRequest: guardSigningRequestPda,
      dwallet: dwalletPda,
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

    logger.info("Sending approve_guarded_message transaction...");
    approveTxSignature = await sendAndConfirmTx(connection, ix, [payer]);
    logger.info("Transaction confirmed", { signature: approveTxSignature });

    await recordAuditEvent({
      organizationId,
      actorType: "worker",
      eventType: "guard_message_approved",
      resourceType: "signing_request",
      resourceId: signingRequestId,
      summary: `Guard approved message for ${signingRequestId}`,
      metadata: {
        approveTxSignature,
        guardSigningRequestPda: guardSigningRequestPda.toBase58(),
        messageApprovalPda: messageApprovalPda.toBase58(),
      },
    });
  } else {
    logger.info("Skipping Guard CPI — MessageApproval already Pending with approved GSR");
  }

  // 8. Verify GuardSigningRequest
  if (!skipGuardCpi) {
    await sleep(2000);
  }
  const gsrInfo = await connection.getAccountInfo(guardSigningRequestPda, "confirmed");
  if (!gsrInfo) throw new Error("GuardSigningRequest not found on-chain");

  // GSR layout: discriminator(8) + version(1) + requestId(32) + guardedDwallet(32) + principal(32) + agent(32) + dwallet(32) + messageDigest(32) + messageMetadataDigest(32) + destinationChainId(4) + assetHash(32) + recipientHash(32) + amount(8) + signatureScheme(2) + status(1) + rejectionCode(2) + ...
  // status offset = 8 + 1 + 32*7 + 4 + 32*2 + 8 + 2 = 311
  const gsrStatus = gsrInfo.data[311];
  const gsrRejectionCode = gsrInfo.data.readUInt16LE(312);

  if (gsrStatus !== 1) {
    throw new Error(`GuardSigningRequest status=${gsrStatus}, rejectionCode=${gsrRejectionCode}`);
  }
  logger.info("GuardSigningRequest verified: approved");

  await prisma.signingRequest.update({
    where: { id: signingRequestId },
    data: {
      status: "guard_approved",
      onChainRequestPda: guardSigningRequestPda.toBase58(),
      onChainMessageApprovalPda: messageApprovalPda.toBase58(),
      approveTxSignature: approveTxSignature || null,
    },
  });

  await recordAuditEvent({
    organizationId,
    actorType: "worker",
    eventType: "signing_request_status_updated",
    resourceType: "signing_request",
    resourceId: signingRequestId,
    summary: `Signing request ${signingRequestId} status updated to guard_approved`,
    metadata: { status: "guard_approved" },
  });

  await scheduleWebhookEvent({
    organizationId,
    eventType: "signature.guard_approved",
    signingRequestId,
    data: {
      signingRequestId,
      status: "guard_approved",
      onChainRequestPda: guardSigningRequestPda.toBase58(),
      onChainMessageApprovalPda: messageApprovalPda.toBase58(),
    },
  });

  // 9. Verify MessageApproval is Pending
  const maInfo = await connection.getAccountInfo(messageApprovalPda, "confirmed");
  if (!maInfo) throw new Error("MessageApproval not found on-chain");
  const freshParsedMa = parseIkaMessageApprovalAccount(maInfo.data);
  if (!freshParsedMa) throw new Error("Failed to parse MessageApproval account");

  if (freshParsedMa.status !== MessageApprovalStatus.Pending) {
    throw new Error(`MessageApproval status=${freshParsedMa.status} (expected Pending)`);
  }
  logger.info("MessageApproval verified: Pending");

  // Create/upsert MessageApproval in DB
  await upsertMessageApproval(signingRequestId, organizationId, messageApprovalPda.toBase58(), freshParsedMa);

  await prisma.signingRequest.update({
    where: { id: signingRequestId },
    data: {
      status: "ika_pending",
      onChainMessageApprovalPda: messageApprovalPda.toBase58(),
    },
  });

  await recordAuditEvent({
    organizationId,
    actorType: "worker",
    eventType: "ika_message_approval_created",
    resourceType: "signing_request",
    resourceId: signingRequestId,
    summary: `Ika MessageApproval created for ${signingRequestId}`,
    metadata: { messageApprovalPda: messageApprovalPda.toBase58(), status: "pending" },
  });

  await scheduleWebhookEvent({
    organizationId,
    eventType: "signature.ika_pending",
    signingRequestId,
    data: {
      signingRequestId,
      status: "ika_pending",
      onChainMessageApprovalPda: messageApprovalPda.toBase58(),
    },
  });

  // 10. Write temporary request artifact for Rust CLI
  fs.mkdirSync(WORKER_ARTIFACT_DIR, { recursive: true });
  const requestArtifactPath = path.join(
    WORKER_ARTIFACT_DIR,
    `${signingRequestId}.json`
  );

  const requestArtifact = {
    createdAt: new Date().toISOString(),
    preimage: message,
    messageDigestHex: Buffer.from(messageDigest).toString("hex"),
    messageMetadataDigestHex: Buffer.from(messageMetadataDigest).toString("hex"),
    signatureScheme: signingRequest.signatureScheme,
    requestIdHex: Buffer.from(requestId).toString("hex"),
    guardedDwalletPda: guardedDwalletPda.toBase58(),
    guardSigningRequestPda: guardSigningRequestPda.toBase58(),
    ikaMessageApprovalPda: messageApprovalPda.toBase58(),
    approveGuardedMessageSignature: approveTxSignature,
    amount: amount.toString(),
    destinationChainId,
    assetHashHex: Buffer.from(assetHash).toString("hex"),
    recipientHashHex: Buffer.from(recipientHash).toString("hex"),
    status: "PendingIkaSignature",
    notes: "Created by Mandara worker P4B",
  };

  fs.writeFileSync(requestArtifactPath, JSON.stringify(requestArtifact, null, 2));
  logger.info("Wrote request artifact", { path: requestArtifactPath });

  let signatureHex: string | undefined;
  let signatureBase64: string | undefined;
  let signatureLen: number | undefined;

  try {
    // 11. Spawn Rust CLI for Ika sign
    logger.info("Spawning Ika sign CLI...");
    const cliResult = await runIkaSignCli(requestArtifactPath);

    if (cliResult.exitCode !== 0) {
      logger.error("Ika sign CLI failed", {
        exitCode: cliResult.exitCode,
        stderr: cliResult.stderr.slice(0, 1000),
      });
      throw new Error(`Ika sign CLI exited with code ${cliResult.exitCode}: ${cliResult.stderr.slice(0, 500)}`);
    }

    logger.info("Ika sign CLI completed");

    // 12. Poll MessageApproval for signature
    logger.info("Polling MessageApproval for on-chain signature...");
    const pollResult = await pollMessageApprovalSigned(
      connection,
      messageApprovalPda
    );
    signatureLen = pollResult.signatureLen;
    const signature = pollResult.signature;
    logger.info("MessageApproval signed", { signatureLen });

    signatureHex = Buffer.from(signature).toString("hex");
    signatureBase64 = Buffer.from(signature).toString("base64");

    // 13. Update DB
    await prisma.messageApproval.updateMany({
      where: { signingRequestId },
      data: {
        status: "signed",
        signatureLength: signatureLen,
        signatureHex,
        signatureBase64,
      },
    });

    await prisma.signingRequest.update({
      where: { id: signingRequestId },
      data: {
        status: "signed",
        onChainRequestPda: guardSigningRequestPda.toBase58(),
        onChainMessageApprovalPda: messageApprovalPda.toBase58(),
        approveTxSignature: approveTxSignature || null,
        signatureHex,
        signatureBase64,
        signedAt: new Date(),
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "worker",
      eventType: "ika_signature_committed",
      resourceType: "signing_request",
      resourceId: signingRequestId,
      summary: `Ika signature committed for ${signingRequestId}`,
      metadata: { signatureLen, messageApprovalPda: messageApprovalPda.toBase58() },
    });

    await scheduleWebhookEvent({
      organizationId,
      eventType: "signature.signed",
      signingRequestId,
      data: {
        signingRequestId,
        status: "signed",
        signatureHex,
        signatureBase64,
        signatureLen,
      },
    });
  } finally {
    // Cleanup artifact — always run, even on failure
    try {
      if (fs.existsSync(requestArtifactPath)) {
        fs.unlinkSync(requestArtifactPath);
        logger.info("Cleaned up request artifact", { path: requestArtifactPath });
      }
    } catch {
      // ignore cleanup errors
    }
  }

  return {
    success: true,
    status: "signed",
    approveTxSignature: approveTxSignature || undefined,
    guardSigningRequestPda: guardSigningRequestPda.toBase58(),
    ikaMessageApprovalPda: messageApprovalPda.toBase58(),
    signatureHex: signatureHex!,
    signatureBase64: signatureBase64!,
    signatureLen: signatureLen!,
  };
}

// ── DB helpers ──

async function upsertMessageApproval(
  signingRequestId: string,
  organizationId: string,
  messageApprovalPda: string,
  parsedMa: import("../solana/types.js").IkaMessageApproval
) {
  const existing = await prisma.messageApproval.findFirst({
    where: { signingRequestId },
  });

  const data = {
    organizationId,
    signingRequestId,
    onChainPda: messageApprovalPda,
    dwalletPda: parsedMa.dwallet.toBase58(),
    messageDigest: Buffer.from(parsedMa.messageDigest).toString("hex"),
    metadataDigest: Buffer.from(parsedMa.messageMetadataDigest).toString("hex"),
    approver: parsedMa.approver.toBase58(),
    userPubkey: parsedMa.userPubkey.toBase58(),
    signatureScheme: parsedMa.signatureScheme.toString(),
    epoch: parsedMa.epoch.toString(),
    status: parsedMa.status === MessageApprovalStatus.Signed ? "signed" as const : "pending" as const,
    signatureLength: parsedMa.signatureLen > 0 ? parsedMa.signatureLen : null,
    signatureHex: parsedMa.signatureLen > 0 ? Buffer.from(parsedMa.signature).toString("hex") : null,
    signatureBase64: parsedMa.signatureLen > 0 ? Buffer.from(parsedMa.signature).toString("base64") : null,
  };

  if (existing) {
    await prisma.messageApproval.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.messageApproval.create({ data });
  }
}


