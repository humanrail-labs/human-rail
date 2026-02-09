import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS, SEEDS } from './constants';

function u64LeBuffer(val: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(val));
  return buf;
}

// ── human_registry ──

export function deriveIssuerRegistry(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ISSUER_REGISTRY],
    PROGRAM_IDS.humanRegistry
  );
}

export function deriveHumanProfile(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.HUMAN_PROFILE, wallet.toBuffer()],
    PROGRAM_IDS.humanRegistry
  );
}

export function deriveIssuer(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ISSUER, authority.toBuffer()],
    PROGRAM_IDS.humanRegistry
  );
}

export function deriveAttestation(
  profile: PublicKey,
  issuer: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ATTESTATION, profile.toBuffer(), issuer.toBuffer(), u64LeBuffer(nonce)],
    PROGRAM_IDS.humanRegistry
  );
}

// ── agent_registry ──

export function deriveAgent(
  principal: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.AGENT, principal.toBuffer(), u64LeBuffer(nonce)],
    PROGRAM_IDS.agentRegistry
  );
}

export function deriveAgentStats(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.AGENT_STATS, agent.toBuffer()],
    PROGRAM_IDS.agentRegistry
  );
}

export function deriveKeyRotation(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.KEY_ROTATION, agent.toBuffer()],
    PROGRAM_IDS.agentRegistry
  );
}

// ── delegation ──

export function deriveCapability(
  principal: PublicKey,
  agent: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.CAPABILITY, principal.toBuffer(), agent.toBuffer(), u64LeBuffer(nonce)],
    PROGRAM_IDS.delegation
  );
}

export function deriveRevocation(capability: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.REVOCATION, capability.toBuffer()],
    PROGRAM_IDS.delegation
  );
}

export function deriveFreeze(
  principal: PublicKey,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.FREEZE, principal.toBuffer(), agent.toBuffer()],
    PROGRAM_IDS.delegation
  );
}

export function deriveUsage(capability: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.USAGE, capability.toBuffer()],
    PROGRAM_IDS.delegation
  );
}

// ── receipts ──

export function deriveReceipt(
  agent: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.RECEIPT, agent.toBuffer(), u64LeBuffer(nonce)],
    PROGRAM_IDS.receipts
  );
}

export function deriveReceiptIndex(entity: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.RECEIPT_INDEX, entity.toBuffer()],
    PROGRAM_IDS.receipts
  );
}
