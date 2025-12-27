/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/data_blink.json`.
 */
export type DataBlink = {
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
      "docs": [
        "Claim accumulated rewards for completed task responses."
      ],
      "discriminator": [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      "accounts": [
        {
          "name": "task"
        },
        {
          "name": "response",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "workerTokenAccount",
          "writable": true
        },
        {
          "name": "worker",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "closeTask",
      "docs": [
        "Close an existing task (creator only).",
        "Returns remaining budget to creator."
      ],
      "discriminator": [
        55,
        234,
        77,
        69,
        245,
        208,
        54,
        167
      ],
      "accounts": [
        {
          "name": "task",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "createTask",
      "docs": [
        "Create a new task for human workers.",
        "Creator funds an escrow vault with the total reward budget."
      ],
      "discriminator": [
        194,
        80,
        6,
        180,
        232,
        127,
        48,
        171
      ],
      "accounts": [
        {
          "name": "task",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "params.nonce"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  115,
                  107,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "task"
              }
            ]
          }
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createTaskParams"
            }
          }
        }
      ]
    },
    {
      "name": "submitResponse",
      "docs": [
        "Submit a response to a task.",
        "Validates human requirements and prevents double responses."
      ],
      "discriminator": [
        85,
        190,
        208,
        119,
        243,
        52,
        133,
        90
      ],
      "accounts": [
        {
          "name": "task",
          "writable": true
        },
        {
          "name": "response",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  112,
                  111,
                  110,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "task"
              },
              {
                "kind": "account",
                "path": "worker"
              }
            ]
          }
        },
        {
          "name": "workerProfile",
          "docs": [
            "Worker's human profile for verification"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  117,
                  109,
                  97,
                  110,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              }
            ],
            "program": {
              "kind": "account",
              "path": "humanRegistryProgram"
            }
          }
        },
        {
          "name": "worker",
          "writable": true,
          "signer": true
        },
        {
          "name": "humanRegistryProgram",
          "address": "Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "choice",
          "type": "u8"
        },
        {
          "name": "responseData",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "humanProfile",
      "discriminator": [
        32,
        133,
        87,
        162,
        100,
        194,
        215,
        212
      ]
    },
    {
      "name": "task",
      "discriminator": [
        79,
        34,
        229,
        55,
        88,
        90,
        55,
        84
      ]
    },
    {
      "name": "taskResponse",
      "discriminator": [
        15,
        27,
        78,
        96,
        131,
        56,
        101,
        227
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "taskNotOpen",
      "msg": "Task is not open for responses"
    },
    {
      "code": 6001,
      "name": "taskClosed",
      "msg": "Task has been closed"
    },
    {
      "code": 6002,
      "name": "maxResponsesReached",
      "msg": "Task has reached maximum responses"
    },
    {
      "code": 6003,
      "name": "insufficientHumanScore",
      "msg": "Worker does not meet minimum human score requirement"
    },
    {
      "code": 6004,
      "name": "alreadyResponded",
      "msg": "Worker has already responded to this task"
    },
    {
      "code": 6005,
      "name": "budgetExhausted",
      "msg": "Task budget is exhausted"
    },
    {
      "code": 6006,
      "name": "invalidMint",
      "msg": "Invalid reward mint for this task"
    },
    {
      "code": 6007,
      "name": "unauthorizedCreator",
      "msg": "Only the task creator can perform this operation"
    },
    {
      "code": 6008,
      "name": "unauthorizedWorker",
      "msg": "Only the response worker can perform this operation"
    },
    {
      "code": 6009,
      "name": "rewardAlreadyClaimed",
      "msg": "Reward already claimed"
    },
    {
      "code": 6010,
      "name": "noRewardAvailable",
      "msg": "No reward available to claim"
    },
    {
      "code": 6011,
      "name": "metadataUriTooLong",
      "msg": "Metadata URI too long"
    },
    {
      "code": 6012,
      "name": "invalidTaskParams",
      "msg": "Invalid task parameters"
    },
    {
      "code": 6013,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6014,
      "name": "humanProfileNotFound",
      "msg": "Human profile not found for worker"
    },
    {
      "code": 6015,
      "name": "invalidChoice",
      "msg": "Invalid choice value"
    }
  ],
  "types": [
    {
      "name": "attestationRef",
      "docs": [
        "Lightweight reference to an external attestation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "source",
            "docs": [
              "Identity / KYC / PoP provider or other attestation source."
            ],
            "type": "pubkey"
          },
          {
            "name": "payloadHash",
            "docs": [
              "Hash of the attestation payload (off-chain details)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "weight",
            "docs": [
              "Weight contributed by this attestation to the human_score."
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "createTaskParams",
      "docs": [
        "Parameters for creating a new task"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardPerResponse",
            "docs": [
              "Reward per valid response in token base units"
            ],
            "type": "u64"
          },
          {
            "name": "totalBudget",
            "docs": [
              "Total budget for this task"
            ],
            "type": "u64"
          },
          {
            "name": "humanRequirements",
            "docs": [
              "Minimum human score required (0-10000)"
            ],
            "type": "u16"
          },
          {
            "name": "metadataUri",
            "docs": [
              "URI pointing to task metadata JSON"
            ],
            "type": "string"
          },
          {
            "name": "maxResponses",
            "docs": [
              "Maximum responses allowed (0 for unlimited)"
            ],
            "type": "u32"
          },
          {
            "name": "allowMultipleResponses",
            "docs": [
              "Whether to allow multiple responses per wallet"
            ],
            "type": "bool"
          },
          {
            "name": "nonce",
            "docs": [
              "Unique nonce for PDA derivation (e.g., timestamp or counter)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "humanProfile",
      "docs": [
        "HumanProfile stores per-wallet identity score and attestations."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "docs": [
              "The wallet this profile belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "humanScore",
            "docs": [
              "Aggregated identity score from all attestations."
            ],
            "type": "u16"
          },
          {
            "name": "isUnique",
            "docs": [
              "Flag indicating whether this profile is considered \"unique\"."
            ],
            "type": "bool"
          },
          {
            "name": "attestationCount",
            "docs": [
              "Total number of attestations registered (for easy demo)."
            ],
            "type": "u32"
          },
          {
            "name": "lastAttestationAt",
            "docs": [
              "Timestamp of last attestation (for easy demo)."
            ],
            "type": "i64"
          },
          {
            "name": "lastAttestationHash",
            "docs": [
              "Hash of last attestation payload (for easy demo)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "attestations",
            "docs": [
              "Bounded list of attestations attached to this profile."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "attestationRef"
                }
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump for the profile account."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "task",
      "docs": [
        "Task account for human work distribution"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "docs": [
              "Creator who funded and manages the task"
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardMint",
            "docs": [
              "Token mint for rewards"
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardPerResponse",
            "docs": [
              "Reward per valid response in token base units"
            ],
            "type": "u64"
          },
          {
            "name": "totalBudget",
            "docs": [
              "Total budget allocated for this task"
            ],
            "type": "u64"
          },
          {
            "name": "consumedBudget",
            "docs": [
              "Budget consumed by responses"
            ],
            "type": "u64"
          },
          {
            "name": "humanRequirements",
            "docs": [
              "Minimum human score required (0-10000)"
            ],
            "type": "u16"
          },
          {
            "name": "metadataUri",
            "docs": [
              "URI pointing to task metadata JSON"
            ],
            "type": "string"
          },
          {
            "name": "isOpen",
            "docs": [
              "Whether the task is open for responses"
            ],
            "type": "bool"
          },
          {
            "name": "responseCount",
            "docs": [
              "Total number of responses submitted"
            ],
            "type": "u32"
          },
          {
            "name": "maxResponses",
            "docs": [
              "Maximum responses allowed (0 for unlimited)"
            ],
            "type": "u32"
          },
          {
            "name": "allowMultipleResponses",
            "docs": [
              "Whether multiple responses per wallet are allowed"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when task was created"
            ],
            "type": "i64"
          },
          {
            "name": "closedAt",
            "docs": [
              "Timestamp when task was closed (0 if open)"
            ],
            "type": "i64"
          },
          {
            "name": "vault",
            "docs": [
              "Escrow vault holding reward funds"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for task PDA"
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Bump seed for vault PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "taskResponse",
      "docs": [
        "Response record tracking a worker's submission"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "task",
            "docs": [
              "The task this response belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "worker",
            "docs": [
              "Worker who submitted the response"
            ],
            "type": "pubkey"
          },
          {
            "name": "choice",
            "docs": [
              "Choice made (task-specific encoding)"
            ],
            "type": "u8"
          },
          {
            "name": "responseData",
            "docs": [
              "Additional response data (hash or encoded value)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "humanScoreAtSubmission",
            "docs": [
              "Human score of worker at time of submission"
            ],
            "type": "u16"
          },
          {
            "name": "rewardAmount",
            "docs": [
              "Reward amount earned"
            ],
            "type": "u64"
          },
          {
            "name": "isClaimed",
            "docs": [
              "Whether reward has been claimed"
            ],
            "type": "bool"
          },
          {
            "name": "submittedAt",
            "docs": [
              "Timestamp of submission"
            ],
            "type": "i64"
          },
          {
            "name": "claimedAt",
            "docs": [
              "Timestamp of claim (0 if unclaimed)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
