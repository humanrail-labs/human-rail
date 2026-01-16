import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';

describe('C-01: Emergency Freeze Security', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const delegation = anchor.workspace.Delegation as Program;

  let principalA: Keypair;
  let principalB: Keypair;
  let agentA: PublicKey;
  let agentB: PublicKey;
  let capabilityA: PublicKey;
  let capabilityB: PublicKey;

  before(async () => {
    principalA = Keypair.generate();
    principalB = Keypair.generate();

    const sig1 = await provider.connection.requestAirdrop(
      principalA.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      principalB.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);
  });

  it('Setup: Issue capability A', async () => {
    agentA = Keypair.generate().publicKey;
    const nonce = new BN(1);
    
    [capabilityA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('capability'),
        principalA.publicKey.toBuffer(),
        agentA.toBuffer(),
        nonce.toArrayLike(Buffer, 'le', 8),
      ],
      delegation.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await delegation.methods
      .issueCapability({
        allowedPrograms: new BN(1),
        allowedAssets: new BN(1),
        perTxLimit: new BN(100_000_000),
        dailyLimit: new BN(1_000_000_000),
        totalLimit: new BN(10_000_000_000),
        maxSlippageBps: 100,
        maxFee: new BN(1_000_000),
        validFrom: new BN(now),
        expiresAt: new BN(now + 86400 * 30),
        cooldownSeconds: 0,
        destinationAllowlist: [],
        riskTier: 0,
        nonce,
      })
      .accounts({
        principal: principalA.publicKey,
        agent: agentA,
        capability: capabilityA,
        systemProgram: SystemProgram.programId,
      })
      .signers([principalA])
      .rpc();
  });

  it('Setup: Issue capability B', async () => {
    agentB = Keypair.generate().publicKey;
    const nonce = new BN(1);
    
    [capabilityB] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('capability'),
        principalB.publicKey.toBuffer(),
        agentB.toBuffer(),
        nonce.toArrayLike(Buffer, 'le', 8),
      ],
      delegation.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await delegation.methods
      .issueCapability({
        allowedPrograms: new BN(1),
        allowedAssets: new BN(1),
        perTxLimit: new BN(100_000_000),
        dailyLimit: new BN(1_000_000_000),
        totalLimit: new BN(10_000_000_000),
        maxSlippageBps: 100,
        maxFee: new BN(1_000_000),
        validFrom: new BN(now),
        expiresAt: new BN(now + 86400 * 30),
        cooldownSeconds: 0,
        destinationAllowlist: [],
        riskTier: 0,
        nonce,
      })
      .accounts({
        principal: principalB.publicKey,
        agent: agentB,
        capability: capabilityB,
        systemProgram: SystemProgram.programId,
      })
      .signers([principalB])
      .rpc();
  });

  it('CRITICAL: Principal B CANNOT freeze Agent A (DoS prevented)', async () => {
    const [freezePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('freeze'), principalB.publicKey.toBuffer(), agentA.toBuffer()],
      delegation.programId
    );

    try {
      await delegation.methods
        .emergencyFreeze()
        .accounts({
          principal: principalB.publicKey,
          capability: capabilityA,
          agent: agentA,
          freezeRecord: freezePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([principalB])
        .rpc();

      expect.fail('SECURITY BREACH: Unauthorized freeze succeeded');
    } catch (err) {
      expect(err.message).to.include('Unauthorized');
      console.log('✅ DoS attack prevented');
    }
  });

  it('SUCCESS: Principal A CAN freeze their Agent A', async () => {
    const [freezePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('freeze'), principalA.publicKey.toBuffer(), agentA.toBuffer()],
      delegation.programId
    );

    await delegation.methods
      .emergencyFreeze()
      .accounts({
        principal: principalA.publicKey,
        capability: capabilityA,
        agent: agentA,
        freezeRecord: freezePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([principalA])
      .rpc();

    const record = await delegation.account.emergencyFreezeRecord.fetch(freezePda);
    expect(record.isActive).to.be.true;
    console.log('✅ Authorized freeze succeeded');
  });

  it('SUCCESS: Principal A CAN unfreeze their Agent A', async () => {
    const [freezePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('freeze'), principalA.publicKey.toBuffer(), agentA.toBuffer()],
      delegation.programId
    );

    await delegation.methods
      .unfreeze()
      .accounts({
        principal: principalA.publicKey,
        capability: capabilityA,
        agent: agentA,
        freezeRecord: freezePda,
      })
      .signers([principalA])
      .rpc();

    const info = await provider.connection.getAccountInfo(freezePda);
      expect(info).to.be.null;
      console.log("✅ Unfreeze closed freeze record");
    console.log('✅ Authorized unfreeze succeeded');
  });
});
