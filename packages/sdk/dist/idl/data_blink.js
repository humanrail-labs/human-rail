"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "address": "BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5",
    "metadata": {
        "name": "dataBlink",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "RLHF micro-task and human work rail for HumanRail"
    },
    "instructions": [
        {
            "name": "claimRewards",
            "docs": ["Claim accumulated rewards for completed task responses."],
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
            "name": "closeTask",
            "docs": ["Close an existing task (creator only)."],
            "discriminator": [55, 234, 77, 69, 245, 208, 54, 167],
            "accounts": [
                { "name": "task", "writable": true },
                { "name": "vault", "writable": true },
                { "name": "rewardMint" },
                { "name": "creatorTokenAccount", "writable": true },
                { "name": "creator", "writable": true, "signer": true },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }
            ],
            "args": []
        },
        {
            "name": "createTask",
            "docs": ["Create a new task for human workers."],
            "discriminator": [194, 72, 143, 44, 0, 78, 200, 205],
            "accounts": [
                {
                    "name": "task",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [116, 97, 115, 107] },
                            { "kind": "account", "path": "creator" },
                            { "kind": "arg", "path": "params.nonce" }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [116, 97, 115, 107, 95, 118, 97, 117, 108, 116] },
                            { "kind": "account", "path": "task" }
                        ]
                    }
                },
                { "name": "rewardMint" },
                { "name": "creatorTokenAccount", "writable": true },
                { "name": "creator", "writable": true, "signer": true },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
                { "name": "systemProgram", "address": "11111111111111111111111111111111" }
            ],
            "args": [
                { "name": "params", "type": { "defined": { "name": "createTaskParams" } } }
            ]
        },
        {
            "name": "submitResponse",
            "docs": ["Submit a response to a task."],
            "discriminator": [206, 110, 114, 220, 150, 44, 142, 197],
            "accounts": [
                { "name": "task", "writable": true },
                {
                    "name": "response",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [114, 101, 115, 112, 111, 110, 115, 101] },
                            { "kind": "account", "path": "task" },
                            { "kind": "account", "path": "worker" }
                        ]
                    }
                },
                {
                    "name": "workerProfile",
                    "docs": ["Worker's human profile for verification"],
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [104, 117, 109, 97, 110, 95, 112, 114, 111, 102, 105, 108, 101] },
                            { "kind": "account", "path": "worker" }
                        ],
                        "program": { "kind": "account", "path": "humanRegistryProgram" }
                    }
                },
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
    "errors": [
        { "code": 6000, "name": "taskNotOpen", "msg": "Task is not open for responses" },
        { "code": 6001, "name": "taskClosed", "msg": "Task has been closed" },
        { "code": 6002, "name": "maxResponsesReached", "msg": "Task has reached maximum responses" },
        { "code": 6003, "name": "insufficientHumanScore", "msg": "Worker does not meet minimum human score requirement" },
        { "code": 6004, "name": "alreadyResponded", "msg": "Worker has already responded to this task" },
        { "code": 6005, "name": "budgetExhausted", "msg": "Task budget is exhausted" },
        { "code": 6006, "name": "invalidMint", "msg": "Invalid reward mint for this task" },
        { "code": 6007, "name": "unauthorizedCreator", "msg": "Only the task creator can perform this operation" },
        { "code": 6008, "name": "unauthorizedWorker", "msg": "Only the response worker can perform this operation" },
        { "code": 6009, "name": "rewardAlreadyClaimed", "msg": "Reward already claimed" },
        { "code": 6010, "name": "noRewardAvailable", "msg": "No reward available to claim" },
        { "code": 6011, "name": "metadataUriTooLong", "msg": "Metadata URI too long" },
        { "code": 6012, "name": "invalidTaskParams", "msg": "Invalid task parameters" },
        { "code": 6013, "name": "arithmeticOverflow", "msg": "Arithmetic overflow" },
        { "code": 6014, "name": "humanProfileNotFound", "msg": "Human profile not found for worker" },
        { "code": 6015, "name": "invalidChoice", "msg": "Invalid choice value" },
        { "code": 6016, "name": "taskResponseMismatch", "msg": "Task and response do not match" },
        { "code": 6017, "name": "invalidVault", "msg": "Invalid vault account for this task" }
    ],
    "types": [
        {
            "name": "createTaskParams",
            "docs": ["Parameters for creating a new task"],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "rewardPerResponse", "type": "u64" },
                    { "name": "totalBudget", "type": "u64" },
                    { "name": "humanRequirements", "type": "u16" },
                    { "name": "metadataUri", "type": "string" },
                    { "name": "maxResponses", "type": "u32" },
                    { "name": "allowMultipleResponses", "type": "bool" },
                    { "name": "nonce", "type": "u64" }
                ]
            }
        },
        {
            "name": "task",
            "docs": ["Task account for human work distribution"],
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
        },
        {
            "name": "taskResponse",
            "docs": ["Response record tracking a worker's submission"],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "task", "type": "pubkey" },
                    { "name": "worker", "type": "pubkey" },
                    { "name": "choice", "type": "u8" },
                    { "name": "responseData", "type": { "array": ["u8", 32] } },
                    { "name": "humanScoreAtSubmission", "type": "u16" },
                    { "name": "rewardAmount", "type": "u64" },
                    { "name": "isClaimed", "type": "bool" },
                    { "name": "submittedAt", "type": "i64" },
                    { "name": "claimedAt", "type": "i64" },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ]
};
//# sourceMappingURL=data_blink.js.map