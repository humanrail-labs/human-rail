/**
 * Hello HumanRail — North-Star Integration Example
 *
 * This script walks through the complete HumanRail lifecycle on devnet:
 *
 *   1. Create a Human Profile
 *   2. Register a KYC Issuer (admin)
 *   3. Issue a signed attestation (Ed25519 + on-chain)
 *   4. Register an AI Agent under the human
 *   5. Issue a capability (delegation) to the agent
 *   6. Validate the capability
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json npx tsx hello.ts
 *
 * The ANCHOR_WALLET keypair acts as admin + human + issuer for simplicity.
 * In production these are separate entities.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Ed25519Program,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import * as crypto from 'crypto';
import * as fs from 'fs';

// ──────────────────────────────────────────
// Program IDs (devnet deployed)
// ──────────────────────────────────────────
const HUMAN_REGISTRY = new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo');
const AGENT_REGISTRY = new PublicKey('GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ');
const DELEGATION     = new PublicKey('DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT');
const SYSVAR_IX      = new PublicKey('Sysvar1nstructions1111111111111111111111111');

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function disc(name: string): Uint8Array {
  return new Uint8Array(crypto.createHash('sha256').update(`global:${name}`).digest().buffer, 0, 8);
}

function u64Le(n: number | bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, BigInt(n), true);
  return new Uint8Array(buf);
}

function i64Le(n: number | bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigInt64(0, BigInt(n), true);
  return new Uint8Array(buf);
}

function u16Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(2);
  new DataView(buf).setUint16(0, n, true);
  return new Uint8Array(buf);
}

function u32Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, n, true);
  return new Uint8Array(buf);
}

function concat(...arrs: Uint8Array[]): Buffer {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return Buffer.from(out);
}

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function padBytes(str: string, len: number): Uint8Array {
  const out = new Uint8Array(len);
  new TextEncoder().encode(str).forEach((b, i) => { out[i] = b; });
  return out;
}

function loadWallet(): Keypair {
  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    console.error('Set ANCHOR_WALLET env var to your keypair path');
    process.exit(1);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));
}

async function sendTx(
  connection: Connection, ixs: any[], signers: Keypair[], label: string
): Promise<string> {
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' });
  console.log(`  ✅ ${label}: ${sig}`);
  return sig;
}

async function accountExists(connection: Connection, pubkey: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(pubkey);
  return info !== null;
}

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────
async function main() {
  const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(RPC, 'confirmed');
  const wallet = loadWallet();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Hello HumanRail — Devnet Demo      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Low balance. Requesting airdrop...');
    const sig = await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('  Airdrop confirmed.\n');
  }

  // ── PDAs ──
  const [registryPda] = pda([Buffer.from('issuer_registry')], HUMAN_REGISTRY);
  const [profilePda]  = pda([Buffer.from('human_profile'), wallet.publicKey.toBuffer()], HUMAN_REGISTRY);
  const [issuerPda]   = pda([Buffer.from('issuer'), wallet.publicKey.toBuffer()], HUMAN_REGISTRY);

  // ──────────────────────────────────────────
  // Step 1: Create Human Profile
  // ──────────────────────────────────────────
  console.log('─── Step 1: Create Human Profile ───');
  if (await accountExists(connection, profilePda)) {
    console.log('  Profile already exists, skipping.');
  } else {
    const ix = {
      programId: HUMAN_REGISTRY,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(disc('init_profile')),
    };
    await sendTx(connection, [ix], [wallet], 'init_profile');
  }
  console.log(`  Profile PDA: ${profilePda.toBase58()}\n`);

  // ──────────────────────────────────────────
  // Step 2: Register Issuer
  // ──────────────────────────────────────────
  console.log('─── Step 2: Register KYC Issuer ───');
  if (await accountExists(connection, issuerPda)) {
    console.log('  Issuer already registered, skipping.');
  } else {
    // RegisterIssuerParams:
    //   name: [u8;32], issuer_type: enum(0), max_weight: u16,
    //   contributes_to_uniqueness: bool, default_validity: i64,
    //   metadata_uri: [u8;64], has_metadata_uri: bool
    const params = concat(
      disc('register_issuer'),
      padBytes('HelloHR-KYC', 32),        // name
      new Uint8Array([0]),                 // IssuerType::KycProvider
      u16Le(100),                          // max_weight
      new Uint8Array([0]),                 // contributes_to_uniqueness: false
      i64Le(90 * 86400),                   // default_validity: 90 days
      new Uint8Array(64),                  // metadata_uri (empty)
      new Uint8Array([0]),                 // has_metadata_uri: false
    );
    const ix = {
      programId: HUMAN_REGISTRY,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: registryPda, isSigner: false, isWritable: true },
        { pubkey: issuerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: params,
    };
    await sendTx(connection, [ix], [wallet], 'register_issuer');
  }
  console.log(`  Issuer PDA: ${issuerPda.toBase58()}\n`);

  // ──────────────────────────────────────────
  // Step 3: Issue Attestation (Ed25519 signed)
  // ──────────────────────────────────────────
  console.log('─── Step 3: Issue Signed Attestation ───');
  const nonce = 1;
  const [attestPda] = pda(
    [Buffer.from('attestation'), profilePda.toBuffer(), issuerPda.toBuffer(), Buffer.from(u64Le(nonce))],
    HUMAN_REGISTRY
  );

  if (await accountExists(connection, attestPda)) {
    console.log('  Attestation already exists, skipping.');
  } else {
    const weight = 60;
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 90 * 86400;
    const payloadHash = new Uint8Array(crypto.createHash('sha256').update('hello-humanrail-demo').digest());

    // Build 146-byte signing message
    const DOMAIN = new TextEncoder().encode('humanrail:attestation:v1'); // 24 bytes
    const message = new Uint8Array(146);
    const mv = new DataView(message.buffer);
    let off = 0;
    message.set(DOMAIN, off); off += 24;
    message.set(profilePda.toBytes(), off); off += 32;
    message.set(issuerPda.toBytes(), off); off += 32;
    message.set(payloadHash, off); off += 32;
    mv.setUint16(off, weight, true); off += 2;
    mv.setBigInt64(off, BigInt(issuedAt), true); off += 8;
    mv.setBigInt64(off, BigInt(expiresAt), true); off += 8;
    mv.setBigUint64(off, BigInt(nonce), true); off += 8;

    const signature = nacl.sign.detached(message, wallet.secretKey);

    // Ed25519 precompile instruction
    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: wallet.publicKey.toBytes(),
      message,
      signature,
    });

    // IssueAttestationParams: payload_hash[32] + weight(u16) + issued_at(i64) + expires_at(i64) + nonce(u64) + signature[64]
    const ixData = concat(
      disc('issue_attestation'),
      payloadHash,
      u16Le(weight),
      i64Le(issuedAt),
      i64Le(expiresAt),
      u64Le(nonce),
      signature,
    );

    const issueIx = {
      programId: HUMAN_REGISTRY,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: issuerPda, isSigner: false, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: attestPda, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_IX, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: ixData,
    };

    await sendTx(connection, [ed25519Ix, issueIx], [wallet], 'issue_attestation');
  }
  console.log(`  Attestation PDA: ${attestPda.toBase58()}\n`);

  // ──────────────────────────────────────────
  // Step 4: Register an AI Agent
  // ──────────────────────────────────────────
  console.log('─── Step 4: Register AI Agent ───');
  const agentNonce = Date.now(); // unique nonce
  const agentSigningKey = Keypair.generate();
  const [agentPda] = pda(
    [Buffer.from('agent'), wallet.publicKey.toBuffer(), Buffer.from(u64Le(agentNonce))],
    AGENT_REGISTRY
  );
  const [operatorStats] = pda(
    [Buffer.from('operator_stats'), agentPda.toBuffer()],
    AGENT_REGISTRY
  );

  // RegisterAgentParams: name[32] + signing_key(32) + metadata_hash[32] + nonce(u64)
  const agentParams = concat(
    disc('register_agent'),
    padBytes('HelloAgent', 32),
    agentSigningKey.publicKey.toBytes(),
    new Uint8Array(32), // metadata_hash (empty)
    u64Le(agentNonce),
  );

  const registerAgentIx = {
    programId: AGENT_REGISTRY,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: profilePda, isSigner: false, isWritable: false },
      { pubkey: HUMAN_REGISTRY, isSigner: false, isWritable: false },
      { pubkey: agentPda, isSigner: false, isWritable: true },
      { pubkey: operatorStats, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: agentParams,
  };
  await sendTx(connection, [registerAgentIx], [wallet], 'register_agent');
  console.log(`  Agent PDA: ${agentPda.toBase58()}`);
  console.log(`  Signing Key: ${agentSigningKey.publicKey.toBase58()}\n`);

  // ──────────────────────────────────────────
  // Step 5: Issue Capability (Delegation)
  // ──────────────────────────────────────────
  console.log('─── Step 5: Issue Capability ───');
  const capNonce = 1;
  const [capPda] = pda(
    [Buffer.from('capability'), wallet.publicKey.toBuffer(), agentPda.toBuffer(), Buffer.from(u64Le(capNonce))],
    DELEGATION
  );

  const now = Math.floor(Date.now() / 1000);
  // IssueCapabilityParams layout (from IDL):
  //   allowed_programs: u64, allowed_assets: u64,
  //   per_tx_limit: u64, daily_limit: u64, total_limit: u64,
  //   max_slippage_bps: u16, max_fee: u64,
  //   valid_from: i64, expires_at: i64,
  //   cooldown_seconds: u32, risk_tier: u8, nonce: u64,
  //   enforce_allowlist: bool, destination_allowlist: Vec<Pubkey>
  const capParams = concat(
    disc('issue_capability'),
    u64Le(0xFFFFFFFF),          // allowed_programs: all
    u64Le(0xFFFFFFFF),          // allowed_assets: all
    u64Le(1_000_000_000),       // per_tx_limit: 1 SOL
    u64Le(10_000_000_000),      // daily_limit: 10 SOL
    u64Le(100_000_000_000),     // total_limit: 100 SOL
    u16Le(500),                 // max_slippage_bps: 5%
    u64Le(100_000_000),         // max_fee: 0.1 SOL
    i64Le(now),                 // valid_from: now
    i64Le(now + 30 * 86400),    // expires_at: 30 days
    u32Le(60),                  // cooldown_seconds: 60s
    new Uint8Array([1]),        // risk_tier: 1
    u64Le(capNonce),            // nonce
    new Uint8Array([0]),        // enforce_allowlist: false
    u32Le(0),                   // destination_allowlist: empty vec (len=0)
  );

  const capIx = {
    programId: DELEGATION,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: agentPda, isSigner: false, isWritable: false },
      { pubkey: capPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: capParams,
  };
  await sendTx(connection, [capIx], [wallet], 'issue_capability');
  console.log(`  Capability PDA: ${capPda.toBase58()}\n`);

  // ──────────────────────────────────────────
  // Step 6: Validate Capability
  // ──────────────────────────────────────────
  console.log('─── Step 6: Validate Capability ───');
  const [freezePda] = pda(
    [Buffer.from('freeze'), wallet.publicKey.toBuffer(), agentPda.toBuffer()],
    DELEGATION
  );

  // validate_capability(action_type: u8, action_value: u64, destination: Pubkey)
  const valParams = concat(
    disc('validate_capability'),
    new Uint8Array([0]),                           // action_type: 0 (transfer)
    u64Le(500_000_000),                            // action_value: 0.5 SOL
    wallet.publicKey.toBytes(),                    // destination: self (for demo)
  );

  const valIx = {
    programId: DELEGATION,
    keys: [
      { pubkey: capPda, isSigner: false, isWritable: false },
      { pubkey: freezePda, isSigner: false, isWritable: false },
    ],
    data: valParams,
  };

  try {
    // validate_capability is a read-only CPI check.
    // It may fail if freeze account doesn't exist (expected on fresh setup).
    // We attempt it to show the flow; in production it's called via CPI.
    await sendTx(connection, [valIx], [wallet], 'validate_capability');
  } catch (err: any) {
    console.log(`  ⚠️  validate_capability returned error (expected if freeze PDA not initialized):`);
    console.log(`     ${err.message?.split('\n')[0]}`);
  }

  // ──────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           🎉  All Steps Complete!         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`
  Human Profile:    ${profilePda.toBase58()}
  Issuer:           ${issuerPda.toBase58()}
  Attestation:      ${attestPda.toBase58()}
  Agent:            ${agentPda.toBase58()}
  Capability:       ${capPda.toBase58()}
  `);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
