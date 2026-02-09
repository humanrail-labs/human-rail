import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Ed25519Program,
  Transaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { expect } from 'chai';

// =============================================================================
// HumanRail Core v1 — Integration Tests
//
// Prerequisite: Anchor.toml [features] must include:
//   human_registry = ["test-skip-sig-verify"]
//
// Run: anchor test -- --grep "Core v1"
// =============================================================================

describe('Core v1 Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;

  // Programs
  const humanRegistry = anchor.workspace.HumanRegistry as Program;
  const agentRegistry = anchor.workspace.AgentRegistry as Program;
  const delegation = anchor.workspace.Delegation as Program;
  const receipts = anchor.workspace.Receipts as Program;

  // PDAs (derived in before())
  let registryPda: PublicKey;
  let profilePda: PublicKey;
  let issuerKeypair: Keypair;
  let issuerPda: PublicKey;
  let attestationPda: PublicKey;
  let agentPda: PublicKey;
  let agentStatsPda: PublicKey;
  let capabilityPda: PublicKey;
  let freezePda: PublicKey;

  // Constants
  const AGENT_NONCE = new BN(1);
  const CAPABILITY_NONCE = new BN(1);
  const ATTESTATION_NONCE = new BN(1);
  const agentSigningKeypair = Keypair.generate();

  /** Mirrors on-chain create_signing_bytes exactly. */
  function createSigningBytes(
    profile: PublicKey, issuer: PublicKey, payloadHash: Buffer,
    weight: number, issuedAt: number, expiresAt: number, nonce: number,
  ): Buffer {
    const buf = Buffer.alloc(24 + 32 + 32 + 32 + 2 + 8 + 8 + 8);
    let off = 0;
    Buffer.from("humanrail:attestation:v1").copy(buf, off); off += 24;
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
    const acct = await provider.connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
    if (!acct) throw new Error("Clock sysvar not found");
    return Number(acct.data.readBigInt64LE(32));
  }

  before(async () => {
    const balance = await provider.connection.getBalance(wallet.publicKey);
    if (balance < 5 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Human Registry PDAs
    [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('issuer_registry')],
      humanRegistry.programId
    );
    [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('human_profile'), wallet.publicKey.toBuffer()],
      humanRegistry.programId
    );

    // Issuer
    issuerKeypair = Keypair.generate();
    [issuerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('issuer'), issuerKeypair.publicKey.toBuffer()],
      humanRegistry.programId
    );

    // Attestation
    [attestationPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('attestation'),
        profilePda.toBuffer(),
        issuerPda.toBuffer(),
        ATTESTATION_NONCE.toArrayLike(Buffer, 'le', 8),
      ],
      humanRegistry.programId
    );

    // Agent Registry PDAs
    [agentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('agent'),
        wallet.publicKey.toBuffer(),
        AGENT_NONCE.toArrayLike(Buffer, 'le', 8),
      ],
      agentRegistry.programId
    );
    [agentStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent_stats'), agentPda.toBuffer()],
      agentRegistry.programId
    );

    // Delegation PDAs
    [capabilityPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('capability'),
        wallet.publicKey.toBuffer(),
        agentPda.toBuffer(),
        CAPABILITY_NONCE.toArrayLike(Buffer, 'le', 8),
      ],
      delegation.programId
    );
    [freezePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('freeze'),
        wallet.publicKey.toBuffer(),
        agentPda.toBuffer(),
      ],
      delegation.programId
    );


    // Fund the issuer keypair (it pays rent for attestation PDAs)
    const issuerSig = await provider.connection.requestAirdrop(
      issuerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(issuerSig);
    console.log('\n=== Core v1 Test Setup ===');
    console.log('Wallet:         ', wallet.publicKey.toBase58());
    console.log('HumanRegistry:  ', humanRegistry.programId.toBase58());
    console.log('AgentRegistry:  ', agentRegistry.programId.toBase58());
    console.log('Delegation:     ', delegation.programId.toBase58());
    console.log('Receipts:       ', receipts.programId.toBase58());
    console.log('ProfilePDA:     ', profilePda.toBase58());
    console.log('AgentPDA:       ', agentPda.toBase58());
    console.log('CapabilityPDA:  ', capabilityPda.toBase58());
    console.log('FreezePDA:      ', freezePda.toBase58());
    console.log('');
  });

  // =========================================================================
  // PHASE 1: Human Identity
  // =========================================================================
  describe('Phase 1 — Human Identity', () => {

    it('1.1 Initialize issuer registry', async () => {
      try {
        await humanRegistry.methods
          .initRegistry()
          .accounts({
            admin: wallet.publicKey,
            registry: registryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('  ✅ Registry initialized');
      } catch (e: any) {
        if (e.message?.includes('already in use')) {
          console.log('  ⏭️  Registry already initialized');
        } else {
          throw e;
        }
      }
      const registry = await humanRegistry.account.issuerRegistry.fetch(registryPda);
      expect(registry.admin.equals(wallet.publicKey)).to.be.true;
    });

    it('1.2 Initialize human profile (canonical v2)', async () => {
      try {
        await humanRegistry.methods
          .initProfile()
          .accounts({
            authority: wallet.publicKey,
            profile: profilePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('  ✅ Profile initialized');
      } catch (e: any) {
        if (e.message?.includes('already in use')) {
          console.log('  ⏭️  Profile already initialized');
        } else {
          throw e;
        }
      }

      // Fetch as v2 HumanProfile
      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      expect(profile.wallet.equals(wallet.publicKey)).to.be.true;
      expect(profile.humanScore).to.equal(0);
      expect(profile.isUnique).to.be.false;
      console.log('  → canRegisterAgents:', profile.canRegisterAgents);
    });

    it('1.3 Register KYC issuer', async () => {
      const nameBuffer = Buffer.alloc(32);
      Buffer.from('HumanRail-TestKYC').copy(nameBuffer);

      await humanRegistry.methods
        .registerIssuer({
          authority: issuerKeypair.publicKey,
          name: Array.from(nameBuffer),
          issuerType: { kycProvider: {} },
          maxWeight: 60,
          contributesToUniqueness: false,
          defaultValidity: null,
          metadataUri: null,
        })
        .accounts({
          admin: wallet.publicKey,
          registry: registryPda,
          issuer: issuerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const issuer = await humanRegistry.account.issuer.fetch(issuerPda);
      expect(issuer.authority.equals(issuerKeypair.publicKey)).to.be.true;
      expect(issuer.maxWeight).to.equal(60);
      console.log('  ✅ Issuer registered');
    });

    it('1.4 Issue attestation → score becomes 55', async () => {
      // Real Ed25519 signature (no test-skip-sig-verify)
      const payloadHash = Buffer.alloc(32);
      Buffer.from('kyc-verified-2025').copy(payloadHash);
      const weight = 55;
      const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 90;

      const clockTs = await getClockTimestamp();
      const message = createSigningBytes(
        profilePda, issuerPda, payloadHash, weight, clockTs, expiresAt, ATTESTATION_NONCE.toNumber());

      const ed25519Ix = Ed25519Program.createInstructionWithPrivateKey({
        privateKey: issuerKeypair.secretKey,
        message: Uint8Array.from(message),
      });

      const attestIx = await humanRegistry.methods
        .issueAttestation({
          payloadHash: Array.from(payloadHash),
          weight,
          signature: Array.from(Buffer.alloc(64)),
          nonce: ATTESTATION_NONCE,
          expiresAt: new BN(expiresAt),
          externalId: null,
        })
        .accounts({
          issuerAuthority: issuerKeypair.publicKey,
          issuer: issuerPda,
          profile: profilePda,
          attestation: attestationPda,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerKeypair])
        .instruction();

      const tx = new Transaction().add(ed25519Ix).add(attestIx);
      try {
        await provider.sendAndConfirm(tx, [issuerKeypair]);
        console.log("  [DEBUG] tx confirmed successfully");
      } catch (e: any) {
        console.log("  [DEBUG] tx FAILED:", e.message?.slice(0, 200));
        throw e;
      }
      console.log("  [DEBUG] tx sent, fetching profile...");
      const debugProfile = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log("  [DEBUG] score:", debugProfile.humanScore, "canRegister:", debugProfile.canRegisterAgents, "attestations:", debugProfile.activeAttestationCount);

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      expect(profile.humanScore).to.equal(55);
      expect(profile.activeAttestationCount).to.equal(1);
      expect(profile.canRegisterAgents).to.be.true;
      console.log('  ✅ Attestation issued: score=55, canRegisterAgents=true');
    });
  });

  // =========================================================================
  // PHASE 2: Agent Registration
  // =========================================================================
  describe('Phase 2 — Agent Registration', () => {

    it('2.1 Register agent under verified human', async () => {
      const nameBuffer = Buffer.alloc(32);
      Buffer.from('TestAgent-v1').copy(nameBuffer);
      const metadataHash = Buffer.alloc(32);
      Buffer.from('agent-meta-v1').copy(metadataHash);

      await agentRegistry.methods
        .registerAgent({
          name: Array.from(nameBuffer),
          metadataHash: Array.from(metadataHash),
          signingKey: agentSigningKeypair.publicKey,
          teeMeasurement: null,
          nonce: AGENT_NONCE,
        })
        .accounts({
          principal: wallet.publicKey,
          humanProfile: profilePda,
          humanRegistryProgram: humanRegistry.programId,
          agent: agentPda,
          operatorStats: agentStatsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const agent = await agentRegistry.account.agentProfile.fetch(agentPda);
      expect(agent.ownerPrincipal.equals(wallet.publicKey)).to.be.true;
      expect(agent.signingKey.equals(agentSigningKeypair.publicKey)).to.be.true;
      expect(agent.nonce.toNumber()).to.equal(1);
      console.log('  ✅ Agent registered');
    });

    it('2.2 Verify agent (active)', async () => {
      await agentRegistry.methods
        .verifyAgent()
        .accounts({ agent: agentPda })
        .rpc();
      console.log('  ✅ Agent verified');
    });

    it('2.3 Suspend → verify fails → reactivate → verify passes', async () => {
      // Suspend
      await agentRegistry.methods
        .suspendAgent()
        .accounts({ principal: wallet.publicKey, agent: agentPda })
        .rpc();

      // Verify should fail
      try {
        await agentRegistry.methods
          .verifyAgent()
          .accounts({ agent: agentPda })
          .rpc();
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.toString()).to.include('AgentNotActive');
      }

      // Reactivate
      await agentRegistry.methods
        .reactivateAgent()
        .accounts({ principal: wallet.publicKey, agent: agentPda })
        .rpc();

      // Verify should pass again
      await agentRegistry.methods
        .verifyAgent()
        .accounts({ agent: agentPda })
        .rpc();
      console.log('  ✅ Suspend/reactivate lifecycle works');
    });

    it('2.4 Rotate agent key and back', async () => {
      const newKey = Keypair.generate();
      const agent = await agentRegistry.account.agentProfile.fetch(agentPda);

      const [rotPda1] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('key_rotation'),
          agentPda.toBuffer(),
          agent.actionCount.toArrayLike(Buffer, 'le', 8),
        ],
        agentRegistry.programId
      );

      await agentRegistry.methods
        .rotateAgentKey(newKey.publicKey)
        .accounts({
          principal: wallet.publicKey,
          agent: agentPda,
          keyRotation: rotPda1,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      let updated = await agentRegistry.account.agentProfile.fetch(agentPda);
      expect(updated.signingKey.equals(newKey.publicKey)).to.be.true;

      // Rotate back
      const [rotPda2] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('key_rotation'),
          agentPda.toBuffer(),
          updated.actionCount.toArrayLike(Buffer, 'le', 8),
        ],
        agentRegistry.programId
      );

      await agentRegistry.methods
        .rotateAgentKey(agentSigningKeypair.publicKey)
        .accounts({
          principal: wallet.publicKey,
          agent: agentPda,
          keyRotation: rotPda2,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      updated = await agentRegistry.account.agentProfile.fetch(agentPda);
      expect(updated.signingKey.equals(agentSigningKeypair.publicKey)).to.be.true;
      console.log('  ✅ Key rotation works');
    });
  });

  // =========================================================================
  // PHASE 3: Delegation (Capability Lifecycle)
  // =========================================================================
  describe('Phase 3 — Delegation', () => {

    it('3.1 Issue capability to agent', async () => {
      const now = Math.floor(Date.now() / 1000);

      await delegation.methods
        .issueCapability({
          allowedPrograms: new BN(0xFF),
          allowedAssets: new BN(0xFF),
          perTxLimit: new BN(1_000_000_000),
          dailyLimit: new BN(5_000_000_000),
          totalLimit: new BN(50_000_000_000),
          maxSlippageBps: 500,
          maxFee: new BN(10_000_000),
          validFrom: new BN(now - 60),
          expiresAt: new BN(now + 86400 * 30),
          cooldownSeconds: 0,
          destinationAllowlist: [],
          riskTier: 0,
          nonce: CAPABILITY_NONCE,
        })
        .accounts({
          principal: wallet.publicKey,
          agent: agentPda,
          capability: capabilityPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const cap = await delegation.account.capability.fetch(capabilityPda);
      expect(cap.principal.equals(wallet.publicKey)).to.be.true;
      expect(cap.agent.equals(agentPda)).to.be.true;
      expect(cap.perTxLimit.toNumber()).to.equal(1_000_000_000);
      expect(cap.totalSpent.toNumber()).to.equal(0);
      console.log('  ✅ Capability issued');
    });

    it('3.2 Validate capability (passes — no freeze)', async () => {
      // freeze_record PDA does not exist on-chain → UncheckedAccount with no data → not frozen
      await delegation.methods
        .validateCapability(
          0,
          new BN(100_000_000),
          Keypair.generate().publicKey
        )
        .accounts({
          capability: capabilityPda,
          freezeRecord: freezePda,
        })
        .rpc();
      console.log('  ✅ Capability validated (0.1 SOL, no freeze)');
    });

    it('3.3 Revoke capability → validation fails', async () => {
      // Create a second capability to revoke
      const revokeNonce = new BN(999);
      const [revokeCap] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('capability'),
          wallet.publicKey.toBuffer(),
          agentPda.toBuffer(),
          revokeNonce.toArrayLike(Buffer, 'le', 8),
        ],
        delegation.programId
      );

      const now = Math.floor(Date.now() / 1000);
      await delegation.methods
        .issueCapability({
          allowedPrograms: new BN(1),
          allowedAssets: new BN(1),
          perTxLimit: new BN(100),
          dailyLimit: new BN(1000),
          totalLimit: new BN(10000),
          maxSlippageBps: 0,
          maxFee: new BN(0),
          validFrom: new BN(now - 60),
          expiresAt: new BN(now + 3600),
          cooldownSeconds: 0,
          destinationAllowlist: [],
          riskTier: 0,
          nonce: revokeNonce,
        })
        .accounts({
          principal: wallet.publicKey,
          agent: agentPda,
          capability: revokeCap,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Revoke
      const [revocationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('revocation'), revokeCap.toBuffer()],
        delegation.programId
      );

      await delegation.methods
        .revokeCapability()
        .accounts({
          principal: wallet.publicKey,
          capability: revokeCap,
          revocationEntry: revocationPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Validate revoked → should fail (wrapper sets fail_on_invalid: true)
      try {
        await delegation.methods
          .validateCapability(0, new BN(50), Keypair.generate().publicKey)
          .accounts({
            capability: revokeCap,
            freezeRecord: freezePda,
          })
          .rpc();
        expect.fail('Should have thrown — revoked capability');
      } catch (e: any) {
        expect(e.toString()).to.include('CapabilityNotActive');
        console.log('  ✅ Revoked capability correctly rejected');
      }
    });

    it('3.4 Primary capability still active after sibling revoke', async () => {
      const cap = await delegation.account.capability.fetch(capabilityPda);
      expect(Object.keys(cap.status)[0]).to.equal('active');
      console.log('  ✅ Primary capability unaffected');
    });
  });

  // =========================================================================
  // PHASE 4: Attestation Revocation + Score Gate
  // =========================================================================
  describe('Phase 4 — Attestation Lifecycle', () => {

    it('4.1 Revoke attestation → score drops to 0', async () => {
      await humanRegistry.methods
        .revokeAttestationV2()
        .accounts({
          authority: issuerKeypair.publicKey,
          attestation: attestationPda,
          profile: profilePda,
          issuer: issuerPda,
        })
        .signers([issuerKeypair])
        .rpc();

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      expect(profile.humanScore).to.equal(0);
      expect(profile.activeAttestationCount).to.equal(0);
      expect(profile.canRegisterAgents).to.be.false;
      console.log('  ✅ Attestation revoked: score=0, canRegisterAgents=false');
    });

    it('4.2 Cannot register new agent with score=0', async () => {
      const [newAgentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('agent'),
          wallet.publicKey.toBuffer(),
          new BN(777).toArrayLike(Buffer, 'le', 8),
        ],
        agentRegistry.programId
      );
      const [newStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent_stats'), newAgentPda.toBuffer()],
        agentRegistry.programId
      );

      try {
        await agentRegistry.methods
          .registerAgent({
            name: Array.from(Buffer.alloc(32)),
            metadataHash: Array.from(Buffer.alloc(32)),
            signingKey: Keypair.generate().publicKey,
            teeMeasurement: null,
            nonce: new BN(777),
          })
          .accounts({
            principal: wallet.publicKey,
            humanProfile: profilePda,
            humanRegistryProgram: humanRegistry.programId,
            agent: newAgentPda,
            operatorStats: newStatsPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail('Should have thrown — score too low');
      } catch (e: any) {
        expect(e.toString()).to.include('InsufficientHumanScore');
        console.log('  ✅ Correctly rejected: insufficient score');
      }
    });
  });

  // =========================================================================
  // PHASE 5: Summary
  // =========================================================================
  describe('Phase 5 — Summary', () => {
    it('prints final state', async () => {
      console.log('\n=== Core v1 Final State ===');

      const profile = await humanRegistry.account.humanProfile.fetch(profilePda);
      console.log('Profile:', {
        score: profile.humanScore,
        unique: profile.isUnique,
        canRegisterAgents: profile.canRegisterAgents,
        totalAttestations: profile.totalAttestationCount,
        activeAttestations: profile.activeAttestationCount,
      });

      const agent = await agentRegistry.account.agentProfile.fetch(agentPda);
      console.log('Agent:', {
        status: Object.keys(agent.status)[0],
        signingKey: agent.signingKey.toBase58().slice(0, 12) + '...',
        actionCount: agent.actionCount.toNumber(),
      });

      const cap = await delegation.account.capability.fetch(capabilityPda);
      console.log('Capability:', {
        status: Object.keys(cap.status)[0],
        totalSpent: cap.totalSpent.toNumber(),
        useCount: cap.useCount.toNumber(),
      });

      console.log('\n✅ Core v1 integration tests complete.\n');
    });
  });
});
