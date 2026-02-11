/**
 * One-time admin script: register the Veriff KYC issuer on-chain.
 *
 * Usage:
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

  // Derive PDAs — seeds use params.authority (the issuer's pubkey)
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
    const ix = {
      programId: HUMAN_REGISTRY,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: registry, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(disc),
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

  // Build RegisterIssuerParams (Anchor borsh serialization)
  // Struct fields in order:
  //   authority: Pubkey (32)
  //   name: [u8; 32]
  //   issuer_type: enum u8 (0=KycProvider)
  //   max_weight: u16
  //   contributes_to_uniqueness: bool
  //   default_validity: Option<i64> (1 tag + 8 value if Some)
  //   metadata_uri: Option<[u8;64]> (1 tag + 64 value if Some)

  const disc = anchorDisc('register_issuer');

  const nameBuf = new Uint8Array(32);
  new TextEncoder().encode('Veriff KYC').forEach((b, i) => { nameBuf[i] = b; });

  // Total: 8(disc) + 32(authority) + 32(name) + 1(type) + 2(weight) + 1(bool) + 1+8(Option<i64> Some) + 1(Option None) = 86
  const buf = Buffer.alloc(86);
  let off = 0;

  // Discriminator
  buf.set(disc, off); off += 8;

  // authority: Pubkey
  buf.set(issuerKp.publicKey.toBytes(), off); off += 32;

  // name: [u8; 32]
  buf.set(nameBuf, off); off += 32;

  // issuer_type: KycProvider = 0
  buf.writeUInt8(0, off); off += 1;

  // max_weight: u16
  buf.writeUInt16LE(100, off); off += 2;

  // contributes_to_uniqueness: false
  buf.writeUInt8(0, off); off += 1;

  // default_validity: Some(90 days in seconds)
  buf.writeUInt8(1, off); off += 1; // Option tag: Some
  buf.writeBigInt64LE(BigInt(90 * 86400), off); off += 8;

  // metadata_uri: None
  buf.writeUInt8(0, off); off += 1;

  console.log(`\n>>> Registering issuer (${off} bytes)...`);

  const ix = {
    programId: HUMAN_REGISTRY,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: issuerPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: buf,
  };

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [admin], { commitment: 'confirmed' });
  console.log('register_issuer tx:', sig);
  console.log('\n✅ Veriff issuer registered successfully!');
  console.log('Issuer PDA:', issuerPda.toBase58());
  console.log('Authority: ', issuerKp.publicKey.toBase58());
}

main().catch(e => { console.error(e); process.exit(1); });
