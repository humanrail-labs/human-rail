import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { HumanRailClient } from './client';
import { Task, TaskResponse, CreateTaskParams, TaskMetadata } from './types';
/**
 * Derive task PDA
 */
export declare function deriveTaskPda(creator: PublicKey, nonce: BN, programId: PublicKey): [PublicKey, number];
/**
 * Derive task vault PDA
 */
export declare function deriveTaskVaultPda(task: PublicKey, programId: PublicKey): [PublicKey, number];
/**
 * Derive response PDA
 */
export declare function deriveResponsePda(task: PublicKey, worker: PublicKey, programId: PublicKey): [PublicKey, number];
/**
 * Fetch a task by its public key
 */
export declare function getTask(client: HumanRailClient, taskPubkey: PublicKey): Promise<Task | null>;
/**
 * Fetch all open tasks
 */
export declare function getOpenTasks(client: HumanRailClient): Promise<Array<{
    pubkey: PublicKey;
    task: Task;
}>>;
/**
 * Fetch all tasks created by a specific creator
 */
export declare function getTasksByCreator(client: HumanRailClient, creator: PublicKey): Promise<Array<{
    pubkey: PublicKey;
    task: Task;
}>>;
/**
 * Fetch task metadata from URI
 */
export declare function fetchTaskMetadata(metadataUri: string): Promise<TaskMetadata>;
/**
 * Create a new task
 */
export declare function createTask(client: HumanRailClient, params: CreateTaskParams & {
    rewardMint: PublicKey;
}): Promise<{
    tx: string;
    task: PublicKey;
}>;
/**
 * Close a task and retrieve remaining budget
 */
export declare function closeTask(client: HumanRailClient, taskPubkey: PublicKey): Promise<string>;
/**
 * Submit a response to a task
 */
export declare function submitTaskResponse(client: HumanRailClient, taskPubkey: PublicKey, choice: number, responseData?: Uint8Array): Promise<string>;
/**
 * Claim rewards for a task response
 */
export declare function claimTaskRewards(client: HumanRailClient, taskPubkey: PublicKey): Promise<string>;
/**
 * Get a worker's response for a task
 */
export declare function getTaskResponse(client: HumanRailClient, taskPubkey: PublicKey, worker: PublicKey): Promise<TaskResponse | null>;
/**
 * Check if worker has already responded to a task
 */
export declare function hasRespondedToTask(client: HumanRailClient, taskPubkey: PublicKey, worker: PublicKey): Promise<boolean>;
/**
 * Calculate remaining budget for a task
 */
export declare function calculateRemainingBudget(task: Task): BN;
/**
 * Calculate maximum remaining responses
 */
export declare function calculateMaxRemainingResponses(task: Task): number;
//# sourceMappingURL=tasks.d.ts.map