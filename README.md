# HumanRail

**Human-Verified Payment & Task Infrastructure for Solana**

HumanRail is a Solana-based protocol that provides human verification infrastructure for payments and micro-tasks. It enables merchants to require human verification for payments and allows task creators to distribute work only to verified humans.

-----

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Programs](#programs)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [SDK Usage](#sdk-usage)
- [Actions Server](#actions-server)
- [Program IDs](#program-ids)
- [License](#license)

-----

## Overview

HumanRail consists of three core Solana programs that work together:

1. **Human Registry** - Manages human identity profiles with attestation-based scoring
1. **Human Pay** - Confidential invoices requiring human verification for payment
1. **Data Blink** - RLHF micro-task distribution to verified human workers

### Key Features

- **Sybil Resistance**: Attestation-based human scoring prevents bot attacks
- **Nonce-Based PDAs**: Unique account derivation for invoices and tasks
- **Token-2022 Support**: Native support for Solana’s Token-2022 program
- **Solana Actions Compatible**: Actions server for blink integration
- **Privacy-Preserving**: Confidential invoice amounts with memo support

-----

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HumanRail Protocol                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Human Registry  │  │    Human Pay     │  │   Data Blink   │ │
│  │                  │  │                  │  │                │ │
│  │  • Profiles      │  │  • Invoices      │  │  • Tasks       │ │
│  │  • Attestations  │  │  • Payments      │  │  • Responses   │ │
│  │  • Scores        │  │  • Withdrawals   │  │  • Rewards     │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │                     │                    │          │
│           └─────────────────────┼────────────────────┘          │
│                                 │                               │
│                    ┌────────────▼────────────┐                  │
│                    │   Human Verification    │                  │
│                    │   (Score Threshold)     │                  │
│                    └─────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

-----

## Programs

### 1. Human Registry (`human_registry`)

Manages human identity profiles with attestation-based verification.

**Instructions:**

- `init_profile` - Initialize a new human profile
- `register_attestation` - Add an attestation to a profile

**Accounts:**

- `HumanProfile` - Stores wallet, score, attestation count, and attestation references

**Features:**

- Maximum 8 attestations per profile
- Weighted scoring system
- Uniqueness flag at score threshold (100+)

### 2. Human Pay (`human_pay`)

Confidential invoice system with human verification requirements.

**Instructions:**

- `create_confidential_invoice` - Create a new invoice with nonce-based PDA
- `pay_confidential_invoice` - Pay an invoice (requires human verification)
- `cancel_invoice` - Cancel an open invoice (merchant only)
- `withdraw_invoice` - Withdraw funds from paid invoice (merchant only)

**Accounts:**

- `ConfidentialInvoice` - Stores invoice details, status, vault reference

**Features:**

- Nonce-based unique invoice derivation
- Human score requirements for payers
- Token-2022 vault for secure fund holding
- 32-byte memo support

### 3. Data Blink (`data_blink`)

RLHF micro-task distribution to verified human workers.

**Instructions:**

- `create_task` - Create a new task with reward budget
- `submit_response` - Submit a response to a task (requires human verification)
- `claim_rewards` - Claim rewards for submitted response
- `close_task` - Close task and return remaining budget

**Accounts:**

- `Task` - Stores task metadata, budget, response tracking
- `TaskResponse` - Stores worker response, reward amount, claim status

**Features:**

- Nonce-based unique task derivation
- Configurable human score requirements
- Per-response reward distribution
- Maximum response limits

-----

## Project Structure

```
human-rail/
├── programs/
│   ├── human_registry/       # Human identity program
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── state/
│   │       ├── instructions/
│   │       └── errors.rs
│   ├── human_pay/            # Payment program
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── state/
│   │       ├── instructions/
│   │       └── errors.rs
│   └── data_blink/           # Task program
│       └── src/
│           ├── lib.rs
│           ├── state/
│           ├── instructions/
│           └── errors.rs
├── packages/
│   └── sdk/                  # TypeScript SDK
│       ├── src/
│       │   ├── client.ts
│       │   ├── registry.ts
│       │   ├── pay.ts
│       │   ├── tasks.ts
│       │   ├── types.ts
│       │   ├── constants.ts
│       │   └── idl/
│       └── package.json
├── services/
│   └── actions-server/       # Solana Actions API
│       ├── src/
│       │   ├── index.ts
│       │   ├── config.ts
│       │   └── routes/
│       └── package.json
├── tests/
│   └── humanrail.ts          # Integration tests
├── Anchor.toml
├── Cargo.toml
└── package.json
```

-----

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (0.30+)
- [Node.js](https://nodejs.org/) (18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/humanrail-labs/human-rail.git
cd human-rail

# Install dependencies
npm install --legacy-peer-deps

# Install SDK dependencies
cd packages/sdk
npm install --legacy-peer-deps
cd ../..

# Install actions-server dependencies
cd services/actions-server
npm install --legacy-peer-deps
cd ../..

# Build programs
anchor build

# Build SDK
cd packages/sdk && npm run build && cd ../..

# Build actions-server
cd services/actions-server && npm run build && cd ../..
```

-----

## Development

### Building Programs

```bash
# Build all Solana programs
anchor build

# Build specific program
anchor build -p human_registry
anchor build -p human_pay
anchor build -p data_blink
```

### Building SDK

```bash
cd packages/sdk
npm run build
```

### Building Actions Server

```bash
cd services/actions-server
npm run build
```

### Local Validator

```bash
# Start local validator
solana-test-validator --reset

# In another terminal, deploy programs
anchor deploy --provider.cluster localnet
```

-----

## Testing

### Run All Tests

```bash
# Start validator and run tests
solana-test-validator --reset --quiet &
sleep 5
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
```

### Test Output

```
HumanRail Integration Tests
  human_registry
    ✔ should initialize a human profile and verify state
    ✔ should register attestation and mutate state
    ✔ should increment count and score with multiple attestations
    ✔ should respect MAX_ATTESTATIONS limit
  human_pay invoice flow
    ✔ should create an invoice
    ✔ should pay the invoice
    ✔ should withdraw funds from paid invoice
    ✔ should fail to withdraw with wrong mint
  data_blink task flow
    ✔ should create a task
    ✔ should submit a response
    ✔ should claim rewards
    ✔ should fail double claim
    ✔ should close task and return remaining budget
  PDA derivation tests
    ✔ should derive task PDA correctly with nonce
    ✔ should derive invoice PDA correctly with nonce

15 passing
```

-----

## SDK Usage

### Installation

```bash
npm install @human-rail/sdk
```

### Initialize Client

```typescript
import { Connection } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { HumanRailClient } from '@human-rail/sdk';

const connection = new Connection('https://api.devnet.solana.com');
const client = HumanRailClient.fromConnection(connection, wallet);
```

### Human Registry

```typescript
import { initProfile, registerAttestation, getHumanProfile } from '@human-rail/sdk';

// Initialize profile
await initProfile(client);

// Register attestation
const payloadHash = new Uint8Array(32).fill(1);
await registerAttestation(client, sourcePublicKey, payloadHash, 50);

// Get profile
const profile = await getHumanProfile(client, walletPublicKey);
console.log('Human Score:', profile.humanScore);
```

### Human Pay

```typescript
import { createInvoice, payInvoice, withdrawInvoice, generateNonce } from '@human-rail/sdk';
import { BN } from '@coral-xyz/anchor';

// Create invoice
const nonce = generateNonce();
const { tx, invoice } = await createInvoice(client, {
  amount: new BN(1_000_000),
  humanRequirements: 50,
  expiresAt: new BN(Date.now() / 1000 + 86400),
  memo: new Uint8Array(32),
  nonce,
  mint: tokenMintPublicKey,
});

// Pay invoice
await payInvoice(client, invoice);

// Withdraw (merchant)
await withdrawInvoice(client, invoice);
```

### Data Blink

```typescript
import { createTask, submitTaskResponse, claimTaskRewards, generateNonce } from '@human-rail/sdk';
import { BN } from '@coral-xyz/anchor';

// Create task
const nonce = generateNonce();
const { tx, task } = await createTask(client, {
  rewardPerResponse: new BN(100_000),
  totalBudget: new BN(1_000_000),
  humanRequirements: 50,
  metadataUri: 'https://example.com/task.json',
  maxResponses: 10,
  allowMultipleResponses: false,
  nonce,
  rewardMint: tokenMintPublicKey,
});

// Submit response
await submitTaskResponse(client, task, 1, new Uint8Array(32));

// Claim rewards
await claimTaskRewards(client, task);
```

-----

## Actions Server

The actions server provides Solana Actions API endpoints for blink integration.

### Running the Server

```bash
cd services/actions-server
npm run dev
```

### Endpoints

#### Tasks

```
GET  /actions/tasks/:taskPubkey          # Get task metadata
POST /actions/tasks/:taskPubkey/respond  # Submit response transaction
POST /actions/tasks/:taskPubkey/claim    # Claim rewards transaction
```

### Example Response

```json
{
  "icon": "https://humanrail.io/task-icon.png",
  "label": "Complete Task",
  "title": "RLHF Task",
  "description": "Reward: 0.001 tokens. Status: Open",
  "links": {
    "actions": [
      {
        "label": "Submit Response",
        "href": "/actions/tasks/{taskPubkey}/respond?choice=1"
      }
    ]
  }
}
```

-----

## Program IDs

### Devnet / Localnet

|Program       |ID                                            |
|--------------|----------------------------------------------|
|human_registry|`Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR`|
|human_pay     |`6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe`|
|data_blink    |`BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5`|

### External Programs

|Program       |ID                                           |
|--------------|---------------------------------------------|
|Token-2022    |`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`|
|Token (Legacy)|`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`|

-----

## PDA Seeds

### Human Registry

```
human_profile: ["human_profile", wallet]
```

### Human Pay

```
invoice: ["invoice", merchant, mint, nonce (u64 LE)]
invoice_vault: ["invoice_vault", invoice]
```

### Data Blink

```
task: ["task", creator, nonce (u64 LE)]
task_vault: ["task_vault", task]
response: ["response", task, worker]
```

-----

## Error Codes

### Human Registry

|Code|Name                    |Description                          |
|----|------------------------|-------------------------------------|
|6000|MaxAttestationsReached  |Profile has maximum attestations     |
|6001|AttestationAlreadyExists|Attestation source already registered|
|6002|InvalidWeight           |Attestation weight out of range      |

### Human Pay

|Code|Name                  |Description                          |
|----|----------------------|-------------------------------------|
|6000|InvoiceNotOpen        |Invoice is not open for payment      |
|6001|InvoiceExpired        |Invoice has expired                  |
|6002|InsufficientHumanScore|Payer doesn’t meet human requirements|
|6003|InvalidMint           |Wrong token mint                     |
|6004|UnauthorizedMerchant  |Only merchant can perform this action|

### Data Blink

|Code|Name                  |Description                      |
|----|----------------------|---------------------------------|
|6000|TaskNotOpen           |Task is not accepting responses  |
|6001|TaskClosed            |Task has been closed             |
|6002|MaxResponsesReached   |Task response limit reached      |
|6003|InsufficientHumanScore|Worker doesn’t meet requirements |
|6004|AlreadyResponded      |Worker already submitted response|
|6005|BudgetExhausted       |Task budget depleted             |
|6009|RewardAlreadyClaimed  |Reward already claimed           |

-----

## Security Considerations

1. **Human Verification**: All payments and task responses require verified human profiles
1. **Nonce Uniqueness**: Each invoice/task uses a unique nonce preventing replay attacks
1. **PDA Signing**: Vault operations use PDA seeds for secure signing
1. **Token-2022**: Uses modern token standard with enhanced security features
1. **Authority Checks**: Merchant/creator-only operations are enforced on-chain

-----

## Roadmap

- [ ] Mainnet deployment
- [ ] Additional attestation providers
- [ ] Cross-program composability
- [ ] Governance token integration
- [ ] Mobile SDK
- [ ] Additional task types

-----

## Contributing

1. Fork the repository
1. Create a feature branch
1. Make your changes
1. Run tests: `anchor test`
1. Submit a pull request

-----

## License

MIT License - see <LICENSE> for details.

-----

## Links

- [GitHub Repository](https://github.com/humanrail-labs/human-rail)
- [Documentation](https://docs.humanrail.io)
- [Discord](https://discord.gg/humanrail)
- [Twitter](https://twitter.com/humanrail)

-----

**Built with ❤️ by HumanRail Labs**
