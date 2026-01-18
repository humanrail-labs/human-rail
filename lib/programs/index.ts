import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Cluster } from "@/lib/solana/providers";

import humanRegistryIdl from "@/lib/idl/human_registry.json";
import agentRegistryIdl from "@/lib/idl/agent_registry.json";
import delegationIdl from "@/lib/idl/delegation.json";
import humanPayIdl from "@/lib/idl/human_pay.json";
import dataBlinkIdl from "@/lib/idl/data_blink.json";
import documentRegistryIdl from "@/lib/idl/document_registry.json";
import receiptsIdl from "@/lib/idl/receipts.json";

// ============================================================================
// CORRECT DEVNET PROGRAM IDs (verified with `solana program show`)
// ============================================================================
const PROGRAM_IDS: Record<Cluster, Record<string, string>> = {
  devnet: {
    humanRegistry: "GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo",
    agentRegistry: "GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ",
    delegation: "HRmukQDzeju62kb1frapSX37GvH1qwwrjC2XdezWfS5Z",
    humanPay: "CFxYX4vxNef9VwtkNHNd4m3mH3LpwoS3gSvEBGB4jeUV",
    dataBlink: "GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX",
    documentRegistry: "8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28",
    receipts: "7Q8tdMyTKvtomuSYiHPCB2inV29wr6P2SB7Cmo4kof6z",
  },
  localnet: {
    humanRegistry: "GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo",
    agentRegistry: "GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ",
    delegation: "HRmukQDzeju62kb1frapSX37GvH1qwwrjC2XdezWfS5Z",
    humanPay: "CFxYX4vxNef9VwtkNHNd4m3mH3LpwoS3gSvEBGB4jeUV",
    dataBlink: "GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX",
    documentRegistry: "8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28",
    receipts: "7Q8tdMyTKvtomuSYiHPCB2inV29wr6P2SB7Cmo4kof6z",
  },
  "mainnet-beta": {
    humanRegistry: "GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo",
    agentRegistry: "",
    delegation: "",
    humanPay: "",
    dataBlink: "",
    documentRegistry: "",
    receipts: "",
  },
};

export type ProgramName = keyof typeof PROGRAM_IDS.devnet;

export function getProgramId(cluster: Cluster, program: ProgramName): PublicKey {
  const id = PROGRAM_IDS[cluster][program];
  if (!id) throw new Error(`Program ${program} not deployed on ${cluster}`);
  return new PublicKey(id);
}

// ============================================================================
// IDL GETTERS
// ============================================================================
function patchIdlAddress(idl: unknown, programId: PublicKey): Idl {
  return { ...(idl as object), address: programId.toBase58() } as Idl;
}

export function getHumanRegistryProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "humanRegistry");
  return new Program(patchIdlAddress(humanRegistryIdl, programId), provider);
}

export function getAgentRegistryProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "agentRegistry");
  return new Program(patchIdlAddress(agentRegistryIdl, programId), provider);
}

export function getDelegationProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "delegation");
  return new Program(patchIdlAddress(delegationIdl, programId), provider);
}

export function getHumanPayProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "humanPay");
  return new Program(patchIdlAddress(humanPayIdl, programId), provider);
}

export function getDataBlinkProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "dataBlink");
  return new Program(patchIdlAddress(dataBlinkIdl, programId), provider);
}

export function getDocumentRegistryProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "documentRegistry");
  return new Program(patchIdlAddress(documentRegistryIdl, programId), provider);
}

export function getReceiptsProgram(provider: AnchorProvider, cluster: Cluster): Program {
  const programId = getProgramId(cluster, "receipts");
  return new Program(patchIdlAddress(receiptsIdl, programId), provider);
}

// ============================================================================
// DISCRIMINATORS (from IDLs)
// ============================================================================
export const DISCRIMINATORS = {
  // human_registry
  initProfile: Buffer.from([210, 162, 212, 95, 95, 186, 89, 119]),
  registerAttestation: Buffer.from([16, 160, 132, 114, 195, 169, 210, 204]),
  issueAttestation: Buffer.from([18, 115, 85, 100, 231, 31, 242, 143]),

  // agent_registry
  registerAgent: Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]),
  suspendAgent: Buffer.from([242, 28, 54, 59, 247, 20, 59, 110]),
  reactivateAgent: Buffer.from([231, 7, 179, 97, 210, 24, 209, 12]),
  revokeAgent: Buffer.from([227, 60, 209, 125, 240, 117, 163, 73]),
  rotateAgentKey: Buffer.from([85, 31, 17, 212, 162, 53, 153, 115]),

  // delegation
  issueCapability: Buffer.from([191, 205, 139, 120, 12, 205, 58, 77]),
  revokeCapability: Buffer.from([26, 112, 110, 143, 126, 19, 23, 73]),
  emergencyFreeze: Buffer.from([179, 69, 168, 100, 173, 7, 136, 112]),
  unfreeze: Buffer.from([133, 160, 68, 253, 80, 232, 218, 247]),
};

// ============================================================================
// PDA DERIVATION HELPERS
// ============================================================================
export function deriveHumanProfilePda(wallet: PublicKey, cluster: Cluster): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("human_profile"), wallet.toBuffer()],
    getProgramId(cluster, "humanRegistry")
  );
}

export function deriveAgentPda(
  principal: PublicKey,
  nonce: BN | bigint | number,
  cluster: Cluster
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, BigInt(nonce.toString()), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), principal.toBuffer(), nonceBuffer],
    getProgramId(cluster, "agentRegistry")
  );
}

export function deriveCapabilityPda(
  principal: PublicKey,
  agent: PublicKey,
  nonce: BN | bigint | number,
  cluster: Cluster
): [PublicKey, number] {
  // NEW (browser compatible)
  const nonceBuffer = Buffer.alloc(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, BigInt(nonce.toString()), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("capability"), principal.toBuffer(), agent.toBuffer(), nonceBuffer],
    getProgramId(cluster, "delegation")
  );
}

export function deriveFreezePda(
  principal: PublicKey,
  agent: PublicKey,
  cluster: Cluster
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("freeze"), principal.toBuffer(), agent.toBuffer()],
    getProgramId(cluster, "delegation")
  );
}

export function deriveIssuerRegistryPda(cluster: Cluster): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("issuer_registry")],
    getProgramId(cluster, "humanRegistry")
  );
}

// ============================================================================
// ACCOUNT TYPES
// ============================================================================
export interface HumanProfile {
  wallet: PublicKey;
  humanScore: number;
  isUnique: boolean;
  totalAttestationCount: number;
  activeAttestationCount: number;
  lastAttestationAt: number;
  lastScoreUpdate: number;
  canRegisterAgents: boolean;
  agentsRegistered: number;
  createdAt: number;
  bump: number;
}

export interface AgentProfile {
  ownerPrincipal: PublicKey;
  signingKey: PublicKey;
  name: string;
  metadataHash: Uint8Array;
  teeMeasurement: Uint8Array;
  hasTeeMeasurement: boolean;
  status: "Active" | "Suspended" | "Revoked";
  createdAt: number;
  lastStatusChange: number;
  lastMetadataUpdate: number;
  capabilityCount: number;
  actionCount: number;
  nonce: bigint;
  bump: number;
}

export interface Capability {
  principal: PublicKey;
  agent: PublicKey;
  allowedPrograms: bigint;
  allowedAssets: bigint;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  maxSlippageBps: number;
  maxFee: bigint;
  validFrom: number;
  expiresAt: number;
  cooldownSeconds: number;
  riskTier: number;
  status: "Active" | "Frozen" | "Revoked" | "Disputed";
  issuedAt: number;
  lastUsedAt: number;
  dailySpent: bigint;
  currentDay: number;
  totalSpent: bigint;
  useCount: bigint;
  enforceAllowlist: boolean;
  nonce: bigint;
  bump: number;
}

// ============================================================================
// ACCOUNT PARSING HELPERS
// ============================================================================
export function parseAgentStatus(statusByte: number): "Active" | "Suspended" | "Revoked" {
  switch (statusByte) {
    case 0: return "Active";
    case 1: return "Suspended";
    case 2: return "Revoked";
    default: return "Active";
  }
}

export function parseCapabilityStatus(statusByte: number): "Active" | "Frozen" | "Revoked" | "Disputed" {
  switch (statusByte) {
    case 0: return "Active";
    case 1: return "Frozen";
    case 2: return "Revoked";
    case 3: return "Disputed";
    default: return "Active";
  }
}

export function parseHumanProfile(data: Buffer): HumanProfile | null {
  try {
    if (data.length < 80) return null;

    let offset = 8; // Skip discriminator

    const wallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanScore = data.readUInt16LE(offset);
    offset += 2;

    const isUnique = data[offset] === 1;
    offset += 1;

    const totalAttestationCount = data.readUInt32LE(offset);
    offset += 4;

    const activeAttestationCount = data.readUInt32LE(offset);
    offset += 4;

    const lastAttestationAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastScoreUpdate = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip attestations vec (4 bytes length + variable data)
    const attestationsLen = data.readUInt32LE(offset);
    offset += 4;
    // Each AttestationRef is roughly 75 bytes
    offset += attestationsLen * 75;

    const canRegisterAgents = data[offset] === 1;
    offset += 1;

    const agentsRegistered = data.readUInt32LE(offset);
    offset += 4;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const bump = data[offset];

    return {
      wallet,
      humanScore,
      isUnique,
      totalAttestationCount,
      activeAttestationCount,
      lastAttestationAt,
      lastScoreUpdate,
      canRegisterAgents,
      agentsRegistered,
      createdAt,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse human profile:", e);
    return null;
  }
}

export function parseAgentProfile(data: Buffer): AgentProfile | null {
  try {
    if (data.length < 200) return null;

    let offset = 8; // Skip discriminator

    const ownerPrincipal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const signingKey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const nameBytes = data.slice(offset, offset + 32);
    const name = Buffer.from(nameBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const metadataHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const teeMeasurement = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const hasTeeMeasurement = data[offset] === 1;
    offset += 1;

    const status = parseAgentStatus(data[offset]);
    offset += 1;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastStatusChange = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastMetadataUpdate = Number(data.readBigInt64LE(offset));
    offset += 8;

    const capabilityCount = data.readUInt32LE(offset);
    offset += 4;

    const actionCount = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const nonce = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      ownerPrincipal,
      signingKey,
      name,
      metadataHash,
      teeMeasurement,
      hasTeeMeasurement,
      status,
      createdAt,
      lastStatusChange,
      lastMetadataUpdate,
      capabilityCount,
      actionCount,
      nonce,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse agent profile:", e);
    return null;
  }
}

export function parseCapability(data: Buffer): Capability | null {
  try {
    if (data.length < 400) return null;

    let offset = 8; // Skip discriminator

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const allowedPrograms = data.readBigUInt64LE(offset);
    offset += 8;

    const allowedAssets = data.readBigUInt64LE(offset);
    offset += 8;

    const perTxLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailyLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const totalLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const maxSlippageBps = data.readUInt16LE(offset);
    offset += 2;

    const maxFee = data.readBigUInt64LE(offset);
    offset += 8;

    const validFrom = Number(data.readBigInt64LE(offset));
    offset += 8;

    const expiresAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const cooldownSeconds = data.readUInt32LE(offset);
    offset += 4;

    const riskTier = data[offset];
    offset += 1;

    const status = parseCapabilityStatus(data[offset]);
    offset += 1;

    const issuedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastUsedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const dailySpent = data.readBigUInt64LE(offset);
    offset += 8;

    const currentDay = data.readUInt32LE(offset);
    offset += 4;

    const totalSpent = data.readBigUInt64LE(offset);
    offset += 8;

    const useCount = data.readBigUInt64LE(offset);
    offset += 8;

    const enforceAllowlist = data[offset] === 1;
    offset += 1;

    // Skip allowlist_count (1 byte) + destination_allowlist (10 * 32 bytes) + dispute_reason (32 bytes)
    offset += 1 + 320 + 32;

    const nonce = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      principal,
      agent,
      allowedPrograms,
      allowedAssets,
      perTxLimit,
      dailyLimit,
      totalLimit,
      maxSlippageBps,
      maxFee,
      validFrom,
      expiresAt,
      cooldownSeconds,
      riskTier,
      status,
      issuedAt,
      lastUsedAt,
      dailySpent,
      currentDay,
      totalSpent,
      useCount,
      enforceAllowlist,
      nonce,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse capability:", e);
    return null;
  }
}
