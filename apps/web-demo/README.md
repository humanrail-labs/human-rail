# HumanRail Web Demo

A minimal Next.js application demonstrating the HumanRail protocol.

## Features

- Wallet connection via Solana Wallet Adapter
- Browse available human tasks
- Complete A/B preference tasks (RLHF-style)
- View pending rewards
- Human profile display

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
cd apps/web-demo
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
# Solana cluster: localnet, devnet, or mainnet-beta
NEXT_PUBLIC_CLUSTER=localnet

# Custom RPC URL (optional, overrides cluster)
NEXT_PUBLIC_RPC_URL=http://localhost:8899

# Actions server URL
NEXT_PUBLIC_ACTIONS_SERVER=http://localhost:3001

# Program IDs (update after deployment)
NEXT_PUBLIC_HUMAN_REGISTRY_PROGRAM_ID=HReg1111111111111111111111111111111111111111
NEXT_PUBLIC_HUMAN_PAY_PROGRAM_ID=HPay1111111111111111111111111111111111111111
NEXT_PUBLIC_DATA_BLINK_PROGRAM_ID=DBnk1111111111111111111111111111111111111111
```

### Running the App

Development mode:
```bash
npm run dev
```

The app will be available at http://localhost:3000

Production build:
```bash
npm run build
npm start
```

## Pages

- `/` - Landing page with protocol overview
- `/demo` - Developer demo dashboard (requires wallet connection)
- `/tasks` - List of available tasks
- `/tasks/[taskId]` - Individual task completion page

## Connecting to Local Validator

1. Start a local Solana validator:
   ```bash
   solana-test-validator
   ```

2. Deploy the HumanRail programs (from repo root):
   ```bash
   anchor build
   anchor deploy
   ```

3. Update program IDs in `.env.local` with deployed addresses

4. Start the web demo:
   ```bash
   npm run dev
   ```

## Development Notes

- The current implementation uses mock data for tasks. In production, tasks would be fetched from the blockchain via the SDK.
- Transaction signing is simulated. Real integration requires building transactions using the SDK and submitting them via the wallet adapter.
- The Actions server can be used as an alternative backend for fetching task data and building transactions.

## Architecture

```
src/
  app/
    layout.tsx      # Root layout with wallet provider
    page.tsx        # Landing page
    demo/
      page.tsx      # Developer demo dashboard
    tasks/
      page.tsx      # Task listing
      [taskId]/
        page.tsx    # Task completion interface
  components/
    WalletProvider.tsx  # Solana wallet adapter setup
  lib/
    (future SDK integration)
```
