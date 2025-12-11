import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { HumanRailClient } from './client';
import { HumanProfile, AttestationInput, AttestationType } from './types';
import { HUMAN_PROFILE_SEED } from './constants';

/**
 * Derive the human profile PDA for a wallet
 */
export function deriveHumanProfilePda(
  wallet: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [HUMAN_PROFILE_SEED, wallet.toBuffer()],
    programId
  );
}

/**
 * Fetch a human profile for a wallet
 */
export async function getHumanProfile(
  client: HumanRailClient,
  wallet: PublicKey
): Promise<HumanProfile | null> {
  try {
    const [profilePda] = deriveHumanProfilePda(wallet, client.registryProgramId);
    const account = await client.registryProgram.account.humanProfile.fetch(
      profilePda
    );
    return account as unknown as HumanProfile;
  } catch (error) {
    // Account doesn't exist
    return null;
  }
}

/**
 * Check if a wallet has a human profile
 */
export async function hasHumanProfile(
  client: HumanRailClient,
  wallet: PublicKey
): Promise<boolean> {
  const profile = await getHumanProfile(client, wallet);
  return profile !== null;
}

/**
 * Initialize a human profile for the connected wallet
 */
export async function initProfile(client: HumanRailClient): Promise<string> {
  const [profilePda] = deriveHumanProfilePda(
    client.wallet,
    client.registryProgramId
  );

  const tx = await client.registryProgram.methods
    .initProfile()
    .accounts({
      profile: profilePda,
      wallet: client.wallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Ensure a human profile exists for the connected wallet.
 * Creates one if it doesn't exist.
 */
export async function ensureHumanProfile(
  client: HumanRailClient
): Promise<{ profile: HumanProfile; created: boolean }> {
  let profile = await getHumanProfile(client, client.wallet);

  if (!profile) {
    await initProfile(client);
    profile = await getHumanProfile(client, client.wallet);
    if (!profile) {
      throw new Error('Failed to create human profile');
    }
    return { profile, created: true };
  }

  return { profile, created: false };
}

/**
 * Register an attestation for the connected wallet's profile
 */
export async function registerAttestation(
  client: HumanRailClient,
  attestation: AttestationInput
): Promise<string> {
  const [profilePda] = deriveHumanProfilePda(
    client.wallet,
    client.registryProgramId
  );

  const tx = await client.registryProgram.methods
    .registerAttestation({
      sourceId: attestation.sourceId,
      payloadHash: Array.from(attestation.payloadHash),
      signature: attestation.signature
        ? Array.from(attestation.signature)
        : null,
      attestationType: { [AttestationType[attestation.attestationType]]: {} },
    })
    .accounts({
      profile: profilePda,
      wallet: client.wallet,
    })
    .rpc();

  return tx;
}

/**
 * Recompute the human score for the connected wallet's profile
 */
export async function recomputeScore(client: HumanRailClient): Promise<string> {
  const [profilePda] = deriveHumanProfilePda(
    client.wallet,
    client.registryProgramId
  );

  const tx = await client.registryProgram.methods
    .recomputeScore()
    .accounts({
      profile: profilePda,
      wallet: client.wallet,
    })
    .rpc();

  return tx;
}

/**
 * Build instruction to assert a wallet meets human requirements.
 * Useful for CPI integration with other programs.
 */
export function buildAssertUniqueInstruction(
  client: HumanRailClient,
  wallet: PublicKey,
  minScore: number
): TransactionInstruction {
  const [profilePda] = deriveHumanProfilePda(wallet, client.registryProgramId);

  return client.registryProgram.instruction.assertUnique(minScore, {
    accounts: {
      profile: profilePda,
      wallet: wallet,
    },
  });
}
