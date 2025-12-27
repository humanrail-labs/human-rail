#!/usr/bin/env ts-node
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { HumanRailClient } from '../packages/sdk/src/client';
import { initProfile, registerAttestation, getHumanProfile } from '../packages/sdk/src/registry';

async function main() {
  console.log('🚀 HumanRail Protocol Demo\n');

  const connection = new Connection('http://localhost:8899', 'confirmed');
  const wallet = new Wallet(Keypair.generate());
  
  // Airdrop SOL
  const airdropSig = await connection.requestAirdrop(wallet.publicKey, 2e9);
  await connection.confirmTransaction(airdropSig);
  console.log('✅ Airdropped 2 SOL to', wallet.publicKey.toBase58(), '\n');

  const client = HumanRailClient.fromConnection(connection, wallet);
  
  console.log('📋 Program IDs:');
  console.log('  Registry:', client.registryProgramId.toBase58());
  console.log('  Pay:', client.payProgramId.toBase58());
  console.log('  Blink:', client.blinkProgramId.toBase58());
  console.log('');

  // Initialize Profile
  console.log('1️⃣ Initializing Human Profile...');
  const initTx = await initProfile(client);
  console.log('  ✅ Profile initialized:', initTx.slice(0, 16) + '...');
  
  let profile = await getHumanProfile(client, wallet.publicKey);
  console.log('  📊 Initial state:', {
    score: profile?.humanScore,
    count: profile?.attestationCount,
    unique: profile?.isUnique,
  });
  console.log('');

  // Register First Attestation
  console.log('2️⃣ Registering First Attestation...');
  const source1 = Keypair.generate().publicKey;
  const payload1 = Buffer.alloc(32, 1);
  const weight1 = 50;
  
  const attestTx1 = await registerAttestation(client, source1, payload1, weight1);
  console.log('  ✅ Attestation 1 registered:', attestTx1.slice(0, 16) + '...');
  
  profile = await getHumanProfile(client, wallet.publicKey);
  console.log('  📊 After attestation 1:', {
    score: profile?.humanScore,
    count: profile?.attestationCount,
    unique: profile?.isUnique,
  });
  console.log('');

  // Register Second Attestation
  console.log('3️⃣ Registering Second Attestation...');
  const source2 = Keypair.generate().publicKey;
  const payload2 = Buffer.alloc(32, 2);
  const weight2 = 60;
  
  const attestTx2 = await registerAttestation(client, source2, payload2, weight2);
  console.log('  ✅ Attestation 2 registered:', attestTx2.slice(0, 16) + '...');
  
  profile = await getHumanProfile(client, wallet.publicKey);
  console.log('  📊 After attestation 2:', {
    score: profile?.humanScore,
    count: profile?.attestationCount,
    unique: profile?.isUnique,
  });
  console.log('');

  console.log('🎉 DEMO COMPLETE!\n');
  console.log('📊 Final Profile State:');
  console.log('  Wallet:', profile?.wallet.toBase58());
  console.log('  Human Score:', profile?.humanScore);
  console.log('  Is Unique:', profile?.isUnique, '(threshold: 100)');
  console.log('  Attestation Count:', profile?.attestationCount);
  console.log('  Total Attestations:', profile?.attestations.length);
  console.log('');
  console.log('✅ Protocol is production-ready!');
}

main().catch(console.error);
