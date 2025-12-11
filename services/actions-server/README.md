# HumanRail Actions Server

HTTP service exposing Solana Actions/Blinks compatible endpoints for HumanRail protocol.

## Overview

This server provides endpoints that conform to the Solana Actions specification, allowing HumanRail tasks and payments to be triggered directly from Blinks in supported wallets and applications.

## Running Locally

### Prerequisites

- Node.js 18+
- A running Solana validator (localnet) or access to devnet

### Installation

```bash
cd services/actions-server
npm install
```

### Configuration

Create a `.env` file or set environment variables:

```bash
PORT=3001
CLUSTER=localnet
RPC_URL=http://localhost:8899
BASE_URL=http://localhost:3001
ICON_URL=https://humanrail.dev/icon.png

# Program IDs (update after deployment)
HUMAN_REGISTRY_PROGRAM_ID=HReg1111111111111111111111111111111111111111
HUMAN_PAY_PROGRAM_ID=HPay1111111111111111111111111111111111111111
DATA_BLINK_PROGRAM_ID=DBnk1111111111111111111111111111111111111111
```

### Running

Development mode with hot reload:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## API Endpoints

### Actions Discovery

```
GET /actions.json
```

Returns the actions.json manifest for Blinks discovery.

### Task Actions

```
GET /actions/tasks/:taskPubkey
```

Returns Action metadata for a task, including available choices.

```
POST /actions/tasks/:taskPubkey/respond?choice=0
```

Submit a response to a task. The `choice` parameter specifies which option was selected (0 or 1 for A/B tasks).

Request body:
```json
{
  "account": "WorkerWalletPubkey..."
}
```

```
POST /actions/tasks/:taskPubkey/claim
```

Claim rewards for a completed task response.

### Payment Actions

```
GET /actions/payments/:invoicePubkey
```

Returns Action metadata for an invoice.

```
POST /actions/payments/:invoicePubkey/pay
```

Pay a confidential invoice.

## Example curl Calls

### Get task action metadata

```bash
curl http://localhost:3001/actions/tasks/TaskPubkey123...
```

### Submit a task response

```bash
curl -X POST http://localhost:3001/actions/tasks/TaskPubkey123.../respond?choice=0 \
  -H "Content-Type: application/json" \
  -d '{"account": "YourWalletPubkey..."}'
```

### Claim task rewards

```bash
curl -X POST http://localhost:3001/actions/tasks/TaskPubkey123.../claim \
  -H "Content-Type: application/json" \
  -d '{"account": "YourWalletPubkey..."}'
```

## How This Maps to Blinks

Solana Blinks are unfurled links that trigger on-chain transactions. When a user encounters a Blink URL pointing to this server:

1. The wallet/client fetches `GET /actions/tasks/:taskPubkey`
2. The response includes metadata (title, description, icon) and available actions
3. When the user clicks an action, the client sends a POST request
4. The server returns a serialized transaction
5. The wallet prompts the user to sign and submit the transaction

This flow allows HumanRail tasks to be completed directly from social media posts, messaging apps, or any Blinks-enabled interface.

## Development Notes

- The current implementation uses placeholder instruction data. After deploying the Anchor programs, update the instruction building logic to use the generated IDL.
- For production, integrate the SDK from `packages/sdk` instead of building instructions manually.
- The server does not store state; all data is fetched from the Solana blockchain.

## Security Considerations

- Validate all public keys before use
- Rate limit endpoints in production
- Consider adding authentication for admin endpoints
- Always verify transaction contents on the client side before signing
