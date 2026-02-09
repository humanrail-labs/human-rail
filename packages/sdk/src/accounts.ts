import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PROGRAM_IDS } from './constants';
import {
  deriveHumanProfile,
  deriveIssuer,
  deriveIssuerRegistry,
  deriveAttestation,
  deriveAgent,
  deriveAgentStats,
  deriveCapability,
  deriveReceipt,
  deriveReceiptIndex,
} from './pda';

import HumanRegistryIDL from './idl/human_registry.json';
import AgentRegistryIDL from './idl/agent_registry.json';
import DelegationIDL from './idl/delegation.json';
import ReceiptsIDL from './idl/receipts.json';

function mkProgram(idl: any, programId: PublicKey, provider: AnchorProvider): Program {
  return new (Program as any)(idl, programId, provider);
}

export function createReadonlyProvider(connection: Connection): AnchorProvider {
  return new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
}

export async function fetchHumanProfile(connection: Connection, wallet: PublicKey) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(HumanRegistryIDL, PROGRAM_IDS.humanRegistry, provider);
  const [pda] = deriveHumanProfile(wallet);
  return (program.account as any).humanProfile.fetch(pda);
}

export async function fetchHumanProfileOrNull(connection: Connection, wallet: PublicKey) {
  try { return await fetchHumanProfile(connection, wallet); } catch { return null; }
}

export async function fetchIssuerRegistry(connection: Connection) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(HumanRegistryIDL, PROGRAM_IDS.humanRegistry, provider);
  const [pda] = deriveIssuerRegistry();
  return (program.account as any).issuerRegistry.fetch(pda);
}

export async function fetchIssuer(connection: Connection, authority: PublicKey) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(HumanRegistryIDL, PROGRAM_IDS.humanRegistry, provider);
  const [pda] = deriveIssuer(authority);
  return (program.account as any).issuer.fetch(pda);
}

export async function fetchSignedAttestation(
  connection: Connection, profile: PublicKey, issuer: PublicKey, nonce: bigint | number
) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(HumanRegistryIDL, PROGRAM_IDS.humanRegistry, provider);
  const [pda] = deriveAttestation(profile, issuer, nonce);
  return (program.account as any).signedAttestation.fetch(pda);
}

export async function fetchAgentProfile(
  connection: Connection, principal: PublicKey, nonce: bigint | number
) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(AgentRegistryIDL, PROGRAM_IDS.agentRegistry, provider);
  const [pda] = deriveAgent(principal, nonce);
  return (program.account as any).agentProfile.fetch(pda);
}

export async function fetchAgentStats(connection: Connection, agent: PublicKey) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(AgentRegistryIDL, PROGRAM_IDS.agentRegistry, provider);
  const [pda] = deriveAgentStats(agent);
  return (program.account as any).agentOperatorStats.fetch(pda);
}

export async function fetchCapability(
  connection: Connection, principal: PublicKey, agent: PublicKey, nonce: bigint | number
) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(DelegationIDL, PROGRAM_IDS.delegation, provider);
  const [pda] = deriveCapability(principal, agent, nonce);
  return (program.account as any).capability.fetch(pda);
}

export async function fetchReceipt(connection: Connection, agent: PublicKey, nonce: bigint | number) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(ReceiptsIDL, PROGRAM_IDS.receipts, provider);
  const [pda] = deriveReceipt(agent, nonce);
  return (program.account as any).actionReceipt.fetch(pda);
}

export async function fetchReceiptIndex(connection: Connection, entity: PublicKey) {
  const provider = createReadonlyProvider(connection);
  const program = mkProgram(ReceiptsIDL, PROGRAM_IDS.receipts, provider);
  const [pda] = deriveReceiptIndex(entity);
  return (program.account as any).receiptIndex.fetch(pda);
}
