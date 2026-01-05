"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const config_1 = require("../config");
exports.taskRoutes = (0, express_1.Router)();
const connection = new web3_js_1.Connection(config_1.config.rpcUrl, 'confirmed');
// Create a dummy keypair for read-only provider (we won't sign anything)
const dummyKeypair = web3_js_1.Keypair.generate();
const provider = new anchor_1.AnchorProvider(connection, {
    publicKey: dummyKeypair.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
}, { commitment: 'confirmed' });
// Data Blink IDL (inline for actions-server - matches SDK)
const DATA_BLINK_IDL = {
    "address": "BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5",
    "metadata": { "name": "dataBlink", "version": "0.1.0", "spec": "0.1.0" },
    "instructions": [
        {
            "name": "claimRewards",
            "discriminator": [4, 144, 132, 71, 116, 23, 151, 80],
            "accounts": [
                { "name": "task" },
                { "name": "response", "writable": true },
                { "name": "vault", "writable": true },
                { "name": "rewardMint" },
                { "name": "workerTokenAccount", "writable": true },
                { "name": "worker", "writable": true, "signer": true },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }
            ],
            "args": []
        },
        {
            "name": "submitResponse",
            "discriminator": [206, 110, 114, 220, 150, 44, 142, 197],
            "accounts": [
                { "name": "task", "writable": true },
                { "name": "response", "writable": true, "pda": { "seeds": [{ "kind": "const", "value": [114, 101, 115, 112, 111, 110, 115, 101] }, { "kind": "account", "path": "task" }, { "kind": "account", "path": "worker" }] } },
                { "name": "workerProfile", "pda": { "seeds": [{ "kind": "const", "value": [104, 117, 109, 97, 110, 95, 112, 114, 111, 102, 105, 108, 101] }, { "kind": "account", "path": "worker" }], "program": { "kind": "account", "path": "humanRegistryProgram" } } },
                { "name": "worker", "writable": true, "signer": true },
                { "name": "humanRegistryProgram", "address": "Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR" },
                { "name": "systemProgram", "address": "11111111111111111111111111111111" }
            ],
            "args": [
                { "name": "choice", "type": "u8" },
                { "name": "responseData", "type": { "array": ["u8", 32] } }
            ]
        }
    ],
    "accounts": [
        { "name": "task", "discriminator": [79, 34, 229, 55, 177, 65, 126, 22] },
        { "name": "taskResponse", "discriminator": [176, 157, 32, 232, 29, 45, 162, 146] }
    ],
    "types": [
        {
            "name": "task",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "creator", "type": "pubkey" },
                    { "name": "rewardMint", "type": "pubkey" },
                    { "name": "rewardPerResponse", "type": "u64" },
                    { "name": "totalBudget", "type": "u64" },
                    { "name": "consumedBudget", "type": "u64" },
                    { "name": "humanRequirements", "type": "u16" },
                    { "name": "metadataUri", "type": "string" },
                    { "name": "isOpen", "type": "bool" },
                    { "name": "responseCount", "type": "u32" },
                    { "name": "maxResponses", "type": "u32" },
                    { "name": "allowMultipleResponses", "type": "bool" },
                    { "name": "createdAt", "type": "i64" },
                    { "name": "closedAt", "type": "i64" },
                    { "name": "vault", "type": "pubkey" },
                    { "name": "bump", "type": "u8" },
                    { "name": "vaultBump", "type": "u8" },
                    { "name": "nonce", "type": "u64" }
                ]
            }
        }
    ]
};
// Initialize program with IDL
const dataBlinkProgram = new anchor_1.Program(DATA_BLINK_IDL, provider);
/**
 * GET /actions/tasks/:taskPubkey
 * Returns Action metadata for a task
 */
exports.taskRoutes.get('/:taskPubkey', async (req, res) => {
    try {
        const { taskPubkey } = req.params;
        // Validate pubkey
        let taskKey;
        try {
            taskKey = new web3_js_1.PublicKey(taskPubkey);
        }
        catch {
            const error = { error: { message: 'Invalid task public key' } };
            return res.status(400).json(error);
        }
        // Fetch actual task data from chain
        let taskData;
        try {
            taskData = await dataBlinkProgram.account.task.fetch(taskKey);
        }
        catch (e) {
            const error = { error: { message: 'Task not found on chain' } };
            return res.status(404).json(error);
        }
        const rewardPerResponse = taskData.rewardPerResponse.toNumber() / 1e6; // Assuming 6 decimals
        const isOpen = taskData.isOpen;
        const response = {
            icon: config_1.config.iconUrl,
            title: `HumanRail Task`,
            description: isOpen
                ? `Complete this human verification task to earn ${rewardPerResponse} tokens per response.`
                : 'This task is closed.',
            label: isOpen ? 'Complete Task' : 'Task Closed',
            links: {
                actions: isOpen ? [
                    {
                        label: 'Choose Option A',
                        href: `${config_1.config.baseUrl}/actions/tasks/${taskPubkey}/respond?choice=0`,
                    },
                    {
                        label: 'Choose Option B',
                        href: `${config_1.config.baseUrl}/actions/tasks/${taskPubkey}/respond?choice=1`,
                    },
                    {
                        label: 'Claim Rewards',
                        href: `${config_1.config.baseUrl}/actions/tasks/${taskPubkey}/claim`,
                    },
                ] : [],
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching task:', error);
        const actionError = { error: { message: 'Failed to fetch task' } };
        res.status(500).json(actionError);
    }
});
/**
 * POST /actions/tasks/:taskPubkey/respond
 * Submit a response to a task
 */
exports.taskRoutes.post('/:taskPubkey/respond', async (req, res) => {
    try {
        const { taskPubkey } = req.params;
        const { choice } = req.query;
        const { account } = req.body;
        if (!account) {
            const error = { error: { message: 'Missing account in request body' } };
            return res.status(400).json(error);
        }
        // Validate pubkeys
        let taskKey;
        let workerKey;
        try {
            taskKey = new web3_js_1.PublicKey(taskPubkey);
            workerKey = new web3_js_1.PublicKey(account);
        }
        catch {
            const error = { error: { message: 'Invalid public key' } };
            return res.status(400).json(error);
        }
        // Validate choice
        const choiceNum = parseInt(choice, 10);
        if (isNaN(choiceNum) || choiceNum < 0 || choiceNum > 255) {
            const error = { error: { message: 'Invalid choice value (must be 0-255)' } };
            return res.status(400).json(error);
        }
        // Derive PDAs
        const [responsePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('response'), taskKey.toBuffer(), workerKey.toBuffer()], config_1.config.programIds.dataBlink);
        const [profilePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('human_profile'), workerKey.toBuffer()], config_1.config.programIds.humanRegistry);
        // Build instruction using Anchor Program
        const responseData = Array.from(new Uint8Array(32));
        const instruction = await dataBlinkProgram.methods
            .submitResponse(choiceNum, responseData)
            .accounts({
            task: taskKey,
            response: responsePda,
            workerProfile: profilePda,
            worker: workerKey,
            humanRegistryProgram: config_1.config.programIds.humanRegistry,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .instruction();
        // Create transaction
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new web3_js_1.Transaction({
            recentBlockhash: blockhash,
            feePayer: workerKey,
        }).add(instruction);
        // Serialize for return
        const serialized = transaction
            .serialize({ requireAllSignatures: false })
            .toString('base64');
        const response = {
            transaction: serialized,
            message: `Submitting response (choice ${choiceNum}) for task`,
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error creating response transaction:', error);
        const actionError = { error: { message: 'Failed to create transaction' } };
        res.status(500).json(actionError);
    }
});
/**
 * POST /actions/tasks/:taskPubkey/claim
 * Claim rewards for a completed task
 */
exports.taskRoutes.post('/:taskPubkey/claim', async (req, res) => {
    try {
        const { taskPubkey } = req.params;
        const { account } = req.body;
        if (!account) {
            const error = { error: { message: 'Missing account in request body' } };
            return res.status(400).json(error);
        }
        // Validate pubkeys
        let taskKey;
        let workerKey;
        try {
            taskKey = new web3_js_1.PublicKey(taskPubkey);
            workerKey = new web3_js_1.PublicKey(account);
        }
        catch {
            const error = { error: { message: 'Invalid public key' } };
            return res.status(400).json(error);
        }
        // Fetch task data from chain to get vault and rewardMint
        let taskData;
        try {
            taskData = await dataBlinkProgram.account.task.fetch(taskKey);
        }
        catch (e) {
            const error = { error: { message: 'Task not found on chain' } };
            return res.status(404).json(error);
        }
        const rewardMint = taskData.rewardMint;
        const vault = taskData.vault;
        // Derive response PDA
        const [responsePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('response'), taskKey.toBuffer(), workerKey.toBuffer()], config_1.config.programIds.dataBlink);
        // Get worker's token account for the reward mint
        const workerTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(rewardMint, workerKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
        // Build instruction using Anchor Program
        const instruction = await dataBlinkProgram.methods
            .claimRewards()
            .accounts({
            task: taskKey,
            response: responsePda,
            vault: vault,
            rewardMint: rewardMint,
            workerTokenAccount: workerTokenAccount,
            worker: workerKey,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        })
            .instruction();
        // Create transaction
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new web3_js_1.Transaction({
            recentBlockhash: blockhash,
            feePayer: workerKey,
        }).add(instruction);
        // Serialize for return
        const serialized = transaction
            .serialize({ requireAllSignatures: false })
            .toString('base64');
        const response = {
            transaction: serialized,
            message: 'Claiming task rewards',
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error creating claim transaction:', error);
        const actionError = { error: { message: 'Failed to create transaction' } };
        res.status(500).json(actionError);
    }
});
// Handle OPTIONS for CORS preflight
exports.taskRoutes.options('*', (req, res) => {
    res.status(200).end();
});
