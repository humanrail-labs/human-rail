import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, Idl, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_IDS } from '../constants';
import { deriveAgent, deriveAgentStats, deriveHumanProfile } from '../pda';
import AgentRegistryIDL from '../idl/agent_registry.json';

function arProgram(provider: AnchorProvider): Program {
  return new (Program as any)(AgentRegistryIDL as Idl, PROGRAM_IDS.agentRegistry, provider);
}

export interface RegisterAgentParams {
  name: number[];
  signingKey: PublicKey;
  metadataHash: number[];
  nonce: BN;
}

export async function registerAgent(
  provider: AnchorProvider,
  principal: PublicKey,
  params: RegisterAgentParams
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  const [humanProfile] = deriveHumanProfile(principal);
  const [agent] = deriveAgent(principal, params.nonce.toNumber());
  const [operatorStats] = deriveAgentStats(agent);

  return await (program.methods as any)
    .registerAgent(params)
    .accounts({
      principal,
      humanProfile,
      humanRegistryProgram: PROGRAM_IDS.humanRegistry,
      agent,
      operatorStats,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function suspendAgent(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  return await (program.methods as any)
    .suspendAgent()
    .accounts({ principal, agent: agentPda })
    .instruction();
}

export async function reactivateAgent(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  return await (program.methods as any)
    .reactivateAgent()
    .accounts({ principal, agent: agentPda })
    .instruction();
}

export async function revokeAgent(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  return await (program.methods as any)
    .revokeAgent()
    .accounts({ principal, agent: agentPda })
    .instruction();
}

export async function rotateAgentKey(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey,
  newSigningKey: PublicKey
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  const [keyRotation] = PublicKey.findProgramAddressSync(
    [Buffer.from('key_rotation'), agentPda.toBuffer()],
    PROGRAM_IDS.agentRegistry
  );
  return await (program.methods as any)
    .rotateAgentKey(newSigningKey)
    .accounts({
      principal,
      agent: agentPda,
      keyRotation,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function updateAgentMetadata(
  provider: AnchorProvider,
  principal: PublicKey,
  agentPda: PublicKey,
  newMetadataHash: number[]
): Promise<TransactionInstruction> {
  const program = arProgram(provider);
  return await (program.methods as any)
    .updateAgentMetadata(newMetadataHash)
    .accounts({ principal, agent: agentPda })
    .instruction();
}
