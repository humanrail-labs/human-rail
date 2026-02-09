/**
 * One-time admin script: register the Veriff KYC issuer on-chain.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/register-veriff-issuer.ts <ISSUER_KEYPAIR_PATH>
 *
 * Example:
 *   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/register-veriff-issuer.ts .keys/veriff-issuer.json
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import * as crypto from 'crypto';
import * as fs from 'fs';

const HUMAN_REGISTRY = new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo');
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

function loadKeypair(path: string): Keypair {
  const raw = fs.readFileSync(path, 'utf-8');
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function anchorDisc(name: string): Uint8Array {
  return new Uint8Array(
    crypto.createHash('sha256').update(`global:${name}`).digest().buffer,
    0, 8
  );
}

async function main() {
  const issuerPath = process.argv[2];
  if (!issuerPath) {
    console.error('Usage: npx tsx scripts/register-veriff-issuer.ts <ISSUER_KEYPAIR_PATH>');
    process.exit(1);
  }

  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    console.error('Set ANCHOR_WALLET to admin keypair path');
    process.exit(1);
  }

  const admin = loadKeypair(walletPath);
  const issuerKp = loadKeypair(issuerPath);
  const connection = new Connection(RPC, 'confirmed');

  console.log('Admin:          ', admin.publicKey.toBase58());
  console.log('Issuer authority:', issuerKp.publicKey.toBase58());
  console.log('RPC:            ', RPC);

  // Derive PDAs
  const [registry] = PublicKey.findProgramAddressSync(
    [Buffer.from('issuer_registry')], HUMAN_REGISTRY
  );
  const [issuerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('issuer'), issuerKp.publicKey.toBuffer()], HUMAN_REGISTRY
  );

  console.log('Registry PDA:   ', registry.toBase58());
  console.log('Issuer PDA:     ', issuerPda.toBase58());

  // Check if registry exists
  const registryInfo = await connection.getAccountInfo(registry);
  if (!registryInfo) {
    console.log('\n>>> Initializing IssuerRegistry...');
    const disc = anchorDisc('init_registry');
    const data = Buffer.from(disc);
    const ix = {
      programId: HUMAN_REGISTRY,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: registry, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    };
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [admin], { commitment: 'confirmed' });
    console.log('init_registry tx:', sig);
  } else {
    console.log('\nIssuerRegistry already exists, skipping init.');
  }

  // Check if issuer already registered
  const issuerInfo = await connection.getAccountInfo(issuerPda);
  if (issuerInfo) {
    console.log('Issuer already registered at', issuerPda.toBase58());
    return;
  }

  // Build RegisterIssuerParams
  // name: [u8;32] "Veriff KYC"
  const nameBuf = new Uint8Array(32);
  new TextEncoder().encode('Veriff KYC').forEach((b, i) => { nameBuf[i] = b; });

  // metadata_uri: [u8;64] empty
  const metaUri = new Uint8Array(64);

  // Anchor borsh: RegisterIssuerParams
  // { name: [u8;32], issuer_type: enum(0=KycProvider), max_weight: u16,
  //   contributes_to_uniqueness: bool, default_validity: i64, metadata_uri: [u8;64], has_metadata_uri: bool }
  const disc = anchorDisc('register_issuer');
  const paramsBuf = new ArrayBuffer(8 + 32 + 1 + 2 + 1 + 8 + 64 + 1);
  const paramsView = new DataView(paramsBuf);
  const paramsArr = new Uint8Array(paramsBuf);

  let off = 0;
  paramsArr.set(disc, off); off += 8;
  paramsArr.set(nameBuf, off); off += 32;
  paramsArr[off] = 0; off += 1;  // IssuerType::KycProvider
  paramsView.setUint16(off, 100, true); off += 2; // max_weight
  paramsArr[off] = 0; off += 1;  // contributes_to_uniqueness: false
  paramsView.setBigInt64(off, BigInt(90 * 86400), true); off += 8; // default_validity: 90 days
  paramsArr.set(metaUri, off); off += 64;
  paramsArr[off] = 0; off += 1;  // has_metadata_uri: false

  console.log('\n>>> Registering issuer...');
  const ix = {
    programId: HUMAN_REGISTRY,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: issuerPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(paramsBuf),
  };

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [admin], { commitment: 'confirmed' });
  console.log('register_issuer tx:', sig);
  console.log('\n✅ Veriff issuer registered successfully!');
  console.log('Issuer PDA:', issuerPda.toBase58());
  console.log('Authority: ', issuerKp.publicKey.toBase58());
}

main().catch(e => { console.error(e); process.exit(1); });
