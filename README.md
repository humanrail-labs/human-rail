# HumanRail

A unified human identity and confidential payment fabric on Solana, exposed through Actions/Blinks as a token-incentivized RLHF and human-task rail.

## Overview

HumanRail provides infrastructure for distributing human tasks (such as RLHF preference labeling for AI training) to verified humans, with confidential payment settlement. It consists of three on-chain programs that work together:

- **human_registry**: Aggregates proof-of-personhood attestations from multiple providers into a unified human score
- **human_pay**: Enables confidential invoice and payment flows using Token 2022 extensions
- **data_blink**: Manages human task definitions and reward distribution, designed to be triggered via Solana Actions/Blinks

## Architecture

```
+-------------------+     +-------------------+     +-------------------+
|  human_registry   |     |    human_pay      |     |   data_blink      |
|                   |     |                   |     |                   |
|  - HumanProfile   |<----|  - Invoice        |     |  - Task           |
|  - Attestations   |     |  - Payments       |     |  - Response       |
|  - Human Score    |     |  - Token 2022     |     |  - Rewards        |
+-------------------+     +-------------------+     +-------------------+
        ^                         ^                         ^
        |                         |                         |
        +------------+------------+------------+------------+
                     |                         |
                     v                         v
            +----------------+        +------------------+
            | TypeScript SDK |        | Actions Server   |
            +----------------+        +------------------+
                     |                         |
                     v                         v
            +----------------+        +------------------+
            | Web Demo       |        | Blinks / Wallets |
            +----------------+        +------------------+
```

## Repository Structure

```
human-rail/
  programs/
    human_registry/     # Identity and PoP aggregation
    human_pay/          # Confidential payments
    data_blink/         # Human task rail
  packages/
    sdk/                # TypeScript SDK
  services/
    actions-server/     # Solana Actions/Blinks HTTP server
  apps/
    web-demo/           # Next.js demo application
  tests/                # Anchor integration tests
  docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Rust 1.70 or later
- Solana CLI 1.18 or later
- Anchor 0.30 or later
- Node.js 18 or later
- Yarn or npm

### Installation

Clone the repository:

```bash
git clone https://github.com/your-org/human-rail.git
cd human-rail
```

Install dependencies:

```bash
# Install Node dependencies
yarn install

# Verify Anchor installation
anchor --version
```

### Building Programs

```bash
anchor build
```

This generates:
- Program binaries in `target/deploy/`
- IDL files in `target/idl/`
- TypeScript types in `target/types/`

### Running Tests

Start a local validator and run tests:

```bash
anchor test
```

Or run tests against an existing validator:

```bash
anchor test --skip-local-validator
```

### Running the Actions Server

```bash
cd services/actions-server
npm install
npm run dev
```

The server runs at http://localhost:3001 by default.

### Running the Web Demo

```bash
cd apps/web-demo
npm install
npm run dev
```

The app runs at http://localhost:3000 by default.

## Programs

### human_registry

Manages human identity profiles by aggregating attestations from various proof-of-personhood providers.

Key features:
- HumanProfile account storing wallet, score, and attestation references
- Support for multiple attestation sources (SAS, World ID, Civic, Gitcoin Passport)
- Deterministic score calculation from attestation weights
- CPI-callable verification for use by other programs

### human_pay

Provides confidential invoice and payment primitives on top of Token 2022.

Key features:
- ConfidentialInvoice account with merchant, amount, and human requirements
- Human score verification before payment acceptance
- Escrow vault for secure fund holding
- Structured for future Confidential Transfer extension integration

### data_blink

Manages task definitions and reward distribution for human micro-tasks.

Key features:
- Task account with budget, rewards, and metadata URI
- Response tracking with double-submission prevention
- Human score requirements enforcement
- Reward claim mechanism with escrow payout

## SDK Usage

```typescript
import { HumanRailClient, ensureHumanProfile, createTask, submitTaskResponse } from '@human-rail/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

// Initialize client
const connection = new Connection(clusterApiUrl('devnet'));
const client = HumanRailClient.fromConnection(connection, wallet);

// Ensure user has a human profile
const { profile, created } = await ensureHumanProfile(client);

// Create a task (for task creators)
const { tx, task } = await createTask(client, {
  rewardMint: USDC_MINT,
  rewardPerResponse: new BN(1000000), // 1 USDC
  totalBudget: new BN(100000000),     // 100 USDC
  humanRequirements: 2000,
  metadataUri: 'https://example.com/task.json',
  maxResponses: 100,
  allowMultipleResponses: false,
});

// Submit a response (for workers)
await submitTaskResponse(client, taskPubkey, 0, new Uint8Array(32));
```

## Configuration

### Environment Variables

```bash
# Cluster configuration
CLUSTER=devnet                    # localnet, devnet, or mainnet-beta
RPC_URL=https://api.devnet.solana.com

# Program IDs (update after deployment)
HUMAN_REGISTRY_PROGRAM_ID=HReg...
HUMAN_PAY_PROGRAM_ID=HPay...
DATA_BLINK_PROGRAM_ID=DBnk...
```

### Anchor.toml

The `Anchor.toml` file contains program configurations for different clusters. Update the program IDs after initial deployment.

## Deployment

### Devnet

```bash
# Build programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update Anchor.toml with deployed program IDs
```

### Mainnet

Mainnet deployment requires additional security review and audit. See docs/ROADMAP.md for production readiness checklist.

## Current Limitations

This is an early development release with the following limitations:

1. **Attestation verification is placeholder**: The current implementation accepts attestations without real cryptographic verification. Production deployment requires integration with actual PoP providers.

2. **Confidential transfers are standard transfers**: The human_pay program uses standard Token 2022 transfers. Confidential Transfer extension integration is planned.

3. **No production security audit**: The code has not been audited. Do not use with real funds.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for planned features:

- Real Solana Attestation Service integration
- Token 2022 Confidential Transfer support
- Additional PoP provider integrations
- Task quality scoring and aggregation
- Production security audit

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for contribution guidelines.

## License

Apache 2.0. See [LICENSE](LICENSE) for details.
