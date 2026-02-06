import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { expect } from 'chai';

describe('HumanRail Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;

  describe('human_registry', () => {
    const humanRegistry = anchor.workspace.HumanRegistry as Program;
    
    let registryPda: PublicKey;
    let profilePda: PublicKey;

    before(async () => {
      [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('issuer_registry')],
        humanRegistry.programId
      );
      
      [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
        humanRegistry.programId
      );

      console.log('Registry PDA:', registryPda.toBase58());
      console.log('Profile PDA:', profilePda.toBase58());
      console.log('Program ID:', humanRegistry.programId.toBase58());
    });

    it('should initialize the issuer registry', async () => {
      try {
        await humanRegistry.methods
          .initRegistry()
          .accounts({
            admin: wallet.publicKey,
            registry: registryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const registry = await humanRegistry.account.issuerRegistry.fetch(registryPda);
        
        expect(registry.admin.equals(wallet.publicKey)).to.be.true;
        expect(registry.issuerCount).to.equal(0);
        expect(registry.registrationPaused).to.be.false;

        console.log('✅ Registry initialized:', {
          admin: registry.admin.toBase58(),
          issuerCount: registry.issuerCount,
        });
      } catch (e: any) {
        if (e.message?.includes('already in use')) {
          console.log('Registry already initialized, continuing...');
          const registry = await humanRegistry.account.issuerRegistry.fetch(registryPda);
          expect(registry.admin.equals(wallet.publicKey)).to.be.true;
        } else {
          throw e;
        }
      }
    });

    it('should initialize a human profile', async () => {
      try {
        await humanRegistry.methods
          .initProfile()
          .accounts({
            profile: profilePda,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // Use humanProfileLegacy - matches the program's Account type
        const profile = await humanRegistry.account.humanProfile.fetch(profilePda);

        expect(profile.wallet.equals(wallet.publicKey)).to.be.true;
        expect(profile.humanScore).to.equal(0);
        expect(profile.isUnique).to.be.false;

        console.log('✅ Profile initialized:', {
          wallet: profile.wallet.toBase58(),
          score: profile.humanScore,
        });
      } catch (e: any) {
        if (e.message?.includes('already in use')) {
          console.log('Profile already initialized, continuing...');
          const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
          expect(profile.wallet.equals(wallet.publicKey)).to.be.true;
        } else {
          throw e;
        }
      }
    });

    it('should register an issuer', async () => {
      const issuerKeypair = Keypair.generate();
      
      const [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('issuer'), issuerKeypair.publicKey.toBuffer()],
        humanRegistry.programId
      );

      const nameBuffer = Buffer.alloc(32);
      Buffer.from('TestIssuer').copy(nameBuffer);

      // Use valid IssuerType variant: kycProvider (camelCase for TS)
      const params = {
        authority: issuerKeypair.publicKey,
        name: Array.from(nameBuffer),
        issuerType: { kycProvider: {} },
        maxWeight: 50,
        contributesToUniqueness: true,
        defaultValidity: null,
        metadataUri: null,
      };

      await humanRegistry.methods
        .registerIssuer(params)
        .accounts({
          admin: wallet.publicKey,
          registry: registryPda,
          issuer: issuerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const issuer = await humanRegistry.account.issuer.fetch(issuerPda);
      
      expect(issuer.authority.equals(issuerKeypair.publicKey)).to.be.true;
      expect(issuer.maxWeight).to.equal(50);

      console.log('✅ Issuer registered:', {
        authority: issuer.authority.toBase58(),
        maxWeight: issuer.maxWeight,
      });

      const registry = await humanRegistry.account.issuerRegistry.fetch(registryPda);
      expect(registry.issuerCount).to.be.greaterThan(0);
    });
  });

  describe('human_pay', () => {
    const humanPay = anchor.workspace.HumanPay as Program;
    
    it('should be loadable', async () => {
      expect(humanPay).to.not.be.undefined;
      console.log('✅ HumanPay program loaded:', humanPay.programId.toBase58());
    });
  });

  describe('data_blink', () => {
    const dataBlink = anchor.workspace.DataBlink as Program;
    
    it('should be loadable', async () => {
      expect(dataBlink).to.not.be.undefined;
      console.log('✅ DataBlink program loaded:', dataBlink.programId.toBase58());
    });
  });
});
