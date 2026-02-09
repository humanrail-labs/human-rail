import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, Idl, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_IDS } from '../constants';
import {
  deriveIssuerRegistry,
  deriveHumanProfile,
  deriveIssuer,
  deriveAttestation,
} from '../pda';
import { prepareAttestationSignature } from '../ed25519';
import HumanRegistryIDL from '../idl/human_registry.json';

function hrProgram(provider: AnchorProvider): Program {
  return new (Program as any)(HumanRegistryIDL as Idl, PROGRAM_IDS.humanRegistry, provider);
}

export async function initRegistry(
  provider: AnchorProvider,
  admin: PublicKey
): Promise<TransactionInstruction> {
  const program = hrProgram(provider);
  const [registry] = deriveIssuerRegistry();
  return await (program.methods as any)
    .initRegistry()
    .accounts({
      admin,
      registry,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function initProfile(
  provider: AnchorProvider,
  authority: PublicKey
): Promise<TransactionInstruction> {
  const program = hrProgram(provider);
  const [profile] = deriveHumanProfile(authority);
  return await (program.methods as any)
    .initProfile()
    .accounts({
      authority,
      profile,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export interface RegisterIssuerParams {
  name: number[];
  issuerType: { kycProvider?: {} } | { proofOfPersonhood?: {} } | { socialVerification?: {} } | { deviceBased?: {} } | { eventBased?: {} } | { custom?: {} };
  maxWeight: number;
  contributesToUniqueness: boolean;
  defaultValidity: BN;
  metadataUri: number[];
  hasMetadataUri: boolean;
}

export async function registerIssuer(
  provider: AnchorProvider,
  admin: PublicKey,
  issuerAuthority: PublicKey,
  params: RegisterIssuerParams
): Promise<TransactionInstruction> {
  const program = hrProgram(provider);
  const [registry] = deriveIssuerRegistry();
  const [issuer] = deriveIssuer(issuerAuthority);
  return await (program.methods as any)
    .registerIssuer(params)
    .accounts({
      admin,
      registry,
      issuer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export interface IssueAttestationFullParams {
  provider: AnchorProvider;
  issuerAuthority: PublicKey;
  walletToAttest: PublicKey;
  payloadHash: Uint8Array;
  weight: number;
  issuedAt: number;
  expiresAt: number;
  nonce: number;
  issuerSecretKey: Uint8Array;
}

/**
 * Build [Ed25519Verify, issue_attestation] instruction pair.
 */
export async function issueAttestation(
  params: IssueAttestationFullParams
): Promise<TransactionInstruction[]> {
  const program = hrProgram(params.provider);
  const [profile] = deriveHumanProfile(params.walletToAttest);
  const [issuerPda] = deriveIssuer(params.issuerAuthority);
  const [attestation] = deriveAttestation(profile, issuerPda, params.nonce);

  const { ed25519Ix, signature } = prepareAttestationSignature({
    profilePda: profile,
    issuerPda,
    payloadHash: params.payloadHash,
    weight: params.weight,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    nonce: params.nonce,
    issuerSecretKey: params.issuerSecretKey,
  });

  const ixParams = {
    payloadHash: Array.from(params.payloadHash),
    weight: params.weight,
    issuedAt: new BN(params.issuedAt),
    expiresAt: new BN(params.expiresAt),
    nonce: new BN(params.nonce),
    signature: Array.from(signature),
  };

  const issueIx = await (program.methods as any)
    .issueAttestation(ixParams)
    .accounts({
      issuerAuthority: params.issuerAuthority,
      issuer: issuerPda,
      profile,
      attestation,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return [ed25519Ix, issueIx];
}

export async function revokeAttestationV2(
  provider: AnchorProvider,
  authority: PublicKey,
  attestationPda: PublicKey,
  profilePda: PublicKey,
  issuerPda: PublicKey
): Promise<TransactionInstruction> {
  const program = hrProgram(provider);
  return await (program.methods as any)
    .revokeAttestationV2()
    .accounts({
      authority,
      attestation: attestationPda,
      profile: profilePda,
      issuer: issuerPda,
    })
    .instruction();
}

export async function verifyHuman(
  provider: AnchorProvider,
  profilePda: PublicKey,
  params: { minScore: number; requireUnique: boolean }
): Promise<TransactionInstruction> {
  const program = hrProgram(provider);
  return await (program.methods as any)
    .verifyHuman(params)
    .accounts({ profile: profilePda })
    .instruction();
}
