import { PublicKey, SystemProgram } from '@solana/web3.js';
import { HumanRailClient } from './client';
import { HUMAN_PROFILE_SEED } from './constants';

export function deriveHumanProfilePda(
  wallet: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [HUMAN_PROFILE_SEED, wallet.toBuffer()],
    programId
  );
}

export async function getHumanProfile(
  client: HumanRailClient,
  wallet: PublicKey
) {
  try {
    const [profilePda] = deriveHumanProfilePda(wallet, client.registryProgramId);
    return await client.registryProgram.account.humanProfile.fetch(profilePda);
  } catch (error) {
    return null;
  }
}

export async function initProfile(client: HumanRailClient): Promise<string> {
  const [profilePda] = deriveHumanProfilePda(client.wallet, client.registryProgramId);

  return await client.registryProgram.methods
    .initProfile()
    .accounts({
      profile: profilePda,
      authority: client.wallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function registerAttestation(
  client: HumanRailClient,
  source: PublicKey,
  payloadHash: Uint8Array | number[],
  weight: number
): Promise<string> {
  const [profilePda] = deriveHumanProfilePda(client.wallet, client.registryProgramId);

  const hashArray = payloadHash instanceof Uint8Array 
    ? Array.from(payloadHash) 
    : payloadHash;

  return await client.registryProgram.methods
    .registerAttestation(source, hashArray, weight)
    .accounts({
      profile: profilePda,
      authority: client.wallet,
    })
    .rpc();
}
