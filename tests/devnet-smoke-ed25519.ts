import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Ed25519Program,
  Transaction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Connection,
} from '@solana/web3.js';
import BN from 'bn.js';
import { expect } from 'chai';

describe('Devnet Smoke — Real Ed25519 Attestation', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const admin = provider.wallet as anchor.Wallet;
  const conn = provider.connection;
  const humanRegistry = anchor.workspace.HumanRegistry as Program;

  const humanWallet = Keypair.generate();
  const issuerKeypair = Keypair.generate();
  const NONCE = new BN(1);

  let registryPda: PublicKey;
  let profilePda: PublicKey;
  let issuerPda: PublicKey;
  let attestationPda: PublicKey;

  // Track signatures for verification
  let positiveTxSig: string | null = null;
  let negativeTxSig: string | null = null;

  /** Mirrors on-chain create_signing_bytes exactly. */
  function createSigningBytes(
    profile: PublicKey, issuer: PublicKey, payloadHash: Buffer,
    weight: number, issuedAt: number, expiresAt: number, nonce: number,
  ): Buffer {
    const buf = Buffer.alloc(24 + 32 + 32 + 32 + 2 + 8 + 8 + 8);
    let off = 0;
    Buffer.from('humanrail:attestation:v1').copy(buf, off); off += 24;
    profile.toBuffer().copy(buf, off); off += 32;
    issuer.toBuffer().copy(buf, off); off += 32;
    payloadHash.copy(buf, off); off += 32;
    buf.writeUInt16LE(weight, off); off += 2;
    buf.writeBigInt64LE(BigInt(issuedAt), off); off += 8;
    buf.writeBigInt64LE(BigInt(expiresAt), off); off += 8;
    buf.writeBigUInt64LE(BigInt(nonce), off);
    return buf;
  }

  async function getClockTimestamp(): Promise<number> {
    const acct = await conn.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
    if (!acct) throw new Error('Clock sysvar not found');
    return Number(acct.data.readBigInt64LE(32));
  }

  /** Send tx, wait for finality, return { sig, err, logs } */
  async function sendAndVerify(
    tx: Transaction, signers: Keypair[], label: string,
  ): Promise<{ sig: string; err: any; logs: string[] }> {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = admin.publicKey;

    // Sign with admin keypair directly (avoid wallet abstraction)
    tx.sign((admin as any).payer, ...signers);
    const rawTx = tx.serialize();

    // Verify compiled tx has correct instruction count
    const decoded = Transaction.from(rawTx);
    console.log(`  [${label}] Compiled instructions: ${decoded.instructions.length}`);
    for (let i = 0; i < decoded.instructions.length; i++) {
      console.log(`    Ix[${i}]: ${decoded.instructions[i].programId.toBase58().slice(0, 20)}... data=${decoded.instructions[i].data.length}b`);
    }

    const sig = await conn.sendRawTransaction(rawTx, { skipPreflight: true });
    console.log(`  [${label}] Sig: ${sig}`);

    // Wait for confirmation
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

    // Fetch tx to get meta.err and logs
    let txInfo = null;
    for (let i = 0; i < 10; i++) {
      txInfo = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
      if (txInfo) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    const err = txInfo?.meta?.err ?? null;
    const logs = txInfo?.meta?.logMessages ?? [];
    console.log(`  [${label}] meta.err: ${JSON.stringify(err)}`);
    if (logs.length > 0) {
      console.log(`  [${label}] Last logs:`);
      for (const l of logs.slice(-5)) console.log(`    ${l}`);
    }
    return { sig, err, logs };
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  before(async () => {
    [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('issuer_registry')], humanRegistry.programId);
    [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('human_profile'), humanWallet.publicKey.toBuffer()], humanRegistry.programId);
    [issuerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('issuer'), issuerKeypair.publicKey.toBuffer()], humanRegistry.programId);
    [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('attestation'), profilePda.toBuffer(), issuerPda.toBuffer(),
       NONCE.toArrayLike(Buffer, 'le', 8)], humanRegistry.programId);

    console.log('\n=== Devnet Ed25519 Smoke Test ===');
    console.log('Admin:   ', admin.publicKey.toBase58());
    console.log('Human:   ', humanWallet.publicKey.toBase58());
    console.log('Issuer:  ', issuerKeypair.publicKey.toBase58());
    console.log('Program: ', humanRegistry.programId.toBase58());

    // Fund from admin
    for (const kp of [humanWallet, issuerKeypair]) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: admin.publicKey,
          toPubkey: kp.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = admin.publicKey;
      tx.sign((admin as any).payer);
      const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    }
    console.log('Wallets funded\n');
  });

  it('1. Setup: init registry + profile + issuer', async () => {
    try {
      await humanRegistry.methods.initRegistry()
        .accounts({ admin: admin.publicKey, registry: registryPda, systemProgram: SystemProgram.programId })
        .rpc({ commitment: 'confirmed' });
      console.log('  ✅ Registry initialized');
    } catch (e: any) {
      if (e.message?.includes('already in use')) console.log('  ⏭️  Registry exists');
      else throw e;
    }

    await humanRegistry.methods.initProfile()
      .accounts({ authority: humanWallet.publicKey, profile: profilePda, systemProgram: SystemProgram.programId })
      .signers([humanWallet])
      .rpc({ commitment: 'confirmed' });

    const profile = await humanRegistry.account.humanProfile.fetch(profilePda, 'confirmed');
    expect(profile.humanScore).to.equal(0);
    console.log('  ✅ Profile: score=0, canRegisterAgents=false');

    const nameBuffer = Buffer.alloc(32);
    Buffer.from('SmokeTest-KYC').copy(nameBuffer);
    await humanRegistry.methods.registerIssuer({
      authority: issuerKeypair.publicKey, name: Array.from(nameBuffer),
      issuerType: { kycProvider: {} }, maxWeight: 60,
      contributesToUniqueness: false, defaultValidity: new BN(86400 * 90), metadataUri: null,
    })
    .accounts({ admin: admin.publicKey, registry: registryPda, issuer: issuerPda, systemProgram: SystemProgram.programId })
    .rpc({ commitment: 'confirmed' });
    console.log('  ✅ Issuer registered');
  });

  it('2. POSITIVE: Issue attestation with real Ed25519 signature', async () => {
    const payloadHash = Buffer.alloc(32);
    Buffer.from('kyc-smoke-devnet-2025').copy(payloadHash);
    const weight = 55;
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 90;

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const clockTs = await getClockTimestamp();
      console.log(`  Attempt ${attempt + 1}: clock=${clockTs}`);

      const message = createSigningBytes(
        profilePda, issuerPda, payloadHash, weight, clockTs, expiresAt, NONCE.toNumber());

      const ed25519Ix = Ed25519Program.createInstructionWithPrivateKey({
        privateKey: issuerKeypair.secretKey,
        message: Uint8Array.from(message),
      });

      const attestIx = await humanRegistry.methods.issueAttestation({
        payloadHash: Array.from(payloadHash), weight,
        signature: Array.from(Buffer.alloc(64)),
        nonce: NONCE, expiresAt: new BN(expiresAt), externalId: null,
      })
      .accounts({
        issuerAuthority: issuerKeypair.publicKey, issuer: issuerPda,
        profile: profilePda, attestation: attestationPda,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY, systemProgram: SystemProgram.programId,
      })
      .instruction();

      const tx = new Transaction().add(ed25519Ix).add(attestIx);
      const result = await sendAndVerify(tx, [issuerKeypair], 'POSITIVE');

      if (result.err === null) {
        positiveTxSig = result.sig;
        console.log('  ✅ POSITIVE tx succeeded!');
        break;
      }

      // Check if it's clock drift
      const isClockDrift = result.logs.some(l => l.includes('MessageMismatch'));
      if (isClockDrift && attempt < MAX_ATTEMPTS - 1) {
        console.log('  ⚠️  Clock drift, retrying...');
        await sleep(1000);
        continue;
      }

      // Real failure — print details and fail
      throw new Error(`POSITIVE tx failed: ${JSON.stringify(result.err)}\n${result.logs.join('\n')}`);
    }

    expect(positiveTxSig).to.not.be.null;

    // Backoff fetch for state
    let profile: any = null;
    for (let i = 0; i < 10; i++) {
      await sleep(1500);
      profile = await humanRegistry.account.humanProfile.fetch(profilePda, 'confirmed');
      if (profile.humanScore > 0) break;
    }
    expect(profile.humanScore).to.equal(55);
    expect(profile.canRegisterAgents).to.be.true;
    expect(profile.activeAttestationCount).to.equal(1);
    console.log('  ✅ Profile: score=55, canRegisterAgents=true, attestations=1');
  });

  it('3. NEGATIVE: wrong payload → must fail with MessageMismatch', async () => {
    const NONCE2 = new BN(2);
    const [attPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from('attestation'), profilePda.toBuffer(), issuerPda.toBuffer(),
       NONCE2.toArrayLike(Buffer, 'le', 8)], humanRegistry.programId);

    const correctPayload = Buffer.alloc(32);
    Buffer.from('correct-payload').copy(correctPayload);
    const wrongPayload = Buffer.alloc(32);
    Buffer.from('WRONG-payload-tampered').copy(wrongPayload);

    const weight = 30;
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30;
    const clockTs = await getClockTimestamp();

    const wrongMessage = createSigningBytes(
      profilePda, issuerPda, wrongPayload, weight, clockTs, expiresAt, NONCE2.toNumber());
    const ed25519Ix = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: issuerKeypair.secretKey, message: Uint8Array.from(wrongMessage),
    });

    const attestIx = await humanRegistry.methods.issueAttestation({
      payloadHash: Array.from(correctPayload), weight,
      signature: Array.from(Buffer.alloc(64)),
      nonce: NONCE2, expiresAt: new BN(expiresAt), externalId: null,
    })
    .accounts({
      issuerAuthority: issuerKeypair.publicKey, issuer: issuerPda,
      profile: profilePda, attestation: attPda2,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY, systemProgram: SystemProgram.programId,
    })
    .instruction();

    const tx = new Transaction().add(ed25519Ix).add(attestIx);
    const result = await sendAndVerify(tx, [issuerKeypair], 'NEGATIVE');

    negativeTxSig = result.sig;
    expect(result.err).to.not.be.null;
    const hasExpectedError = result.logs.some(l =>
      l.includes('MessageMismatch') || l.includes('0x1776') || l.includes('Ed25519')
    );
    expect(hasExpectedError).to.be.true;
    console.log('  ✅ NEGATIVE tx correctly failed');
  });
});
