import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { HumanRailClient } from './client';
import { Task, TaskResponse, CreateTaskParams, TaskMetadata } from './types';
import { TASK_SEED, TASK_VAULT_SEED, RESPONSE_SEED, HUMAN_PROFILE_SEED } from './constants';

/**
 * Derive task PDA
 */
export function deriveTaskPda(
  creator: PublicKey,
  nonce: BN,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TASK_SEED, creator.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    programId
  );
}

/**
 * Derive task vault PDA
 */
export function deriveTaskVaultPda(
  task: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TASK_VAULT_SEED, task.toBuffer()],
    programId
  );
}

/**
 * Derive response PDA
 */
export function deriveResponsePda(
  task: PublicKey,
  worker: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RESPONSE_SEED, task.toBuffer(), worker.toBuffer()],
    programId
  );
}

/**
 * Fetch a task by its public key
 */
export async function getTask(
  client: HumanRailClient,
  taskPubkey: PublicKey
): Promise<Task | null> {
  try {
    const account = await (client.blinkProgram.account as any).task.fetch(taskPubkey);
    return account as Task;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch all open tasks
 */
export async function getOpenTasks(
  client: HumanRailClient
): Promise<Array<{ pubkey: PublicKey; task: Task }>> {
  const accounts = await (client.blinkProgram.account as any).task.all([
    {
      memcmp: {
        // isOpen is at a specific offset - this is a simplified filter
        // In practice, you'd calculate the exact offset
        offset: 8 + 32 + 32 + 8 + 8 + 8 + 2 + 4 + 200, // Approximate
        bytes: '1', // true
      },
    },
  ]);

  return accounts.map((a: any) => ({
    pubkey: a.publicKey,
    task: a.account as Task,
  }));
}

/**
 * Fetch all tasks created by a specific creator
 */
export async function getTasksByCreator(
  client: HumanRailClient,
  creator: PublicKey
): Promise<Array<{ pubkey: PublicKey; task: Task }>> {
  const accounts = await (client.blinkProgram.account as any).task.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: creator.toBase58(),
      },
    },
  ]);

  return accounts.map((a: any) => ({
    pubkey: a.publicKey,
    task: a.account as Task,
  }));
}

/**
 * Fetch task metadata from URI
 */
export async function fetchTaskMetadata(
  metadataUri: string
): Promise<TaskMetadata> {
  const response = await fetch(metadataUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }
  return response.json() as Promise<TaskMetadata>;
}

/**
 * Create a new task
 */
export async function createTask(
  client: HumanRailClient,
  params: CreateTaskParams & { rewardMint: PublicKey }
): Promise<{ tx: string; task: PublicKey }> {
  const [taskPda] = deriveTaskPda(client.wallet, params.nonce, client.blinkProgramId);
  const [vaultPda] = deriveTaskVaultPda(taskPda, client.blinkProgramId);

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    params.rewardMint,
    client.wallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await (client.blinkProgram.methods as any)
    .createTask({
      rewardPerResponse: params.rewardPerResponse,
      totalBudget: params.totalBudget,
      humanRequirements: params.humanRequirements,
      metadataUri: params.metadataUri,
      maxResponses: params.maxResponses,
      allowMultipleResponses: params.allowMultipleResponses,
      nonce: params.nonce,
    })
    .accounts({
      task: taskPda,
      vault: vaultPda,
      rewardMint: params.rewardMint,
      creatorTokenAccount: creatorTokenAccount,
      creator: client.wallet,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, task: taskPda };
}

// generateNonce is exported from pay.ts to avoid duplicate exports

/**
 * Close a task and retrieve remaining budget
 */
export async function closeTask(
  client: HumanRailClient,
  taskPubkey: PublicKey
): Promise<string> {
  const task = await getTask(client, taskPubkey);
  if (!task) {
    throw new Error('Task not found');
  }

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    task.rewardMint,
    client.wallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await (client.blinkProgram.methods as any)
    .closeTask()
    .accounts({
      task: taskPubkey,
      vault: task.vault,
      rewardMint: task.rewardMint,
      creatorTokenAccount: creatorTokenAccount,
      creator: client.wallet,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

/**
 * Submit a response to a task
 */
export async function submitTaskResponse(
  client: HumanRailClient,
  taskPubkey: PublicKey,
  choice: number,
  responseData: Uint8Array = new Uint8Array(32)
): Promise<string> {
  const [responsePda] = deriveResponsePda(
    taskPubkey,
    client.wallet,
    client.blinkProgramId
  );

  const [profilePda] = PublicKey.findProgramAddressSync(
    [HUMAN_PROFILE_SEED, client.wallet.toBuffer()],
    client.registryProgramId
  );

  const tx = await (client.blinkProgram.methods as any)
    .submitResponse(choice, Array.from(responseData))
    .accounts({
      task: taskPubkey,
      response: responsePda,
      workerProfile: profilePda,
      worker: client.wallet,
      humanRegistryProgram: client.registryProgramId,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Claim rewards for a task response
 */
export async function claimTaskRewards(
  client: HumanRailClient,
  taskPubkey: PublicKey
): Promise<string> {
  const task = await getTask(client, taskPubkey);
  if (!task) {
    throw new Error('Task not found');
  }

  const [responsePda] = deriveResponsePda(
    taskPubkey,
    client.wallet,
    client.blinkProgramId
  );

  const workerTokenAccount = getAssociatedTokenAddressSync(
    task.rewardMint,
    client.wallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await (client.blinkProgram.methods as any)
    .claimRewards()
    .accounts({
      task: taskPubkey,
      response: responsePda,
      vault: task.vault,
      rewardMint: task.rewardMint,
      workerTokenAccount: workerTokenAccount,
      worker: client.wallet,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

/**
 * Get a worker's response for a task
 */
export async function getTaskResponse(
  client: HumanRailClient,
  taskPubkey: PublicKey,
  worker: PublicKey
): Promise<TaskResponse | null> {
  const [responsePda] = deriveResponsePda(
    taskPubkey,
    worker,
    client.blinkProgramId
  );

  try {
    const account = await (client.blinkProgram.account as any).taskResponse.fetch(
      responsePda
    );
    return account as TaskResponse;
  } catch (error) {
    return null;
  }
}

/**
 * Check if worker has already responded to a task
 */
export async function hasRespondedToTask(
  client: HumanRailClient,
  taskPubkey: PublicKey,
  worker: PublicKey
): Promise<boolean> {
  const response = await getTaskResponse(client, taskPubkey, worker);
  return response !== null;
}

/**
 * Calculate remaining budget for a task
 */
export function calculateRemainingBudget(task: Task): BN {
  return task.totalBudget.sub(task.consumedBudget);
}

/**
 * Calculate maximum remaining responses
 */
export function calculateMaxRemainingResponses(task: Task): number {
  const remaining = calculateRemainingBudget(task);
  if (task.rewardPerResponse.isZero()) {
    return 0;
  }
  return remaining.div(task.rewardPerResponse).toNumber();
}
