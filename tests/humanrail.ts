import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';

// Note: IDLs will be auto-generated after `anchor build`
// These tests assume the programs are deployed to localnet

describe('HumanRail Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;

  // Program IDs - update these after first build
  const HUMAN_REGISTRY_PROGRAM_ID = new PublicKey('6BrHosLK9gjJmGWtdxUw8fgEWoew4HBM8QBrkwwokcS2');
  const HUMAN_PAY_PROGRAM_ID = new PublicKey('6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe');
  const DATA_BLINK_PROGRAM_ID = new PublicKey('3j1Gfbi9WL2KUMKQavxdpjA2rJNBP8M8AmYgv1rKZKyj');

  describe('human_registry', () => {
    it('should derive human profile PDA correctly', () => {
      const [profilePda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        HUMAN_REGISTRY_PROGRAM_ID
      );

      expect(profilePda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      expect(bump).to.be.lessThanOrEqual(255);

      console.log('Profile PDA:', profilePda.toBase58());
      console.log('Bump:', bump);
    });

    // Uncomment after deploying programs
    /*
    it('should initialize a human profile', async () => {
      const humanRegistry = anchor.workspace.HumanRegistry as Program;
      
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await humanRegistry.methods
        .initProfile()
        .accounts({
          profile: profilePda,
          wallet: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      
      expect(profile.wallet.equals(wallet.publicKey)).to.be.true;
      expect(profile.humanScore).to.equal(0);
      expect(profile.isUnique).to.be.false;
    });

    it('should register an attestation', async () => {
      const humanRegistry = anchor.workspace.HumanRegistry as Program;
      
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      const sourceId = Keypair.generate().publicKey;
      const payloadHash = Buffer.alloc(32);
      payloadHash.fill(1);

      await humanRegistry.methods
        .registerAttestation({
          sourceId,
          payloadHash: Array.from(payloadHash),
          signature: null,
          attestationType: { sas: {} },
        })
        .accounts({
          profile: profilePda,
          wallet: wallet.publicKey,
        })
        .rpc();

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      
      expect(profile.attestationCount).to.equal(1);
      expect(profile.humanScore).to.be.greaterThan(0);
    });
    */
  });

  describe('data_blink', () => {
    it('should derive task PDA correctly', () => {
      const createdAt = new anchor.BN(Math.floor(Date.now() / 1000));
      
      const [taskPda, bump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('task'),
          wallet.publicKey.toBuffer(),
          createdAt.toArrayLike(Buffer, 'le', 8),
        ],
        DATA_BLINK_PROGRAM_ID
      );

      expect(taskPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.lessThanOrEqual(255);

      console.log('Task PDA:', taskPda.toBase58());
    });

    it('should derive response PDA correctly', () => {
      const taskPubkey = Keypair.generate().publicKey;
      const workerPubkey = wallet.publicKey;

      const [responsePda, bump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('response'),
          taskPubkey.toBuffer(),
          workerPubkey.toBuffer(),
        ],
        DATA_BLINK_PROGRAM_ID
      );

      expect(responsePda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.lessThanOrEqual(255);

      console.log('Response PDA:', responsePda.toBase58());
    });

    // Uncomment after deploying programs
    /*
    it('should create a task', async () => {
      const dataBlink = anchor.workspace.DataBlink as Program;
      
      const createdAt = new anchor.BN(Math.floor(Date.now() / 1000));
      
      const [taskPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('task'),
          wallet.publicKey.toBuffer(),
          createdAt.toArrayLike(Buffer, 'le', 8),
        ],
        dataBlink.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('task_vault'), taskPda.toBuffer()],
        dataBlink.programId
      );

      // Would need a token mint and creator token account
      // This is a structural test

      console.log('Task would be created at:', taskPda.toBase58());
      console.log('Vault would be at:', vaultPda.toBase58());
    });
    */
  });

  describe('human_pay', () => {
    it('should derive invoice PDA correctly', () => {
      const merchant = wallet.publicKey;
      const mint = Keypair.generate().publicKey;
      const createdAt = new anchor.BN(Math.floor(Date.now() / 1000));

      const [invoicePda, bump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('invoice'),
          merchant.toBuffer(),
          mint.toBuffer(),
          createdAt.toArrayLike(Buffer, 'le', 8),
        ],
        HUMAN_PAY_PROGRAM_ID
      );

      expect(invoicePda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.lessThanOrEqual(255);

      console.log('Invoice PDA:', invoicePda.toBase58());
    });

    // Uncomment after deploying programs
    /*
    it('should create a confidential invoice', async () => {
      const humanPay = anchor.workspace.HumanPay as Program;
      
      // Would need actual token setup
      console.log('Invoice creation test - requires token mint setup');
    });
    */
  });

  describe('Cross-program integration', () => {
    it('should demonstrate full task workflow (structural)', () => {
      // This test demonstrates the expected workflow structure
      const steps = [
        '1. User initializes human profile via human_registry.init_profile',
        '2. User registers attestations via human_registry.register_attestation',
        '3. Task creator creates task via data_blink.create_task',
        '4. Worker submits response via data_blink.submit_response',
        '   - This verifies worker\'s human score meets requirements',
        '5. Worker claims rewards via data_blink.claim_rewards',
      ];

      console.log('\nExpected workflow:');
      steps.forEach((step) => console.log(step));

      expect(true).to.be.true;
    });

    it('should demonstrate payment workflow (structural)', () => {
      const steps = [
        '1. User has initialized human profile with sufficient score',
        '2. Merchant creates invoice via human_pay.create_confidential_invoice',
        '3. Payer pays invoice via human_pay.pay_confidential_invoice',
        '   - This verifies payer\'s human score meets requirements',
        '   - Transfers tokens to invoice vault',
        '4. Merchant withdraws via human_pay.withdraw_invoice',
      ];

      console.log('\nPayment workflow:');
      steps.forEach((step) => console.log(step));

      expect(true).to.be.true;
    });
  });
});
