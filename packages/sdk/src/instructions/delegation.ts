import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, Idl, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_IDS } from '../constants';
import { deriveCapability, deriveFreeze, deriveRevocation, deriveUsage } from '../pda';
import DelegationIDL from '../idl/delegation.json';

function dlProgram(provider: AnchorProvider): Program {
  return new (Program as any)(DelegationIDL as Idl, PROGRAM_IDS.delegation, provider);
}

export interface IssueCapabilityParams {
  allowedPrograms: BN;
  allowedAssets: BN;
  perTxLimit: BN;
  dailyLimit: BN;
  totalLimit: BN;
  maxSlippageBps: number;
  maxFee: BN;
  validFrom: BN;
  expiresAt: BN;
  cooldownSeconds: number;
  riskTier: number;
  nonce: BN;
  enforceAllowlist: boolean;
  destinationAllowlist: PublicKey[];
}

export async function issueCapability(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey,
  params: IssueCapabilityParams
): Promise<TransactionInstruction> {
  const program = dlProgram(provider);
  const [capability] = deriveCapability(principal, agentPda, params.nonce.toNumber());
  return await (program.methods as any)
    .issueCapability(params)
    .accounts({
      principal,
      agent: agentPda,
      capability,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function revokeCapability(
  provider: AnchorProvider,
  principal: PublicKey,
  capabilityPda: PublicKey
): Promise<TransactionInstruction> {
  const program = dlProgram(provider);
  const [revocation] = deriveRevocation(capabilityPda);
  return await (program.methods as any)
    .revokeCapability()
    .accounts({
      principal,
      capability: capabilityPda,
      revocationEntry: revocation,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function emergencyFreeze(
  provider: AnchorProvider,
  principal: PublicKey,
  capabilityPda: PublicKey,
  agentPda: PublicKey
): Promise<TransactionInstruction> {
  const program = dlProgram(provider);
  const [freeze] = deriveFreeze(principal, agentPda);
  return await (program.methods as any)
    .emergencyFreeze()
    .accounts({
      principal,
      capability: capabilityPda,
      agent: agentPda,
      freezeRecord: freeze,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function unfreezeAgent(
  provider: AnchorProvider,
  principal: PublicKey,
  capabilityPda: PublicKey,
  agentPda: PublicKey
): Promise<TransactionInstruction> {
  const program = dlProgram(provider);
  const [freeze] = deriveFreeze(principal, agentPda);
  return await (program.methods as any)
    .unfreeze()
    .accounts({
      principal,
      capability: capabilityPda,
      agent: agentPda,
      freezeRecord: freeze,
    })
    .instruction();
}

export async function validateCapability(
  provider: AnchorProvider,
  capabilityPda: PublicKey,
  freezeRecordPda: PublicKey,
  actionType: number,
  actionValue: BN,
  destination: PublicKey
): Promise<TransactionInstruction> {
  const program = dlProgram(provider);
  return await (program.methods as any)
    .validateCapability(actionType, actionValue, destination)
    .accounts({
      capability: capabilityPda,
      freezeRecord: freezeRecordPda,
    })
    .instruction();
}
