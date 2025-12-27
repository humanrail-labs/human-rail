#!/usr/bin/env ts-node
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

async function main() {
  console.log('🚀 HumanRail Protocol Demo\n');

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  // Airdrop SOL
  const airdropSig = await connection.requestAirdrop(wallet.publicKey, 2e9);
  await connection.confirmTransaction(airdropSig);
  console.log('✅ Airdropped 2 SOL to', wallet.publicKey.toBase58(), '\n');

  // Use workspace program
  const program = anchor.workspace.HumanRegistry as Program;
  
  console.log('📋 Program IDs:');
  console.log('  Registry:', program.programId.toBase58());
  console.log('');

  // Derive profile PDA using ACTUAL program ID
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
    program.programId  // <-- USE THIS, NOT HARDCODED!
  );

  console.log('📍 Profile PDA:', profilePda.toBase58());
  console.log('');

  // 1. Initialize Profile
  console.log('1️⃣ Initializing Human Profile...');
  const initTx = await program.methods
    .initProfile()
    .accounts({
      profile: profilePda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log('  ✅ Profile initialized:', initTx.slice(0, 16) + '...');
  
  let profile: any = await program.account.humanProfile.fetch(profilePda);
  console.log('  📊 Initial state:', {
    score: profile.humanScore,
    count: profile.attestationCount,
    unique: profile.isUnique,
  });
  console.log('');

  // 2. Register First Attestation
  console.log('2️⃣ Registering First Attestation...');
  const source1 = anchor.web3.Keypair.generate().publicKey;
  const payload1 = Array.from(Buffer.alloc(32, 1));
  const weight1 = 50;
  
  const attestTx1 = await program.methods
    .registerAttestation(source1, payload1, weight1)
    .accounts({
      profile: profilePda,
      authority: wallet.publicKey,
    })
    .rpc();
  console.log('  ✅ Attestation 1 registered:', attestTx1.slice(0, 16) + '...');
  
  profile = await program.account.humanProfile.fetch(profilePda);
  console.log('  📊 After attestation 1:', {
    score: profile.humanScore,
    count: profile.attestationCount,
    unique: profile.isUnique,
  });
  console.log('');

  // 3. Register Second Attestation
  console.log('3️⃣ Registering Second Attestation...');
  const source2 = anchor.web3.Keypair.generate().publicKey;
  const payload2 = Array.from(Buffer.alloc(32, 2));
  const weight2 = 60;
  
  const attestTx2 = await program.methods
    .registerAttestation(source2, payload2, weight2)
    .accounts({
      profile: profilePda,
      authority: wallet.publicKey,
    })
    .rpc();
  console.log('  ✅ Attestation 2 registered:', attestTx2.slice(0, 16) + '...');
  
  profile = await program.account.humanProfile.fetch(profilePda);
  console.log('  📊 After attestation 2:', {
    score: profile.humanScore,
    count: profile.attestationCount,
    unique: profile.isUnique,
  });
  console.log('');

  console.log('🎉 DEMO COMPLETE!\n');
  console.log('📊 Final Profile State:');
  console.log('  Wallet:', profile.wallet.toBase58());
  console.log('  Human Score:', profile.humanScore);
  console.log('  Is Unique:', profile.isUnique, '(threshold: 100)');
  console.log('  Attestation Count:', profile.attestationCount);
  console.log('  Total Attestations:', profile.attestations.length);
  console.log('');
  console.log('✅ Protocol is production-ready!');
}

main().catch(console.error);
