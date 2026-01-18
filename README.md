# HumanRail Protocol

**Know Your Agent (KYA) - Human-First AI Identity Infrastructure on Solana**

## Overview

HumanRail is a comprehensive Solana-based protocol that establishes trust, accountability, and transparency for AI agents operating onchain. It answers the fundamental question: *"Who authorized this AI, and what can it do?"*

## Architecture

The protocol consists of 8 interconnected programs:

### Core Identity Layer
| Program | Description | Status |
|---------|-------------|--------|
| `human_registry` | Human identity verification with attestations and proof-of-personhood | ✅ Compiles |
| `agent_registry` | AI agent registration with lifecycle management | ✅ Compiles |
| `delegation` | Capability-based permission system for agents | ✅ Compiles |

### Application Rails
| Program | Description | Status |
|---------|-------------|--------|
| `human_pay` | Payment and invoice rail with human verification | ✅ Compiles |
| `data_blink` | RLHF micro-task platform for human work | ✅ Compiles |
| `document_registry` | Document signing with verified human/agent signatures | ✅ Compiles |

### Infrastructure
| Program | Description | Status |
|---------|-------------|--------|
| `receipts` | Unified audit trail for all agent actions | ✅ Compiles |
| `humanrail-common` | Shared types and CPI interfaces | ✅ Compiles |

## Program IDs (Devnet)

```
human_registry:    Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR
human_pay:         6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe
data_blink:        BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5
agent_registry:    299gbw6p9rCpp7SBR9tts7qTgGie591JPY6RMAXoJHE6
delegation:        74vfEGbYWUsRq7z8oSgp6gNxx3ENVQEBqXFJqHrB3Xx2
receipts:          9ZKqiKqi3zXhNvTevEJ8qD6F25YdoymXXSTzsiEviAi
document_registry: ERdbeXCpPoXsZmgpw5ALa14ujxnUhb7vVSpkmhQ9cY33
```

## Key Features

### 1. Human Identity Registry
- Aggregated human_score from multiple attestation sources
- Support for KYC providers, Proof-of-Personhood (WorldID, BrightID), social verification
- Signed attestations with Ed25519 verification
- Issuer registry with trust anchors

### 2. Agent Registry
- Principal-owned AI agent registration
- Signing key management with rotation and grace periods
- TEE measurement support for hardware attestation
- Agent lifecycle: Active → Suspended → Revoked

### 3. Capability Delegation (KYA Core)
- Fine-grained permission system
- Program scope bitmasks (which programs agent can call)
- Asset scope bitmasks (which tokens agent can use)
- Spending limits: per-tx, daily, total lifetime
- Time bounds: valid_from, expires_at
- Destination allowlists
- Emergency freeze mechanism

### 4. Accountability & Receipts
- Every agent action produces an immutable receipt
- Merkle roots for batch verification
- Full audit trail for compliance

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Human Profile  │────▶│  Agent Profile  │────▶│   Capability    │
│  (Attestations) │     │  (Signing Key)  │     │  (Permissions)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Application Rails                         │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ HumanPay │  │  DataBlink   │  │  Document Registry      │   │
│  │ Payments │  │  RLHF Tasks  │  │  Verified Signatures    │   │
│  └──────────┘  └──────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Receipts     │
                    │  (Audit Trail)  │
                    └─────────────────┘
```

## Installation

```bash
# Install dependencies
yarn install

# Build all programs
anchor build

# Run tests
anchor test
```

## SDK Usage

```typescript
import { HumanRailSDK } from './sdk';

// Initialize SDK
const sdk = new HumanRailSDK(connection, wallet);

// Register a human profile
await sdk.humanRegistry.initProfile();

// Register an AI agent
await sdk.agentRegistry.registerAgent({
  name: "My Trading Bot",
  signingKey: agentKeypair.publicKey,
  metadataHash: [...],
});

// Issue capability to agent
await sdk.delegation.issueCapability({
  agent: agentPubkey,
  allowedPrograms: PROGRAM_SCOPE.HUMAN_PAY | PROGRAM_SCOPE.SWAP,
  perTxLimit: 100_000_000, // 0.1 SOL
  dailyLimit: 1_000_000_000, // 1 SOL
  expiresAt: Date.now() / 1000 + 86400 * 30, // 30 days
});
```

## Security Considerations

- All agent actions require valid capability credentials
- Capabilities are verified onchain before execution
- Emergency freeze allows instant suspension of compromised agents
- Receipts provide immutable accountability records
- Ed25519 signatures for issuer attestations

## License

MIT

