import { Idl } from '@coral-xyz/anchor';
export const IDL: Idl = 
{
  "address": "3m16nfFpUtcCgjFWon3qTuttpTpNu6bnYde5yeXbC1ZF",
  "metadata": {
    "name": "delegation",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Capability-based delegation for agents with onchain enforcement - HumanRail KYA"
  },
  "instructions": [
    {
      "name": "emergency_freeze",
      "docs": [
        "Emergency freeze all capabilities for an agent. Principal-initiated."
      ],
      "discriminator": [
        179,
        69,
        168,
        100,
        173,
        7,
        136,
        112
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal initiating the freeze - must sign and own the capability"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "capability",
          "docs": [
            "Capability proving principal→agent relationship",
            "BOTH constraints required to prevent fake capability attack"
          ]
        },
        {
          "name": "agent",
          "docs": [
            "The agent to freeze - must match capability.agent"
          ]
        },
        {
          "name": "freeze_record",
          "docs": [
            "Freeze record PDA - principal-specific to prevent DoS",
            "Seeds: [b\"freeze\", principal, agent] prevents global namespace collision"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  114,
                  101,
                  101,
                  122,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "principal"
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "flag_dispute",
      "docs": [
        "Flag a capability for dispute review."
      ],
      "discriminator": [
        150,
        222,
        78,
        72,
        117,
        140,
        2,
        75
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal flagging the dispute - must sign"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "capability",
          "docs": [
            "The capability to flag"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "reason",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "issue_capability",
      "docs": [
        "Issue a capability credential to an agent.",
        "Principal defines scope, limits, time constraints, and allowlists."
      ],
      "discriminator": [
        191,
        205,
        139,
        120,
        12,
        205,
        58,
        77
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal issuing the capability - must sign"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agent",
          "docs": [
            "Agent receiving the capability"
          ]
        },
        {
          "name": "capability",
          "docs": [
            "The new capability credential PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  97,
                  98,
                  105,
                  108,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "principal"
              },
              {
                "kind": "account",
                "path": "agent"
              },
              {
                "kind": "arg",
                "path": "params.nonce"
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
              "name": "IssueCapabilityParams"
            }
          }
        }
      ]
    },
    {
      "name": "record_usage",
      "docs": [
        "Record capability usage after successful action.",
        "Updates spend tracking and cooldowns."
      ],
      "discriminator": [
        185,
        5,
        42,
        72,
        185,
        187,
        202,
        147
      ],
      "accounts": [
        {
          "name": "capability",
          "docs": [
            "The capability being used"
          ],
          "writable": true
        },
        {
          "name": "agent",
          "docs": [
            "Agent using the capability - must sign"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "usage_record",
          "docs": [
            "Usage record for audit trail"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capability"
              },
              {
                "kind": "account",
                "path": "capability.use_count.saturating_add(1)",
                "account": "Capability"
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
          "name": "amount_used",
          "type": "u64"
        }
      ]
    },
    {
      "name": "record_usage_cpi",
      "docs": [
        "Record capability usage via CPI from authorized programs.",
        "Validates agent_signer matches agent_profile.signing_key."
      ],
      "discriminator": [
        123,
        46,
        78,
        236,
        125,
        140,
        188,
        57
      ],
      "accounts": [
        {
          "name": "capability",
          "docs": [
            "The capability being used"
          ],
          "writable": true
        },
        {
          "name": "agent_signer",
          "docs": [
            "Agent's signing key - must sign (propagates through CPI)"
          ],
          "signer": true
        },
        {
          "name": "agent_profile",
          "docs": [
            "Agent profile account - validates agent_signer is authorized"
          ]
        },
        {
          "name": "freeze_record",
          "docs": [
            "Freeze record - optional, checked if agent is frozen"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  114,
                  101,
                  101,
                  122,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capability.principal",
                "account": "Capability"
              },
              {
                "kind": "account",
                "path": "capability.agent",
                "account": "Capability"
              }
            ]
          }
        },
        {
          "name": "usage_record",
          "docs": [
            "Usage record for audit trail"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capability"
              },
              {
                "kind": "account",
                "path": "capability.use_count.saturating_add(1)",
                "account": "Capability"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Payer for usage record rent"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agent_registry_program",
          "docs": [
            "Agent registry program for ownership validation"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount_used",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resolve_dispute",
      "docs": [
        "Resolve a dispute flag. Principal-initiated."
      ],
      "discriminator": [
        231,
        6,
        202,
        6,
        96,
        103,
        12,
        230
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal resolving the dispute - must sign"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "capability",
          "docs": [
            "The capability under dispute"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "resolution",
          "type": {
            "defined": {
              "name": "DisputeResolution"
            }
          }
        }
      ]
    },
    {
      "name": "revoke_capability",
      "docs": [
        "Revoke a specific capability. Principal-initiated."
      ],
      "discriminator": [
        26,
        112,
        110,
        143,
        126,
        19,
        23,
        73
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal who issued the capability - must sign"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "capability",
          "docs": [
            "The capability to revoke"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  97,
                  98,
                  105,
                  108,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "principal"
              },
              {
                "kind": "account",
                "path": "capability.agent",
                "account": "Capability"
              },
              {
                "kind": "account",
                "path": "capability.nonce",
                "account": "Capability"
              }
            ]
          }
        },
        {
          "name": "revocation_entry",
          "docs": [
            "Revocation entry for audit trail"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  111,
                  99,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "capability"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unfreeze",
      "docs": [
        "Unfreeze capabilities after emergency freeze. Principal-initiated."
      ],
      "discriminator": [
        133,
        160,
        68,
        253,
        80,
        232,
        218,
        247
      ],
      "accounts": [
        {
          "name": "principal",
          "docs": [
            "Principal who initiated the freeze - must sign and own the capability"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "capability",
          "docs": [
            "Capability proving principal→agent relationship"
          ]
        },
        {
          "name": "agent",
          "docs": [
            "The agent to unfreeze - must match capability.agent"
          ]
        },
        {
          "name": "freeze_record",
          "docs": [
            "Freeze record to update - principal-specific",
            "Seeds: [b\"freeze\", principal, agent]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  114,
                  101,
                  101,
                  122,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "principal"
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "validate_capability",
      "docs": [
        "Validate a capability before action execution.",
        "Designed for CPI calls from other programs.",
        "Returns error if capability is invalid, revoked, expired, or limits exceeded."
      ],
      "discriminator": [
        12,
        14,
        22,
        72,
        240,
        74,
        51,
        84
      ],
      "accounts": [
        {
          "name": "capability",
          "docs": [
            "The capability to validate"
          ]
        },
        {
          "name": "freeze_record",
          "docs": [
            "Freeze record - principal-specific PDA",
            "Seeds: [b\"freeze\", principal, agent]"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  114,
                  101,
                  101,
                  122,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capability.principal",
                "account": "Capability"
              },
              {
                "kind": "account",
                "path": "capability.agent",
                "account": "Capability"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "action_type",
          "type": "u8"
        },
        {
          "name": "action_value",
          "type": "u64"
        },
        {
          "name": "destination",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Capability",
      "discriminator": [
        192,
        140,
        41,
        92,
        236,
        64,
        181,
        99
      ]
    },
    {
      "name": "EmergencyFreezeRecord",
      "discriminator": [
        148,
        187,
        2,
        194,
        255,
        169,
        41,
        5
      ]
    },
    {
      "name": "RevocationEntry",
      "discriminator": [
        64,
        238,
        133,
        108,
        230,
        6,
        181,
        154
      ]
    },
    {
      "name": "UsageRecord",
      "discriminator": [
        161,
        164,
        29,
        61,
        69,
        13,
        70,
        189
      ]
    }
  ],
  "events": [
    {
      "name": "AgentFrozen",
      "discriminator": [
        49,
        38,
        208,
        185,
        219,
        3,
        92,
        27
      ]
    },
    {
      "name": "AgentUnfrozen",
      "discriminator": [
        209,
        209,
        139,
        83,
        146,
        43,
        100,
        252
      ]
    },
    {
      "name": "CapabilityDisputed",
      "discriminator": [
        20,
        73,
        108,
        90,
        136,
        215,
        149,
        178
      ]
    },
    {
      "name": "CapabilityIssued",
      "discriminator": [
        199,
        150,
        145,
        174,
        36,
        46,
        88,
        117
      ]
    },
    {
      "name": "CapabilityRevoked",
      "discriminator": [
        83,
        213,
        58,
        135,
        225,
        22,
        5,
        14
      ]
    },
    {
      "name": "CapabilityUsed",
      "discriminator": [
        40,
        26,
        240,
        252,
        139,
        7,
        181,
        241
      ]
    },
    {
      "name": "CapabilityUsedCpi",
      "discriminator": [
        172,
        131,
        148,
        62,
        61,
        104,
        69,
        65
      ]
    },
    {
      "name": "CapabilityValidated",
      "discriminator": [
        38,
        9,
        62,
        15,
        123,
        228,
        119,
        27
      ]
    },
    {
      "name": "DisputeResolved",
      "discriminator": [
        121,
        64,
        249,
        153,
        139,
        128,
        236,
        187
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CapabilityNotActive",
      "msg": "Capability is not active"
    },
    {
      "code": 6001,
      "name": "CapabilityRevoked",
      "msg": "Capability has been revoked"
    },
    {
      "code": 6002,
      "name": "CapabilityExpired",
      "msg": "Capability has expired"
    },
    {
      "code": 6003,
      "name": "CapabilityFrozen",
      "msg": "Capability is frozen"
    },
    {
      "code": 6004,
      "name": "CapabilityDisputed",
      "msg": "Capability is under dispute"
    },
    {
      "code": 6005,
      "name": "CapabilityNotYetValid",
      "msg": "Capability not yet valid"
    },
    {
      "code": 6006,
      "name": "PerTxLimitExceeded",
      "msg": "Per-transaction limit exceeded"
    },
    {
      "code": 6007,
      "name": "DailyLimitExceeded",
      "msg": "Daily spending limit exceeded"
    },
    {
      "code": 6008,
      "name": "TotalLimitExceeded",
      "msg": "Total lifetime limit exceeded"
    },
    {
      "code": 6009,
      "name": "CooldownNotElapsed",
      "msg": "Cooldown period not elapsed"
    },
    {
      "code": 6010,
      "name": "DestinationNotAllowed",
      "msg": "Destination not in allowlist"
    },
    {
      "code": 6011,
      "name": "ProgramNotAllowed",
      "msg": "Program not allowed by capability"
    },
    {
      "code": 6012,
      "name": "AssetNotAllowed",
      "msg": "Asset type not allowed by capability"
    },
    {
      "code": 6013,
      "name": "SlippageExceeded",
      "msg": "Slippage exceeds maximum allowed"
    },
    {
      "code": 6014,
      "name": "FeeExceeded",
      "msg": "Fee exceeds maximum allowed"
    },
    {
      "code": 6015,
      "name": "Unauthorized",
      "msg": "Unauthorized: caller is not the principal"
    },
    {
      "code": 6016,
      "name": "AgentMismatch",
      "msg": "Agent is not owner of this capability"
    },
    {
      "code": 6017,
      "name": "InvalidExpiry",
      "msg": "Invalid expiry time"
    },
    {
      "code": 6018,
      "name": "InvalidLimits",
      "msg": "Invalid limits configuration"
    },
    {
      "code": 6019,
      "name": "TooManyDestinations",
      "msg": "Too many destinations in allowlist"
    },
    {
      "code": 6020,
      "name": "AgentFrozen",
      "msg": "Agent is frozen - all capabilities suspended"
    },
    {
      "code": 6021,
      "name": "AgentNotFrozen",
      "msg": "Agent is not frozen"
    },
    {
      "code": 6022,
      "name": "AlreadyDisputed",
      "msg": "Capability already disputed"
    },
    {
      "code": 6023,
      "name": "NotDisputed",
      "msg": "Capability not disputed"
    },
    {
      "code": 6024,
      "name": "RiskTierExceeded",
      "msg": "Risk tier too high for this operation"
    },
    {
      "code": 6025,
      "name": "InvalidAgentProfile",
      "msg": "Invalid agent profile account"
    },
    {
      "code": 6026,
      "name": "InvalidProgram",
      "msg": "Invalid program account"
    },
    {
      "code": 6027,
      "name": "AgentSignerMismatch",
      "msg": "Agent signer does not match profile signing key"
    }
  ],
  "types": [
    {
      "name": "AgentFrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "frozen_by",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "AgentUnfrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "unfrozen_by",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "Capability",
      "docs": [
        "Capability credential - the core KYA primitive"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "principal",
            "docs": [
              "Principal who issued this capability"
            ],
            "type": "pubkey"
          },
          {
            "name": "agent",
            "docs": [
              "Agent this capability is issued to"
            ],
            "type": "pubkey"
          },
          {
            "name": "allowed_programs",
            "docs": [
              "Allowed programs (bitmask)"
            ],
            "type": "u64"
          },
          {
            "name": "allowed_assets",
            "docs": [
              "Allowed asset types (bitmask)"
            ],
            "type": "u64"
          },
          {
            "name": "per_tx_limit",
            "docs": [
              "Per-transaction value limit"
            ],
            "type": "u64"
          },
          {
            "name": "daily_limit",
            "docs": [
              "Daily spending limit"
            ],
            "type": "u64"
          },
          {
            "name": "total_limit",
            "docs": [
              "Total lifetime limit"
            ],
            "type": "u64"
          },
          {
            "name": "max_slippage_bps",
            "docs": [
              "Maximum slippage (basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "max_fee",
            "docs": [
              "Maximum fee per transaction"
            ],
            "type": "u64"
          },
          {
            "name": "valid_from",
            "docs": [
              "Capability validity start time"
            ],
            "type": "i64"
          },
          {
            "name": "expires_at",
            "docs": [
              "Capability expiry time"
            ],
            "type": "i64"
          },
          {
            "name": "cooldown_seconds",
            "docs": [
              "Cooldown between uses (seconds)"
            ],
            "type": "u32"
          },
          {
            "name": "risk_tier",
            "docs": [
              "Risk tier required"
            ],
            "type": "u8"
          },
          {
            "name": "status",
            "docs": [
              "Current status"
            ],
            "type": {
              "defined": {
                "name": "CapabilityStatus"
              }
            }
          },
          {
            "name": "issued_at",
            "docs": [
              "Timestamp when issued"
            ],
            "type": "i64"
          },
          {
            "name": "last_used_at",
            "docs": [
              "Timestamp of last use"
            ],
            "type": "i64"
          },
          {
            "name": "daily_spent",
            "docs": [
              "Amount spent today (resets daily)"
            ],
            "type": "u64"
          },
          {
            "name": "current_day",
            "docs": [
              "Day number for daily reset tracking"
            ],
            "type": "u32"
          },
          {
            "name": "total_spent",
            "docs": [
              "Total amount spent lifetime"
            ],
            "type": "u64"
          },
          {
            "name": "use_count",
            "docs": [
              "Total number of uses"
            ],
            "type": "u64"
          },
          {
            "name": "enforce_allowlist",
            "docs": [
              "Whether destination allowlist is enforced"
            ],
            "type": "bool"
          },
          {
            "name": "allowlist_count",
            "docs": [
              "Number of destinations in allowlist"
            ],
            "type": "u8"
          },
          {
            "name": "destination_allowlist",
            "docs": [
              "Destination allowlist (fixed size array)"
            ],
            "type": {
              "array": [
                "pubkey",
                10
              ]
            }
          },
          {
            "name": "dispute_reason",
            "docs": [
              "Dispute reason hash (if disputed)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
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
      "name": "CapabilityDisputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "flagged_by",
            "type": "pubkey"
          },
          {
            "name": "reason",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "CapabilityIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "allowed_programs",
            "type": "u64"
          },
          {
            "name": "per_tx_limit",
            "type": "u64"
          },
          {
            "name": "daily_limit",
            "type": "u64"
          },
          {
            "name": "total_limit",
            "type": "u64"
          },
          {
            "name": "valid_from",
            "type": "i64"
          },
          {
            "name": "expires_at",
            "type": "i64"
          },
          {
            "name": "nonce",
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
      "name": "CapabilityRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "revoked_by",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "CapabilityStatus",
      "docs": [
        "Capability status"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Revoked"
          },
          {
            "name": "Expired"
          },
          {
            "name": "Frozen"
          },
          {
            "name": "Disputed"
          }
        ]
      }
    },
    {
      "name": "CapabilityUsed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "daily_spent",
            "type": "u64"
          },
          {
            "name": "total_spent",
            "type": "u64"
          },
          {
            "name": "use_count",
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
      "name": "CapabilityUsedCpi",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "daily_spent",
            "type": "u64"
          },
          {
            "name": "total_spent",
            "type": "u64"
          },
          {
            "name": "use_count",
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
      "name": "CapabilityValidated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "validation_passed",
            "type": "bool"
          },
          {
            "name": "error_code",
            "type": "u8"
          },
          {
            "name": "context_flags",
            "type": "u64"
          },
          {
            "name": "amount_requested",
            "type": "u64"
          },
          {
            "name": "program_scope_requested",
            "type": "u64"
          },
          {
            "name": "remaining_daily",
            "type": "u64"
          },
          {
            "name": "remaining_total",
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
      "name": "DisputeResolution",
      "docs": [
        "Dispute resolution options"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Cleared"
          },
          {
            "name": "Revoked"
          },
          {
            "name": "Modified"
          }
        ]
      }
    },
    {
      "name": "DisputeResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "resolution",
            "type": {
              "defined": {
                "name": "DisputeResolution"
              }
            }
          },
          {
            "name": "new_status",
            "type": {
              "defined": {
                "name": "CapabilityStatus"
              }
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "EmergencyFreezeRecord",
      "docs": [
        "Emergency freeze record - for tracking frozen agents"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "Agent that is frozen"
            ],
            "type": "pubkey"
          },
          {
            "name": "frozen_by",
            "docs": [
              "Principal who initiated freeze"
            ],
            "type": "pubkey"
          },
          {
            "name": "frozen_at",
            "docs": [
              "Timestamp of freeze"
            ],
            "type": "i64"
          },
          {
            "name": "is_active",
            "docs": [
              "Whether freeze is still active"
            ],
            "type": "bool"
          },
          {
            "name": "unfrozen_at",
            "docs": [
              "Timestamp of unfreeze (0 if still frozen)"
            ],
            "type": "i64"
          },
          {
            "name": "reason_hash",
            "docs": [
              "Reason for freeze (hash)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
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
      "name": "IssueCapabilityParams",
      "docs": [
        "Parameters for issuing a capability credential"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "allowed_programs",
            "docs": [
              "Scope: which programs this capability allows (bitmask)"
            ],
            "type": "u64"
          },
          {
            "name": "allowed_assets",
            "docs": [
              "Scope: which asset types are allowed (bitmask)"
            ],
            "type": "u64"
          },
          {
            "name": "per_tx_limit",
            "docs": [
              "Per-transaction value limit (in lamports or token base units)"
            ],
            "type": "u64"
          },
          {
            "name": "daily_limit",
            "docs": [
              "Daily spending limit"
            ],
            "type": "u64"
          },
          {
            "name": "total_limit",
            "docs": [
              "Total lifetime limit for this capability"
            ],
            "type": "u64"
          },
          {
            "name": "max_slippage_bps",
            "docs": [
              "Maximum slippage allowed (basis points, 0-10000)"
            ],
            "type": "u16"
          },
          {
            "name": "max_fee",
            "docs": [
              "Maximum fee allowed per transaction (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "valid_from",
            "docs": [
              "Capability validity start time"
            ],
            "type": "i64"
          },
          {
            "name": "expires_at",
            "docs": [
              "Capability expiry time"
            ],
            "type": "i64"
          },
          {
            "name": "cooldown_seconds",
            "docs": [
              "Cooldown between uses (seconds)"
            ],
            "type": "u32"
          },
          {
            "name": "destination_allowlist",
            "docs": [
              "Destination allowlist (empty = any destination allowed)"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "risk_tier",
            "docs": [
              "Risk tier required (0-255, higher = more restricted)"
            ],
            "type": "u8"
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
      "name": "RevocationEntry",
      "docs": [
        "Revocation registry entry - for tracking revoked capabilities"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "docs": [
              "The capability that was revoked"
            ],
            "type": "pubkey"
          },
          {
            "name": "revoked_by",
            "docs": [
              "Principal who revoked"
            ],
            "type": "pubkey"
          },
          {
            "name": "revoked_at",
            "docs": [
              "Timestamp of revocation"
            ],
            "type": "i64"
          },
          {
            "name": "reason_hash",
            "docs": [
              "Reason for revocation (hash)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
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
      "name": "UsageRecord",
      "docs": [
        "Usage record - for tracking capability usage"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capability",
            "docs": [
              "The capability used"
            ],
            "type": "pubkey"
          },
          {
            "name": "agent",
            "docs": [
              "Agent that used the capability"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount used in this transaction"
            ],
            "type": "u64"
          },
          {
            "name": "action_type",
            "docs": [
              "Action type (program-specific encoding)"
            ],
            "type": "u8"
          },
          {
            "name": "destination",
            "docs": [
              "Destination of the action"
            ],
            "type": "pubkey"
          },
          {
            "name": "used_at",
            "docs": [
              "Timestamp of use"
            ],
            "type": "i64"
          },
          {
            "name": "tx_signature",
            "docs": [
              "Transaction signature (first 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "sequence",
            "docs": [
              "Sequence number for this capability"
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
    }
  ]
}