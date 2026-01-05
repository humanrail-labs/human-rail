"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveTaskPda = deriveTaskPda;
exports.deriveTaskVaultPda = deriveTaskVaultPda;
exports.deriveResponsePda = deriveResponsePda;
exports.getTask = getTask;
exports.getOpenTasks = getOpenTasks;
exports.getTasksByCreator = getTasksByCreator;
exports.fetchTaskMetadata = fetchTaskMetadata;
exports.createTask = createTask;
exports.closeTask = closeTask;
exports.submitTaskResponse = submitTaskResponse;
exports.claimTaskRewards = claimTaskRewards;
exports.getTaskResponse = getTaskResponse;
exports.hasRespondedToTask = hasRespondedToTask;
exports.calculateRemainingBudget = calculateRemainingBudget;
exports.calculateMaxRemainingResponses = calculateMaxRemainingResponses;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const constants_1 = require("./constants");
/**
 * Derive task PDA
 */
function deriveTaskPda(creator, nonce, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.TASK_SEED, creator.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)], programId);
}
/**
 * Derive task vault PDA
 */
function deriveTaskVaultPda(task, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.TASK_VAULT_SEED, task.toBuffer()], programId);
}
/**
 * Derive response PDA
 */
function deriveResponsePda(task, worker, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.RESPONSE_SEED, task.toBuffer(), worker.toBuffer()], programId);
}
/**
 * Fetch a task by its public key
 */
async function getTask(client, taskPubkey) {
    try {
        const account = await client.blinkProgram.account.task.fetch(taskPubkey);
        return account;
    }
    catch (error) {
        return null;
    }
}
/**
 * Fetch all open tasks
 */
async function getOpenTasks(client) {
    const accounts = await client.blinkProgram.account.task.all([
        {
            memcmp: {
                // isOpen is at a specific offset - this is a simplified filter
                // In practice, you'd calculate the exact offset
                offset: 8 + 32 + 32 + 8 + 8 + 8 + 2 + 4 + 200, // Approximate
                bytes: '1', // true
            },
        },
    ]);
    return accounts.map((a) => ({
        pubkey: a.publicKey,
        task: a.account,
    }));
}
/**
 * Fetch all tasks created by a specific creator
 */
async function getTasksByCreator(client, creator) {
    const accounts = await client.blinkProgram.account.task.all([
        {
            memcmp: {
                offset: 8, // After discriminator
                bytes: creator.toBase58(),
            },
        },
    ]);
    return accounts.map((a) => ({
        pubkey: a.publicKey,
        task: a.account,
    }));
}
/**
 * Fetch task metadata from URI
 */
async function fetchTaskMetadata(metadataUri) {
    const response = await fetch(metadataUri);
    if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    return response.json();
}
/**
 * Create a new task
 */
async function createTask(client, params) {
    const [taskPda] = deriveTaskPda(client.wallet, params.nonce, client.blinkProgramId);
    const [vaultPda] = deriveTaskVaultPda(taskPda, client.blinkProgramId);
    const creatorTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.rewardMint, client.wallet, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const tx = await client.blinkProgram.methods
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
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return { tx, task: taskPda };
}
// generateNonce is exported from pay.ts to avoid duplicate exports
/**
 * Close a task and retrieve remaining budget
 */
async function closeTask(client, taskPubkey) {
    const task = await getTask(client, taskPubkey);
    if (!task) {
        throw new Error('Task not found');
    }
    const creatorTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(task.rewardMint, client.wallet, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const tx = await client.blinkProgram.methods
        .closeTask()
        .accounts({
        task: taskPubkey,
        vault: task.vault,
        rewardMint: task.rewardMint,
        creatorTokenAccount: creatorTokenAccount,
        creator: client.wallet,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
    })
        .rpc();
    return tx;
}
/**
 * Submit a response to a task
 */
async function submitTaskResponse(client, taskPubkey, choice, responseData = new Uint8Array(32)) {
    const [responsePda] = deriveResponsePda(taskPubkey, client.wallet, client.blinkProgramId);
    const [profilePda] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.HUMAN_PROFILE_SEED, client.wallet.toBuffer()], client.registryProgramId);
    const tx = await client.blinkProgram.methods
        .submitResponse(choice, Array.from(responseData))
        .accounts({
        task: taskPubkey,
        response: responsePda,
        workerProfile: profilePda,
        worker: client.wallet,
        humanRegistryProgram: client.registryProgramId,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return tx;
}
/**
 * Claim rewards for a task response
 */
async function claimTaskRewards(client, taskPubkey) {
    const task = await getTask(client, taskPubkey);
    if (!task) {
        throw new Error('Task not found');
    }
    const [responsePda] = deriveResponsePda(taskPubkey, client.wallet, client.blinkProgramId);
    const workerTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(task.rewardMint, client.wallet, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const tx = await client.blinkProgram.methods
        .claimRewards()
        .accounts({
        task: taskPubkey,
        response: responsePda,
        vault: task.vault,
        rewardMint: task.rewardMint,
        workerTokenAccount: workerTokenAccount,
        worker: client.wallet,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
    })
        .rpc();
    return tx;
}
/**
 * Get a worker's response for a task
 */
async function getTaskResponse(client, taskPubkey, worker) {
    const [responsePda] = deriveResponsePda(taskPubkey, worker, client.blinkProgramId);
    try {
        const account = await client.blinkProgram.account.taskResponse.fetch(responsePda);
        return account;
    }
    catch (error) {
        return null;
    }
}
/**
 * Check if worker has already responded to a task
 */
async function hasRespondedToTask(client, taskPubkey, worker) {
    const response = await getTaskResponse(client, taskPubkey, worker);
    return response !== null;
}
/**
 * Calculate remaining budget for a task
 */
function calculateRemainingBudget(task) {
    return task.totalBudget.sub(task.consumedBudget);
}
/**
 * Calculate maximum remaining responses
 */
function calculateMaxRemainingResponses(task) {
    const remaining = calculateRemainingBudget(task);
    if (task.rewardPerResponse.isZero()) {
        return 0;
    }
    return remaining.div(task.rewardPerResponse).toNumber();
}
//# sourceMappingURL=tasks.js.map