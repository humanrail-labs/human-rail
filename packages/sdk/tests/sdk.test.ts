import { expect } from 'chai';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import {
  HumanRailClient,
  deriveHumanProfilePda,
  deriveTaskPda,
  deriveResponsePda,
  AttestationType,
} from '../src';

describe('HumanRail SDK', () => {
  // Use localnet for testing
  const connection = new Connection('http://localhost:8899', 'confirmed');
  
  let wallet: Keypair;
  let client: HumanRailClient;

  before(async () => {
    wallet = Keypair.generate();
    
    // Fund the wallet (only works on localnet with test validator)
    try {
      const airdropSig = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig);
    } catch (e) {
      console.log('Airdrop failed - ensure local validator is running');
    }

    const provider = new AnchorProvider(
      connection,
      new Wallet(wallet),
      { commitment: 'confirmed' }
    );

    client = new HumanRailClient({
      connection,
      provider,
    });
  });

  describe('PDA Derivation', () => {
    it('should derive human profile PDA correctly', () => {
      const testWallet = Keypair.generate().publicKey;
      const [pda, bump] = deriveHumanProfilePda(
        testWallet,
        client.registryProgramId
      );

      expect(pda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
      expect(bump).to.be.lessThanOrEqual(255);
    });

    it('should derive task PDA correctly', () => {
      const testCreator = Keypair.generate().publicKey;
      const createdAt = new BN(Date.now() / 1000);
      
      const [pda, bump] = deriveTaskPda(
        testCreator,
        createdAt,
        client.blinkProgramId
      );

      expect(pda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
    });

    it('should derive response PDA correctly', () => {
      const testTask = Keypair.generate().publicKey;
      const testWorker = Keypair.generate().publicKey;
      
      const [pda, bump] = deriveResponsePda(
        testTask,
        testWorker,
        client.blinkProgramId
      );

      expect(pda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a('number');
    });
  });

  describe('Types', () => {
    it('should have correct attestation type values', () => {
      expect(AttestationType.SAS).to.equal(0);
      expect(AttestationType.WorldId).to.equal(1);
      expect(AttestationType.Civic).to.equal(2);
      expect(AttestationType.GitcoinPassport).to.equal(3);
      expect(AttestationType.Custom).to.equal(4);
    });
  });

  describe('Client', () => {
    it('should create client from connection', () => {
      const testWallet = Keypair.generate();
      const testClient = HumanRailClient.fromConnection(
        connection,
        new Wallet(testWallet)
      );

      expect(testClient.wallet.equals(testWallet.publicKey)).to.be.true;
      expect(testClient.connection).to.equal(connection);
    });

    it('should have correct program IDs', () => {
      expect(client.registryProgramId.toBase58()).to.equal(
        '6BrHosLK9gjJmGWtdxUw8fgEWoew4HBM8QBrkwwokcS2'
      );
      expect(client.payProgramId.toBase58()).to.equal(
        '6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe'
      );
      expect(client.blinkProgramId.toBase58()).to.equal(
        '3j1Gfbi9WL2KUMKQavxdpjA2rJNBP8M8AmYgv1rKZKyj'
      );
    });
  });

  // These tests require a running local validator with deployed programs
  describe.skip('Integration Tests (requires local validator)', () => {
    it('should initialize human profile', async () => {
      // This would test actual program interaction
    });

    it('should create and complete a task', async () => {
      // This would test the full task lifecycle
    });
  });
});
