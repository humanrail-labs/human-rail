import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';

describe('HumanRail Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;

  describe('human_registry', () => {
    const humanRegistry = anchor.workspace.HumanRegistry as Program;

    it('should initialize a human profile and verify state', async () => {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      console.log('Profile PDA:', profilePda.toBase58());
      console.log('Program ID:', humanRegistry.programId.toBase58());

      await humanRegistry.methods
        .initProfile()
        .accounts({
          profile: profilePda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);

      // Verify initial state
      expect(profile.wallet.equals(wallet.publicKey)).to.be.true;
      expect(profile.humanScore).to.equal(0);
      expect(profile.isUnique).to.be.false;
      expect(profile.attestationCount).to.equal(0);
      expect(profile.lastAttestationAt.toNumber()).to.equal(0);
      expect(profile.attestations.length).to.equal(0);

      console.log('✅ Profile initialized:', {
        wallet: profile.wallet.toBase58(),
        score: profile.humanScore,
        count: profile.attestationCount,
      });
    });

    it('should register attestation and mutate state', async () => {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      // Fetch BEFORE state
      const profileBefore = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log('\n📊 BEFORE attestation:', {
        score: profileBefore.humanScore,
        count: profileBefore.attestationCount,
        unique: profileBefore.isUnique,
      });

      // Register attestation
      const sourceId = Keypair.generate().publicKey;
      const payloadHash = Array.from(Buffer.alloc(32, 1));
      const weight = 50;

      const tx = await humanRegistry.methods
        .registerAttestation(sourceId, payloadHash, weight)
        .accounts({
          profile: profilePda,
          authority: wallet.publicKey,
        })
        .rpc();

      console.log('Transaction:', tx);

      // Fetch AFTER state
      const profileAfter = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log('\n📊 AFTER attestation:', {
        score: profileAfter.humanScore,
        count: profileAfter.attestationCount,
        unique: profileAfter.isUnique,
        lastHash: Buffer.from(profileAfter.lastAttestationHash).toString('hex').slice(0, 16) + '...',
      });

      // Verify state mutation
      expect(profileAfter.attestationCount).to.equal(1);
      expect(profileAfter.humanScore).to.equal(weight);
      expect(profileAfter.isUnique).to.be.false; // 50 < 100 threshold
      expect(profileAfter.lastAttestationAt.toNumber()).to.be.greaterThan(0);
      expect(profileAfter.attestations.length).to.equal(1);

      // Verify attestation details
      const att = profileAfter.attestations[0];
      expect(att.source.equals(sourceId)).to.be.true;
      expect(att.weight).to.equal(weight);

      console.log('✅ State mutation verified!');
    });

    it('should increment count and score with multiple attestations', async () => {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      // Add second attestation
      const source2 = Keypair.generate().publicKey;
      const payload2 = Array.from(Buffer.alloc(32, 2));
      const weight2 = 60;

      await humanRegistry.methods
        .registerAttestation(source2, payload2, weight2)
        .accounts({
          profile: profilePda,
          authority: wallet.publicKey,
        })
        .rpc();

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);

      console.log('\n📊 After 2nd attestation:', {
        score: profile.humanScore,
        count: profile.attestationCount,
        unique: profile.isUnique,
      });

      // Verify increments
      expect(profile.attestationCount).to.equal(2);
      expect(profile.humanScore).to.equal(110); // 50 + 60
      expect(profile.isUnique).to.be.true; // 110 >= 100 threshold
      expect(profile.attestations.length).to.equal(2);

      console.log('✅ Multiple attestations work!');
    });

    it('should respect MAX_ATTESTATIONS limit', async () => {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      // Add attestations up to limit (already have 2, max is 8)
      for (let i = 0; i < 6; i++) {
        await humanRegistry.methods
          .registerAttestation(
            Keypair.generate().publicKey,
            Array.from(Buffer.alloc(32, i + 3)),
            10
          )
          .accounts({
            profile: profilePda,
            authority: wallet.publicKey,
          })
          .rpc();
      }

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      expect(profile.attestationCount).to.equal(8);
      expect(profile.attestations.length).to.equal(8);

      // Try to add one more - should fail
      try {
        await humanRegistry.methods
          .registerAttestation(
            Keypair.generate().publicKey,
            Array.from(Buffer.alloc(32, 99)),
            10
          )
          .accounts({
            profile: profilePda,
            authority: wallet.publicKey,
          })
          .rpc();

        expect.fail('Should have thrown TooManyAttestations error');
      } catch (err: any) {
        expect(err.error.errorMessage).to.include('Maximum number of attestations reached');
        console.log('✅ MAX_ATTESTATIONS limit enforced');
      }
    });
  });

  describe('PDA derivation tests', () => {
    const HUMAN_PAY_PROGRAM_ID = new PublicKey('6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe');
    const DATA_BLINK_PROGRAM_ID = new PublicKey('3j1Gfbi9WL2KUMKQavxdpjA2rJNBP8M8AmYgv1rKZKyj');

    it('should derive task PDA correctly', () => {
      const nonce = new anchor.BN(Date.now());
      const [taskPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('task'), wallet.publicKey.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
        DATA_BLINK_PROGRAM_ID
      );
      expect(taskPda).to.be.instanceOf(PublicKey);
    });

    it('should derive invoice PDA correctly', () => {
      const mint = Keypair.generate().publicKey;
      const nonce = new anchor.BN(Date.now());
      const [invoicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('invoice'), wallet.publicKey.toBuffer(), mint.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
        HUMAN_PAY_PROGRAM_ID
      );
      expect(taskPda).to.be.instanceOf(PublicKey);
    });
  });
});
