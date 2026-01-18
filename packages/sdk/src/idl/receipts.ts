import { Idl } from '@coral-xyz/anchor';
export const IDL: Idl = 
{
  "address": "9CWJYBXCAiK7ygWTh8DAhLg8PycWonB7fRGSxWEPYAMp",
  "metadata": {
    "name": "receipts",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Unified action receipts for accountability and audit trails - HumanRail KYA"
  },
  "instructions": [
    {
      "name": "batch_emit",
      "docs": [
        "Batch emit multiple receipts in a single transaction.",
        "More efficient for high-throughput agent operations."
      ],
      "discriminator": [
        214,
        4,
        208,
        177,
        14,
        135,
        244,
        249
      ],
      "accounts": [
        {
          "name": "emitter",
          "docs": [
            "Emitter creating the batch"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "batch_summary",
          "docs": [
            "Batch summary account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "emitter"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "receipts",
          "type": {
            "vec": {
              "defined": {
                "name": "EmitReceiptParams"
              }
            }
          }
        },
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emit_receipt",
      "docs": [
        "Emit a receipt for an agent action.",
        "Creates an immutable, timestamped record of what happened."
      ],
      "discriminator": [
        68,
        22,
        81,
        246,
        107,
        232,
        233,
        9
      ],
      "accounts": [
        {
          "name": "emitter",
          "docs": [
            "Emitter - typically the agent or a program on behalf of agent"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agent_profile",
          "docs": [
            "C-07 FIX: Agent profile to verify emitter is authorized"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_profile.owner_principal",
                "account": "AgentProfile"
              },
              {
                "kind": "account",
                "path": "agent_profile.nonce",
                "account": "AgentProfile"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                175,
                59,
                202,
                150,
                96,
                179,
                175,
                101,
                170,
                83,
                104,
                77,
                195,
                65,
                63,
                113,
                211,
                171,
                110,
                183,
                14,
                233,
                254,
                211,
                162,
                255,
                132,
                80,
                123,
                244,
                81,
                172
              ]
            }
          }
        },
        {
          "name": "receipt",
          "docs": [
            "The receipt account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.agent_id"
              },
              {
                "kind": "arg",
                "path": "params.nonce"
              }
            ]
          }
        },
        {
          "name": "agent_index",
          "docs": [
            "Agent receipt index - tracks all receipts for an agent"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116,
                  95,
                  105,
                  110,
                  100,
                  101,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "params.agent_id"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "EmitReceiptParams"
            }
          }
        }
      ]
    },
    {
      "name": "verify_receipt",
      "docs": [
        "Query receipt by ID. Returns receipt data for verification.",
        "Designed for CPI calls from verifier programs."
      ],
      "discriminator": [
        202,
        144,
        21,
        149,
        181,
        189,
        23,
        170
      ],
      "accounts": [
        {
          "name": "receipt",
          "docs": [
            "The receipt to verify"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "ActionReceipt",
      "discriminator": [
        52,
        35,
        16,
        111,
        195,
        40,
        16,
        69
      ]
    },
    {
      "name": "AgentProfile",
      "discriminator": [
        60,
        227,
        42,
        24,
        0,
        87,
        86,
        205
      ]
    },
    {
      "name": "BatchReceiptSummary",
      "discriminator": [
        2,
        104,
        50,
        134,
        160,
        112,
        93,
        157
      ]
    },
    {
      "name": "ReceiptIndex",
      "discriminator": [
        165,
        2,
        159,
        159,
        120,
        108,
        171,
        94
      ]
    }
  ],
  "events": [
    {
      "name": "BatchEmitted",
      "discriminator": [
        187,
        216,
        46,
        64,
        253,
        131,
        137,
        4
      ]
    },
    {
      "name": "ReceiptEmitted",
      "discriminator": [
        14,
        151,
        82,
        185,
        87,
        185,
        15,
        150
      ]
    },
    {
      "name": "ReceiptVerified",
      "discriminator": [
        189,
        58,
        109,
        214,
        74,
        78,
        181,
        8
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidReceiptData",
      "msg": "Invalid receipt data"
    },
    {
      "code": 6001,
      "name": "ReceiptAlreadyExists",
      "msg": "Receipt already exists"
    },
    {
      "code": 6002,
      "name": "ReceiptNotFound",
      "msg": "Receipt not found"
    },
    {
      "code": 6003,
      "name": "UnauthorizedEmitter",
      "msg": "Unauthorized emitter"
    },
    {
      "code": 6004,
      "name": "AgentMismatch",
      "msg": "Agent ID does not match agent profile"
    },
    {
      "code": 6005,
      "name": "InvalidActionHash",
      "msg": "Invalid action hash"
    },
    {
      "code": 6006,
      "name": "InvalidResultHash",
      "msg": "Invalid result hash"
    },
    {
      "code": 6007,
      "name": "BatchTooLarge",
      "msg": "Batch too large"
    },
    {
      "code": 6008,
      "name": "InvalidMerkleProof",
      "msg": "Invalid merkle proof"
    },
    {
      "code": 6009,
      "name": "OffchainRefTooLong",
      "msg": "Offchain reference too long"
    },
    {
      "code": 6010,
      "name": "InvalidCapabilityRef",
      "msg": "Invalid capability reference"
    },
    {
      "code": 6011,
      "name": "InvalidAgentRef",
      "msg": "Invalid agent reference"
    },
    {
      "code": 6012,
      "name": "InvalidPrincipalRef",
      "msg": "Invalid principal reference"
    }
  ],
  "types": [
    {
      "name": "ActionReceipt",
      "docs": [
        "Action receipt - immutable record of agent action for accountability"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "principal_id",
            "docs": [
              "Principal who authorized the action"
            ],
            "type": "pubkey"
          },
          {
            "name": "agent_id",
            "docs": [
              "Agent who executed the action"
            ],
            "type": "pubkey"
          },
          {
            "name": "capability_id",
            "docs": [
              "Capability credential used for authorization"
            ],
            "type": "pubkey"
          },
          {
            "name": "action_hash",
            "docs": [
              "Hash of the action request (input)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "result_hash",
            "docs": [
              "Hash of the action result (output)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "action_type",
            "docs": [
              "Action type (program-specific encoding)"
            ],
            "type": "u8"
          },
          {
            "name": "value",
            "docs": [
              "Value transferred/affected"
            ],
            "type": "u64"
          },
          {
            "name": "destination",
            "docs": [
              "Destination of the action"
            ],
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp when action was executed"
            ],
            "type": "i64"
          },
          {
            "name": "slot",
            "docs": [
              "Solana slot when receipt was created"
            ],
            "type": "u64"
          },
          {
            "name": "block_hash",
            "docs": [
              "Block hash at time of creation (first 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "offchain_ref",
            "docs": [
              "Optional off-chain reference (IPFS hash, API endpoint, etc.)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "has_offchain_ref",
            "docs": [
              "Whether offchain reference is set"
            ],
            "type": "bool"
          },
          {
            "name": "sequence",
            "docs": [
              "Sequential receipt number for this agent"
            ],
            "type": "u64"
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce for PDA derivation"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "AgentProfile",
      "docs": [
        "Agent profile account - core identity for AI agents"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner_principal",
            "docs": [
              "Principal (owner) of this agent - must be a verified human or organization"
            ],
            "type": "pubkey"
          },
          {
            "name": "signing_key",
            "docs": [
              "Current signing key for the agent"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Human-readable name (32 bytes, null-padded)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "metadata_hash",
            "docs": [
              "Hash of agent metadata (code version, model/provider, policies)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "tee_measurement",
            "docs": [
              "Optional TEE measurement hash for hardware attestation"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "has_tee_measurement",
            "docs": [
              "Whether TEE measurement is set"
            ],
            "type": "bool"
          },
          {
            "name": "status",
            "docs": [
              "Current agent status"
            ],
            "type": {
              "defined": {
                "name": "AgentStatus"
              }
            }
          },
          {
            "name": "created_at",
            "docs": [
              "Timestamp when agent was registered"
            ],
            "type": "i64"
          },
          {
            "name": "last_status_change",
            "docs": [
              "Timestamp of last status change"
            ],
            "type": "i64"
          },
          {
            "name": "last_metadata_update",
            "docs": [
              "Timestamp of last metadata update"
            ],
            "type": "i64"
          },
          {
            "name": "capability_count",
            "docs": [
              "Total number of capabilities issued to this agent"
            ],
            "type": "u32"
          },
          {
            "name": "action_count",
            "docs": [
              "Total number of actions performed by this agent"
            ],
            "type": "u64"
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce used for PDA derivation"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "AgentStatus",
      "docs": [
        "Agent lifecycle status"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Suspended"
          },
          {
            "name": "Revoked"
          }
        ]
      }
    },
    {
      "name": "BatchEmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batch_summary",
            "type": "pubkey"
          },
          {
            "name": "emitter",
            "type": "pubkey"
          },
          {
            "name": "receipt_count",
            "type": "u32"
          },
          {
            "name": "merkle_root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "total_value",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "BatchReceiptSummary",
      "docs": [
        "Batch receipt summary - for high-throughput operations"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "emitter",
            "docs": [
              "Emitter who created the batch"
            ],
            "type": "pubkey"
          },
          {
            "name": "receipt_count",
            "docs": [
              "Number of receipts in batch"
            ],
            "type": "u32"
          },
          {
            "name": "merkle_root",
            "docs": [
              "Merkle root of all receipt hashes in batch"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "first_receipt",
            "docs": [
              "First receipt in batch"
            ],
            "type": "pubkey"
          },
          {
            "name": "last_receipt",
            "docs": [
              "Last receipt in batch"
            ],
            "type": "pubkey"
          },
          {
            "name": "created_at",
            "docs": [
              "Timestamp of batch creation"
            ],
            "type": "i64"
          },
          {
            "name": "total_value",
            "docs": [
              "Total value in batch"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "EmitReceiptParams",
      "docs": [
        "Parameters for emitting a receipt"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "principal_id",
            "docs": [
              "Principal ID (human who authorized)"
            ],
            "type": "pubkey"
          },
          {
            "name": "agent_id",
            "docs": [
              "Agent ID (AI that executed)"
            ],
            "type": "pubkey"
          },
          {
            "name": "capability_id",
            "docs": [
              "Capability ID that was used"
            ],
            "type": "pubkey"
          },
          {
            "name": "action_hash",
            "docs": [
              "Hash of the action request"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "result_hash",
            "docs": [
              "Hash of the action result"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "action_type",
            "docs": [
              "Action type (program-specific encoding)"
            ],
            "type": "u8"
          },
          {
            "name": "value",
            "docs": [
              "Value transferred/affected"
            ],
            "type": "u64"
          },
          {
            "name": "destination",
            "docs": [
              "Destination of the action"
            ],
            "type": "pubkey"
          },
          {
            "name": "offchain_ref",
            "docs": [
              "Optional off-chain reference URI"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Unique nonce for PDA derivation"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ReceiptEmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receipt",
            "type": "pubkey"
          },
          {
            "name": "principal_id",
            "type": "pubkey"
          },
          {
            "name": "agent_id",
            "type": "pubkey"
          },
          {
            "name": "capability_id",
            "type": "pubkey"
          },
          {
            "name": "action_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "result_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "action_type",
            "type": "u8"
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "destination",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "sequence",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ReceiptIndex",
      "docs": [
        "Receipt index - for efficient lookups by agent or principal"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entity",
            "docs": [
              "The entity this index belongs to (agent or principal)"
            ],
            "type": "pubkey"
          },
          {
            "name": "entity_type",
            "docs": [
              "Type of entity (0 = agent, 1 = principal)"
            ],
            "type": "u8"
          },
          {
            "name": "receipt_count",
            "docs": [
              "Total number of receipts"
            ],
            "type": "u64"
          },
          {
            "name": "latest_receipt",
            "docs": [
              "Most recent receipt"
            ],
            "type": "pubkey"
          },
          {
            "name": "latest_timestamp",
            "docs": [
              "Timestamp of latest receipt"
            ],
            "type": "i64"
          },
          {
            "name": "total_value",
            "docs": [
              "Total value transacted"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ReceiptVerified",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receipt",
            "type": "pubkey"
          },
          {
            "name": "principal_id",
            "type": "pubkey"
          },
          {
            "name": "agent_id",
            "type": "pubkey"
          },
          {
            "name": "capability_id",
            "type": "pubkey"
          },
          {
            "name": "action_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "result_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
}