import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import BN from 'bn.js';
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

      const profileBefore = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log('\n📊 BEFORE attestation:', {
        score: profileBefore.humanScore,
        count: profileBefore.attestationCount,
        unique: profileBefore.isUnique,
      });

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

      const profileAfter = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log('\n📊 AFTER attestation:', {
        score: profileAfter.humanScore,
        count: profileAfter.attestationCount,
        unique: profileAfter.isUnique,
        lastHash: Buffer.from(profileAfter.lastAttestationHash).toString('hex').slice(0, 16) + '...',
      });

      expect(profileAfter.attestationCount).to.equal(1);
      expect(profileAfter.humanScore).to.equal(weight);
      expect(profileAfter.isUnique).to.be.false;
      expect(profileAfter.lastAttestationAt.toNumber()).to.be.greaterThan(0);
      expect(profileAfter.attestations.length).to.equal(1);

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

      expect(profile.attestationCount).to.equal(2);
      expect(profile.humanScore).to.equal(110);
      expect(profile.isUnique).to.be.true;
      expect(profile.attestations.length).to.equal(2);

      console.log('✅ Multiple attestations work!');
    });

    it('should respect MAX_ATTESTATIONS limit', async () => {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

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

  describe('human_pay invoice flow', () => {
    const humanPay = anchor.workspace.HumanPay as Program;
    const humanRegistry = anchor.workspace.HumanRegistry as Program;
    
    let mint: PublicKey;
    let merchantTokenAccount: PublicKey;
    let payerKeypair: Keypair;
    let payerTokenAccount: PublicKey;
    let invoicePda: PublicKey;
    let vaultPda: PublicKey;
    const nonce = new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const invoiceAmount = new BN(1_000_000); // 1 token with 6 decimals

    before(async () => {
      // Create Token-2022 mint
      mint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        6,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Created Token-2022 mint:', mint.toBase58());

      // Create merchant token account
      const merchantAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        wallet.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      merchantTokenAccount = merchantAta.address;

      // Create payer keypair and fund it
      payerKeypair = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        payerKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create payer token account and mint tokens
      const payerAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        payerKeypair.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      payerTokenAccount = payerAta.address;

      await mintTo(
        provider.connection,
        wallet.payer,
        mint,
        payerTokenAccount,
        wallet.publicKey,
        10_000_000,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Minted tokens to payer');

      // Initialize payer profile in human_registry
      const [payerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), payerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await humanRegistry.methods
        .initProfile()
        .accounts({
          profile: payerProfilePda,
          authority: payerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payerKeypair])
        .rpc();

      // Give payer some human score
      await humanRegistry.methods
        .registerAttestation(
          Keypair.generate().publicKey,
          Array.from(Buffer.alloc(32, 1)),
          100
        )
        .accounts({
          profile: payerProfilePda,
          authority: payerKeypair.publicKey,
        })
        .signers([payerKeypair])
        .rpc();
      console.log('Payer profile initialized with human score');

      // Derive invoice and vault PDAs
      [invoicePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('invoice'),
          wallet.publicKey.toBuffer(),
          mint.toBuffer(),
          nonce.toArrayLike(Buffer, 'le', 8),
        ],
        humanPay.programId
      );

      [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), invoicePda.toBuffer()],
        humanPay.programId
      );
    });

    it('should create an invoice', async () => {
      await humanPay.methods
        .createConfidentialInvoice({
          amount: invoiceAmount,
          humanRequirements: 50,
          expiresAt: new BN(0),
          memo: Array.from(Buffer.alloc(32, 0)),
          nonce: nonce,
        })
        .accounts({
          invoice: invoicePda,
          vault: vaultPda,
          mint: mint,
          merchant: wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const invoice = await humanPay.account.confidentialInvoice.fetch(invoicePda);
      expect(invoice.merchant.equals(wallet.publicKey)).to.be.true;
      expect(invoice.amount.toNumber()).to.equal(invoiceAmount.toNumber());
      expect(invoice.nonce.toNumber()).to.equal(nonce.toNumber());
      expect(invoice.status.open).to.not.be.undefined;
      console.log('✅ Invoice created with nonce:', invoice.nonce.toNumber());
    });

    it('should pay the invoice', async () => {
      const [payerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), payerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await humanPay.methods
        .payConfidentialInvoice()
        .accounts({
          invoice: invoicePda,
          vault: vaultPda,
          mint: mint,
          payerProfile: payerProfilePda,
          payerTokenAccount: payerTokenAccount,
          payer: payerKeypair.publicKey,
          humanRegistryProgram: humanRegistry.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([payerKeypair])
        .rpc();

      const invoice = await humanPay.account.confidentialInvoice.fetch(invoicePda);
      expect(invoice.status.paid).to.not.be.undefined;
      expect(invoice.payer.equals(payerKeypair.publicKey)).to.be.true;
      console.log('✅ Invoice paid');
    });

    it('should withdraw funds from paid invoice', async () => {
      await humanPay.methods
        .withdrawInvoice()
        .accounts({
          invoice: invoicePda,
          vault: vaultPda,
          mint: mint,
          merchantTokenAccount: merchantTokenAccount,
          merchant: wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      const invoice = await humanPay.account.confidentialInvoice.fetch(invoicePda);
      expect(invoice.status.withdrawn).to.not.be.undefined;
      console.log('✅ Invoice withdrawn - nonce-based PDA signing works!');
    });

    it('should fail to withdraw with wrong mint (real Token-2022 mint)', async () => {
      // Create a NEW invoice for this test
      const newNonce = new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000) + 1);
      
      const [newInvoicePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('invoice'),
          wallet.publicKey.toBuffer(),
          mint.toBuffer(),
          newNonce.toArrayLike(Buffer, 'le', 8),
        ],
        humanPay.programId
      );

      const [newVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), newInvoicePda.toBuffer()],
        humanPay.programId
      );

      // Create invoice
      await humanPay.methods
        .createConfidentialInvoice({
          amount: invoiceAmount,
          humanRequirements: 50,
          expiresAt: new BN(0),
          memo: Array.from(Buffer.alloc(32, 0)),
          nonce: newNonce,
        })
        .accounts({
          invoice: newInvoicePda,
          vault: newVaultPda,
          mint: mint,
          merchant: wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Pay invoice
      const [payerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), payerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await humanPay.methods
        .payConfidentialInvoice()
        .accounts({
          invoice: newInvoicePda,
          vault: newVaultPda,
          mint: mint,
          payerProfile: payerProfilePda,
          payerTokenAccount: payerTokenAccount,
          payer: payerKeypair.publicKey,
          humanRegistryProgram: humanRegistry.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([payerKeypair])
        .rpc();

      // Create a REAL second Token-2022 mint (not just a random pubkey)
      const wrongMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        6,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Created wrong mint:', wrongMint.toBase58());

      // Create merchant token account for wrong mint
      const wrongMerchantAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        wrongMint,
        wallet.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      try {
        await humanPay.methods
          .withdrawInvoice()
          .accounts({
            invoice: newInvoicePda,
            vault: newVaultPda,
            mint: wrongMint, // Wrong mint!
            merchantTokenAccount: wrongMerchantAta.address,
            merchant: wallet.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();

        expect.fail('Should have failed with InvalidMint');
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('InvalidMint');
        console.log('✅ Withdraw with wrong mint correctly rejected');
      }
    });
  });

  describe('data_blink task flow', () => {
    const dataBlink = anchor.workspace.DataBlink as Program;
    const humanRegistry = anchor.workspace.HumanRegistry as Program;
    
    let rewardMint: PublicKey;
    let creatorTokenAccount: PublicKey;
    let workerKeypair: Keypair;
    let workerTokenAccount: PublicKey;
    let taskPda: PublicKey;
    let vaultPda: PublicKey;
    let responsePda: PublicKey;
    const nonce = new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const rewardPerResponse = new BN(100_000);
    const totalBudget = new BN(1_000_000);

    before(async () => {
      // Create Token-2022 reward mint
      rewardMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        6,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Created reward mint:', rewardMint.toBase58());

      // Create creator token account and mint tokens
      const creatorAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        rewardMint,
        wallet.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      creatorTokenAccount = creatorAta.address;

      await mintTo(
        provider.connection,
        wallet.payer,
        rewardMint,
        creatorTokenAccount,
        wallet.publicKey,
        10_000_000,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Create worker keypair and fund it
      workerKeypair = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        workerKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create worker token account
      const workerAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        rewardMint,
        workerKeypair.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      workerTokenAccount = workerAta.address;

      // Initialize worker profile in human_registry
      const [workerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), workerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await humanRegistry.methods
        .initProfile()
        .accounts({
          profile: workerProfilePda,
          authority: workerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([workerKeypair])
        .rpc();

      // Give worker some human score
      await humanRegistry.methods
        .registerAttestation(
          Keypair.generate().publicKey,
          Array.from(Buffer.alloc(32, 1)),
          100
        )
        .accounts({
          profile: workerProfilePda,
          authority: workerKeypair.publicKey,
        })
        .signers([workerKeypair])
        .rpc();
      console.log('Worker profile initialized with human score');

      // Derive task and vault PDAs
      [taskPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('task'),
          wallet.publicKey.toBuffer(),
          nonce.toArrayLike(Buffer, 'le', 8),
        ],
        dataBlink.programId
      );

      [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('task_vault'), taskPda.toBuffer()],
        dataBlink.programId
      );

      [responsePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('response'), taskPda.toBuffer(), workerKeypair.publicKey.toBuffer()],
        dataBlink.programId
      );
    });

    it('should create a task', async () => {
      await dataBlink.methods
        .createTask({
          rewardPerResponse: rewardPerResponse,
          totalBudget: totalBudget,
          humanRequirements: 50,
          metadataUri: 'https://example.com/task.json',
          maxResponses: 10,
          allowMultipleResponses: false,
          nonce: nonce,
        })
        .accounts({
          task: taskPda,
          vault: vaultPda,
          rewardMint: rewardMint,
          creatorTokenAccount: creatorTokenAccount,
          creator: wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const task = await dataBlink.account.task.fetch(taskPda);
      expect(task.creator.equals(wallet.publicKey)).to.be.true;
      expect(task.totalBudget.toNumber()).to.equal(totalBudget.toNumber());
      expect(task.nonce.toNumber()).to.equal(nonce.toNumber());
      expect(task.isOpen).to.be.true;
      console.log('✅ Task created with nonce:', task.nonce.toNumber());
    });

    it('should submit a response', async () => {
      const [workerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), workerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      await dataBlink.methods
        .submitResponse(1, Array.from(Buffer.alloc(32, 0)))
        .accounts({
          task: taskPda,
          response: responsePda,
          workerProfile: workerProfilePda,
          worker: workerKeypair.publicKey,
          humanRegistryProgram: humanRegistry.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([workerKeypair])
        .rpc();

      const response = await dataBlink.account.taskResponse.fetch(responsePda);
      expect(response.worker.equals(workerKeypair.publicKey)).to.be.true;
      expect(response.choice).to.equal(1);
      expect(response.isClaimed).to.be.false;
      console.log('✅ Response submitted');
    });

    it('should claim rewards', async () => {
      await dataBlink.methods
        .claimRewards()
        .accounts({
          task: taskPda,
          response: responsePda,
          vault: vaultPda,
          rewardMint: rewardMint,
          workerTokenAccount: workerTokenAccount,
          worker: workerKeypair.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([workerKeypair])
        .rpc();

      const response = await dataBlink.account.taskResponse.fetch(responsePda);
      expect(response.isClaimed).to.be.true;
      console.log('✅ Rewards claimed - nonce-based PDA signing works!');
    });

    it('should fail double claim', async () => {
      try {
        await dataBlink.methods
          .claimRewards()
          .accounts({
            task: taskPda,
            response: responsePda,
            vault: vaultPda,
            rewardMint: rewardMint,
            workerTokenAccount: workerTokenAccount,
            worker: workerKeypair.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .signers([workerKeypair])
          .rpc();

        expect.fail('Should have failed with RewardAlreadyClaimed');
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('RewardAlreadyClaimed');
        console.log('✅ Double claim correctly rejected');
      }
    });

    it('should close task and return remaining budget', async () => {
      await dataBlink.methods
        .closeTask()
        .accounts({
          task: taskPda,
          vault: vaultPda,
          rewardMint: rewardMint,
          creatorTokenAccount: creatorTokenAccount,
          creator: wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      const task = await dataBlink.account.task.fetch(taskPda);
      expect(task.isOpen).to.be.false;
      console.log('✅ Task closed - nonce-based PDA signing works for close!');
    });
  });

  describe('PDA derivation tests', () => {
    const humanPay = anchor.workspace.HumanPay as Program;
    const dataBlink = anchor.workspace.DataBlink as Program;

    it('should derive task PDA correctly with nonce', () => {
      const nonce = new BN(Date.now());
      const [taskPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('task'), wallet.publicKey.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
        dataBlink.programId
      );
      expect(taskPda).to.be.instanceOf(PublicKey);
      console.log('✅ Task PDA derived with nonce');
    });

    it('should derive invoice PDA correctly with nonce', () => {
      const mint = Keypair.generate().publicKey;
      const nonce = new BN(Date.now());
      const [invoicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('invoice'), wallet.publicKey.toBuffer(), mint.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
        humanPay.programId
      );
      expect(invoicePda).to.be.instanceOf(PublicKey);
      console.log('✅ Invoice PDA derived with nonce');
    });
  });
});
