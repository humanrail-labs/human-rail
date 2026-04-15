# HumanRail SDK + Agent Runtime — Kimi Code Build Prompt

> **What we're building:**
> 1. `@humanrail/sdk` — TypeScript SDK that any agent (local or hosted) uses to interact with HumanRail on-chain programs
> 2. `@humanrail/agent` — Agent runtime that connects an LLM (Claude, ChatGPT, or custom) to HumanRail via the SDK
> 3. Frontend integration — Agent Vault UI for configuring and launching LLM-powered agents
>
> **Existing infrastructure:**
> - 7 Anchor programs deployed on Solana Devnet (Human Registry, Agent Registry, Delegation, HumanPay, DataBlink, Document Registry, Receipts)
> - Agent Vault frontend (Next.js 16 + React 19) at `/vault`
> - All IDLs in `lib/idl/`, PDA helpers in `lib/programs/index.ts`, hooks in `lib/hooks/`
> - Existing hooks use raw TransactionInstruction + Buffer parsing (NOT Anchor methods, except useDataBlink)
>
> **Monorepo structure we're targeting:**
> ```
> packages/
>   sdk/              ← @humanrail/sdk (this prompt, Phase 1-3)
>   agent/            ← @humanrail/agent (this prompt, Phase 4-6)
> app/                ← Agent Vault frontend (existing, extended in Phase 7-8)
> lib/                ← Existing shared code
> ```

---

## RULES FOR KIMI

1. **Work in phases.** Complete one phase fully before moving to the next. Stop and confirm after each phase.
2. **No placeholders.** Every function must have a real implementation that interacts with on-chain data. No `// TODO`, no mock returns, no simulated responses.
3. **Use the existing codebase as reference.** The hooks in `lib/hooks/` already know how to build transactions, parse buffers, and derive PDAs. Port that logic into the SDK — do NOT reinvent it. Read the existing hooks first.
4. **Test after each phase.** Write a test script that runs against devnet. Prove it works before moving on.
5. **Real Solana transactions.** All SDK methods that write to chain must produce real, signable transactions. All reads must hit the actual RPC.

---

## PHASE 1: SDK Core — Account Reading

**Goal:** Build the read-only foundation of `@humanrail/sdk`. After this phase, anyone can query all HumanRail on-chain state.

### Step 1.1 — Initialize the SDK package

```bash
mkdir -p packages/sdk/src
cd packages/sdk
npm init -y --scope=@humanrail
```

Set up `package.json`:
```json
{
  "name": "@humanrail/sdk",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "tsx tests/index.test.ts"
  }
}
```

Set up `tsconfig.json` with strict mode, target ES2020, module NodeNext.

Install dependencies:
```bash
npm install @solana/web3.js @coral-xyz/anchor bs58
npm install -D typescript tsx @types/node
```

### Step 1.2 — Port program constants and PDA helpers

Create `packages/sdk/src/constants.ts`:
- Export all 7 program IDs (import the PublicKey values from the existing `lib/programs/index.ts` — copy the hardcoded devnet addresses)
- Export the PDA derivation functions. Copy the seed patterns from `lib/programs/index.ts`:
  - `getHumanProfilePDA(wallet: PublicKey): [PublicKey, number]`
  - `getAgentPDA(principal: PublicKey, nonce: bigint): [PublicKey, number]`
  - `getCapabilityPDA(principal: PublicKey, agent: PublicKey, nonce: bigint): [PublicKey, number]`
  - `getFreezePDA(principal: PublicKey, agent: PublicKey): [PublicKey, number]`
  - `getDocumentPDA(docHash: Buffer): [PublicKey, number]`
  - `getReceiptPDA(agentId: PublicKey, nonce: bigint): [PublicKey, number]`

Make the RPC URL configurable (constructor param), defaulting to devnet.

### Step 1.3 — Account parsers

Create `packages/sdk/src/parsers.ts`:

Study the existing hooks in `lib/hooks/` — they parse account data from raw buffers using discriminator + byte offsets. Port this parsing logic into standalone functions:

- `parseHumanProfile(data: Buffer): HumanProfile`
- `parseAgentAccount(data: Buffer): AgentAccount`
- `parseCapability(data: Buffer): Capability`
- `parseFreezeAccount(data: Buffer): FreezeAccount`
- `parseReceipt(data: Buffer): Receipt`
- `parseDocument(data: Buffer): Document`

Each parser must:
1. Skip the 8-byte Anchor discriminator
2. Read fields at the correct byte offsets (check existing hooks for the exact layout)
3. Return a typed object

Define TypeScript interfaces for each account type in `packages/sdk/src/types.ts`:

```typescript
export interface HumanProfile {
  authority: PublicKey;
  displayName: string;
  trustScore: number;
  canRegisterAgents: boolean;
  attestationCount: number;
  createdAt: bigint;
  // ... all fields from the on-chain account
}

export interface AgentAccount {
  principal: PublicKey;
  agentPubkey: PublicKey;
  name: string;
  status: AgentStatus; // 'Active' | 'Suspended' | 'Revoked'
  nonce: bigint;
  txCount: number;
  createdAt: bigint;
  // ... all fields
}

export type AgentStatus = 'Active' | 'Suspended' | 'Revoked';

export interface Capability {
  principal: PublicKey;
  agent: PublicKey;
  scope: CapabilityScope;
  perTxLimit: bigint;    // lamports
  dailyLimit: bigint;    // lamports
  totalLimit: bigint;    // lamports
  amountUsed: bigint;    // lamports
  dailyUsed: bigint;     // lamports
  lastResetSlot: bigint;
  expiresAt: bigint | null;
  frozen: boolean;
  allowedPrograms: PublicKey[];
  nonce: bigint;
  // ... all fields
}

export type CapabilityScope = 'Payment' | 'DataAction' | 'DocumentSign' | 'Full';

export interface FreezeAccount {
  principal: PublicKey;
  agent: PublicKey;
  frozen: boolean;
  frozenAt: bigint | null;
}

export interface Receipt {
  agent: PublicKey;
  actionType: string;
  amount: bigint;
  timestamp: bigint;
  txSignature: string;
  nonce: bigint;
}
```

**IMPORTANT:** Get the exact byte layouts from the existing hooks. Do NOT guess. Open each hook file in `lib/hooks/`, find where it does `Buffer.readUint8()`, `Buffer.readBigUInt64LE()`, etc., and replicate those offsets exactly.

### Step 1.4 — HumanRailClient class (read-only)

Create `packages/sdk/src/client.ts`:

```typescript
export class HumanRailClient {
  constructor(config: {
    rpcUrl?: string;         // defaults to devnet
    commitment?: Commitment; // defaults to 'confirmed'
  })

  // Human Registry reads
  async getHumanProfile(wallet: PublicKey): Promise<HumanProfile | null>
  async humanProfileExists(wallet: PublicKey): Promise<boolean>

  // Agent Registry reads
  async getAgent(principal: PublicKey, nonce: bigint): Promise<AgentAccount | null>
  async getAgentByPubkey(agentPubkey: PublicKey): Promise<AgentAccount | null>
  async getAgentsByPrincipal(principal: PublicKey): Promise<AgentAccount[]>

  // Delegation reads
  async getCapability(principal: PublicKey, agent: PublicKey, nonce: bigint): Promise<Capability | null>
  async getCapabilitiesForAgent(principal: PublicKey, agent: PublicKey): Promise<Capability[]>
  async getFreezeStatus(principal: PublicKey, agent: PublicKey): Promise<FreezeAccount | null>

  // Receipt reads
  async getReceipts(agent: PublicKey, limit?: number): Promise<Receipt[]>
  async getReceiptCount(agent: PublicKey): Promise<number>

  // Aggregated reads (convenience)
  async getAgentStatus(agentPubkey: PublicKey): Promise<{
    agent: AgentAccount;
    capabilities: Capability[];
    frozen: boolean;
    totalSpent: bigint;
    recentReceipts: Receipt[];
  }>
}
```

For `getAgentsByPrincipal` and `getCapabilitiesForAgent`, use `connection.getProgramAccounts()` with the appropriate `memcmp` filters (filter by principal pubkey at the correct byte offset). Check how the existing hooks do this.

### Step 1.5 — Test the read layer

Create `packages/sdk/tests/read.test.ts`:

```typescript
// Test against devnet with a known human profile and agent
// Use the existing devnet data — check what accounts exist from previous testing

const client = new HumanRailClient({ rpcUrl: 'https://api.devnet.solana.com' });

// Test 1: Fetch a human profile (use a wallet that has registered)
const profile = await client.getHumanProfile(new PublicKey('KNOWN_WALLET'));
console.log('Profile:', profile);

// Test 2: Fetch agents for that principal
const agents = await client.getAgentsByPrincipal(new PublicKey('KNOWN_WALLET'));
console.log('Agents:', agents.length);

// Test 3: Check freeze status
// ... etc
```

Run: `cd packages/sdk && npx tsx tests/read.test.ts`

If no accounts exist on devnet yet, use the Agent Vault frontend to create a test human profile and agent first, then test the SDK reads against those accounts.

**STOP. Confirm all reads work against devnet before Phase 2.**

---

## PHASE 2: SDK Core — Transaction Building

**Goal:** Add write capabilities to the SDK. After this phase, the SDK can build and send all HumanRail transactions.

### Step 2.1 — Instruction builders

Create `packages/sdk/src/instructions.ts`:

Port the instruction-building logic from the existing hooks. Each function returns a `TransactionInstruction` (NOT a signed transaction — the caller decides how to sign).

**Study the existing hooks carefully.** They compute instruction discriminators (first 8 bytes of SHA256 of `"global:<instruction_name>"`), then Borsh-encode the args, then build the account metas. Port this exact logic.

```typescript
// Human Registry
export function buildRegisterHumanIx(params: {
  wallet: PublicKey;
  displayName: string;
}): TransactionInstruction

// Agent Registry
export function buildRegisterAgentIx(params: {
  principal: PublicKey;
  agentPubkey: PublicKey;
  name: string;
  agentType: string;
  nonce: bigint;
}): TransactionInstruction

export function buildSuspendAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction

export function buildReactivateAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction

export function buildRevokeAgentIx(params: {
  principal: PublicKey;
  agentPda: PublicKey;
}): TransactionInstruction

// Delegation
export function buildIssueCapabilityIx(params: {
  principal: PublicKey;
  agent: PublicKey;
  scope: CapabilityScope;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  expiresAt: bigint | null;
  allowedPrograms: PublicKey[];
  nonce: bigint;
}): TransactionInstruction

export function buildFreezeAgentIx(params: {
  principal: PublicKey;
  agent: PublicKey;
}): TransactionInstruction

export function buildUnfreezeAgentIx(params: {
  principal: PublicKey;
  agent: PublicKey;
}): TransactionInstruction

// HumanPay
export function buildCreateInvoiceIx(params: {
  agent: PublicKey;
  principal: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  memo: string;
}): TransactionInstruction

export function buildPayInvoiceIx(params: {
  agent: PublicKey;
  invoicePda: PublicKey;
  capabilityPda: PublicKey;
}): TransactionInstruction

// Receipts
export function buildCreateReceiptIx(params: {
  agent: PublicKey;
  actionType: string;
  amount: bigint;
  nonce: bigint;
}): TransactionInstruction
```

**CRITICAL:** Get EVERY instruction discriminator, account ordering, and data encoding from the existing hooks. Do NOT guess. If an instruction isn't implemented in any existing hook, look at the IDL in `lib/idl/` to get the instruction name and account list, then compute the discriminator using:
```typescript
import { createHash } from 'crypto';
const discriminator = createHash('sha256')
  .update(`global:instruction_name`)
  .digest()
  .subarray(0, 8);
```

### Step 2.2 — HumanRailAgent class (write + read)

Create `packages/sdk/src/agent.ts`:

This is the class that agent runtimes use. It holds the agent's keypair and knows how to sign and send transactions.

```typescript
import { Keypair, Connection, Transaction } from '@solana/web3.js';

export class HumanRailAgent {
  private connection: Connection;
  private agentKeypair: Keypair;
  private principalPubkey: PublicKey;
  private client: HumanRailClient; // from Phase 1

  constructor(config: {
    agentKeypair: Keypair;        // the agent's Solana keypair
    principalPubkey: PublicKey;   // the human who registered this agent
    rpcUrl?: string;
  })

  // === Authorization checks ===

  /**
   * Check if the agent has a valid capability for a given action.
   * Returns { authorized: true, capability } or { authorized: false, reason }.
   * Checks: agent status, freeze status, capability scope, all three limits, expiry.
   */
  async checkCapability(params: {
    action: CapabilityScope;
    amount?: bigint; // lamports — required for Payment scope
    targetProgram?: PublicKey;
  }): Promise<{
    authorized: boolean;
    reason?: string;
    capability?: Capability;
  }>

  // === Agent status ===

  async getStatus(): Promise<{
    agent: AgentAccount;
    capabilities: Capability[];
    frozen: boolean;
    totalSpent: bigint;
    dailyRemaining: bigint;
    recentReceipts: Receipt[];
  }>

  async isFrozen(): Promise<boolean>
  async isActive(): Promise<boolean>

  // === Actions (check capability + execute + create receipt) ===

  /**
   * Execute a payment through HumanPay.
   * Automatically:
   * 1. Checks capability (scope: Payment, amount within limits)
   * 2. Creates invoice
   * 3. Pays invoice (from agent's capability-controlled funds)
   * 4. Emits receipt
   * Returns the receipt and all transaction signatures.
   */
  async executePayment(params: {
    to: PublicKey;
    amount: bigint;     // lamports
    memo?: string;
  }): Promise<{
    success: boolean;
    receipt?: Receipt;
    signatures: string[];
    error?: string;
  }>

  /**
   * Execute a data action through DataBlink.
   * Automatically checks capability and emits receipt.
   */
  async executeDataAction(params: {
    taskType: string;
    data: string;       // JSON string of the data payload
  }): Promise<{
    success: boolean;
    receipt?: Receipt;
    signatures: string[];
    error?: string;
  }>

  /**
   * Sign a document through Document Registry.
   * Automatically checks capability and emits receipt.
   */
  async signDocument(params: {
    documentHash: Buffer; // 32-byte hash
    metadata?: string;
  }): Promise<{
    success: boolean;
    receipt?: Receipt;
    signatures: string[];
    error?: string;
  }>

  // === Event listening ===

  /**
   * Subscribe to freeze events for this agent.
   * Uses Solana WebSocket to watch the freeze PDA.
   */
  onFreeze(callback: (frozen: boolean) => void): () => void  // returns unsubscribe fn

  /**
   * Subscribe to capability changes.
   */
  onCapabilityChange(callback: (capabilities: Capability[]) => void): () => void
}
```

Each action method (`executePayment`, `executeDataAction`, `signDocument`) must follow this internal flow:
1. Call `checkCapability()` — if not authorized, return `{ success: false, error: reason }`
2. Build the instruction(s) using the builders from Step 2.1
3. Build a `Transaction`, add the instruction(s)
4. Sign with `this.agentKeypair`
5. Send via `connection.sendRawTransaction()`
6. Confirm the transaction
7. Build and send a receipt instruction
8. Return `{ success: true, receipt, signatures }`

### Step 2.3 — Export barrel

Create `packages/sdk/src/index.ts`:
```typescript
export { HumanRailClient } from './client';
export { HumanRailAgent } from './agent';
export * from './types';
export * from './constants';
```

### Step 2.4 — Test write operations

Create `packages/sdk/tests/write.test.ts`:

Use a test keypair (generate one or use a devnet-funded keypair). Test the full flow:
1. Create a `HumanRailClient`, verify a human profile exists for the test wallet
2. Create a `HumanRailAgent` with a test agent keypair
3. Call `agent.getStatus()` — verify it reads correctly
4. Call `agent.checkCapability({ action: 'Payment', amount: 100000n })` — verify it returns authorized/denied correctly
5. If authorized, call `agent.executePayment(...)` — verify the transaction lands on devnet

```bash
cd packages/sdk && npx tsx tests/write.test.ts
```

**STOP. Confirm reads and writes work against devnet before Phase 3.**

---

## PHASE 3: SDK — Utility Layer

**Goal:** Add convenience methods, error handling, and the principal-side class (for the human/frontend).

### Step 3.1 — HumanRailPrincipal class

Create `packages/sdk/src/principal.ts`:

This class is used by the human (the frontend / Agent Vault) to manage their agents. Unlike `HumanRailAgent`, this doesn't hold a keypair — it returns unsigned transactions that the wallet adapter signs.

```typescript
export class HumanRailPrincipal {
  constructor(config: {
    walletPubkey: PublicKey;
    rpcUrl?: string;
  })

  // Returns unsigned transactions — caller signs with wallet adapter
  async buildRegisterAgentTx(params: {
    agentPubkey: PublicKey;
    name: string;
    agentType: string;
  }): Promise<Transaction>

  async buildIssueCapabilityTx(params: {
    agentPubkey: PublicKey;
    scope: CapabilityScope;
    perTxLimit: bigint;
    dailyLimit: bigint;
    totalLimit: bigint;
    expiresAt: bigint | null;
    allowedPrograms?: PublicKey[];
  }): Promise<Transaction>

  async buildSuspendAgentTx(agentPubkey: PublicKey): Promise<Transaction>
  async buildReactivateAgentTx(agentPubkey: PublicKey): Promise<Transaction>
  async buildRevokeAgentTx(agentPubkey: PublicKey): Promise<Transaction>
  async buildFreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction>
  async buildUnfreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction>

  // Reads (delegated to HumanRailClient)
  async getMyAgents(): Promise<AgentAccount[]>
  async getMyProfile(): Promise<HumanProfile | null>
  async getAllCapabilities(): Promise<Capability[]>
  async getAllReceipts(): Promise<Receipt[]>
}
```

### Step 3.2 — Error types

Create `packages/sdk/src/errors.ts`:

```typescript
export class HumanRailError extends Error {
  constructor(message: string, public code: HumanRailErrorCode) { super(message); }
}

export enum HumanRailErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_SUSPENDED = 'AGENT_SUSPENDED',
  AGENT_REVOKED = 'AGENT_REVOKED',
  AGENT_FROZEN = 'AGENT_FROZEN',
  NO_CAPABILITY = 'NO_CAPABILITY',
  CAPABILITY_EXPIRED = 'CAPABILITY_EXPIRED',
  PER_TX_LIMIT_EXCEEDED = 'PER_TX_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  TOTAL_LIMIT_EXCEEDED = 'TOTAL_LIMIT_EXCEEDED',
  PROGRAM_NOT_ALLOWED = 'PROGRAM_NOT_ALLOWED',
  HUMAN_PROFILE_NOT_FOUND = 'HUMAN_PROFILE_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  RPC_ERROR = 'RPC_ERROR',
}
```

Integrate these into all SDK methods. Never throw raw strings or generic Errors.

### Step 3.3 — Build and verify package

```bash
cd packages/sdk
npm run build  # tsc should compile with zero errors
ls dist/       # verify all .js and .d.ts files exist
```

Update the barrel export to include `HumanRailPrincipal` and all error types.

**STOP. Confirm the SDK compiles, exports are correct, and tests pass before Phase 4.**

---

## PHASE 4: Agent Runtime — LLM Integration Core

**Goal:** Build `@humanrail/agent` — a runtime that connects any LLM (Claude, ChatGPT, or custom) to HumanRail actions.

### Step 4.1 — Initialize the agent package

```bash
mkdir -p packages/agent/src
cd packages/agent
npm init -y --scope=@humanrail
```

Install dependencies:
```bash
npm install @humanrail/sdk   # or use workspace reference: "file:../sdk"
npm install @anthropic-ai/sdk openai   # LLM SDKs
npm install -D typescript tsx @types/node
```

### Step 4.2 — LLM Provider Interface

Create `packages/agent/src/providers/types.ts`:

Define a provider-agnostic interface so we can swap LLMs:

```typescript
export interface LLMProvider {
  /**
   * Send a message with available tools and get back a response
   * that may include tool calls.
   */
  chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<LLMResponse>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;   // for tool result messages
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface LLMResponse {
  content: string | null;            // text response (may be null if only tool calls)
  toolCalls: ToolCall[];             // tool invocations requested by the LLM
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
```

### Step 4.3 — Claude Provider

Create `packages/agent/src/providers/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: {
    apiKey: string;
    model?: string;  // defaults to 'claude-sonnet-4-20250514'
  }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
  }

  async chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<LLMResponse> {
    // Convert our generic ToolDefinition[] to Anthropic's tool format
    // Convert our ChatMessage[] to Anthropic's message format
    // Call this.client.messages.create()
    // Parse the response — extract text content and tool_use blocks
    // Return as LLMResponse
  }
}
```

Use the REAL Anthropic SDK API. Check the actual `@anthropic-ai/sdk` types for `messages.create()`. The tool format is:
```typescript
{
  name: string;
  description: string;
  input_schema: { type: 'object', properties: {...}, required: [...] }
}
```

### Step 4.4 — OpenAI/ChatGPT Provider

Create `packages/agent/src/providers/openai.ts`:

```typescript
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: {
    apiKey: string;
    model?: string;  // defaults to 'gpt-4o'
  }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4o';
  }

  async chat(params): Promise<LLMResponse> {
    // Convert to OpenAI format
    // Call this.client.chat.completions.create() with tools
    // Parse response — extract message.content and tool_calls
    // Return as LLMResponse
  }
}
```

Use the REAL OpenAI SDK API. Check the actual `openai` package types.

### Step 4.5 — HumanRail Tool Definitions

Create `packages/agent/src/tools.ts`:

Define the tools that the LLM can call. These map to HumanRail SDK actions:

```typescript
export const HUMANRAIL_TOOLS: ToolDefinition[] = [
  {
    name: 'check_capability',
    description: 'Check if the agent has authorization to perform an action. Call this BEFORE attempting any payment, data action, or document signing.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['Payment', 'DataAction', 'DocumentSign'],
          description: 'The type of action to check authorization for'
        },
        amount_sol: {
          type: 'number',
          description: 'Amount in SOL (required for Payment actions)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'execute_payment',
    description: 'Send a SOL payment to a recipient. The agent must have a Payment capability with sufficient limits. This creates an on-chain receipt.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Solana public key (base58) of the payment recipient'
        },
        amount_sol: {
          type: 'number',
          description: 'Amount to send in SOL'
        },
        memo: {
          type: 'string',
          description: 'Human-readable description of what this payment is for'
        }
      },
      required: ['recipient', 'amount_sol']
    }
  },
  {
    name: 'store_data',
    description: 'Store structured data on-chain via DataBlink. Use for recording research results, analysis outputs, logs, or any structured information.',
    parameters: {
      type: 'object',
      properties: {
        task_type: {
          type: 'string',
          description: 'Category of data being stored (e.g., "research", "analysis", "log", "report")'
        },
        data: {
          type: 'string',
          description: 'The data payload as a JSON string'
        }
      },
      required: ['task_type', 'data']
    }
  },
  {
    name: 'sign_document',
    description: 'Attest/sign a document hash on-chain. Use for document verification, compliance sign-off, or multi-party attestation.',
    parameters: {
      type: 'object',
      properties: {
        document_hash: {
          type: 'string',
          description: 'SHA-256 hash of the document (hex string, 64 chars)'
        },
        metadata: {
          type: 'string',
          description: 'Optional description or metadata about the document'
        }
      },
      required: ['document_hash']
    }
  },
  {
    name: 'get_agent_status',
    description: 'Get the current status of this agent — active/suspended, capabilities, spending limits, remaining budgets, and recent activity.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_recent_receipts',
    description: 'Get recent on-chain receipts (audit trail) for this agent.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of receipts to fetch (default 10, max 50)'
        }
      },
      required: []
    }
  }
];
```

### Step 4.6 — Tool Executor

Create `packages/agent/src/executor.ts`:

This maps LLM tool calls to SDK methods:

```typescript
import { HumanRailAgent } from '@humanrail/sdk';

export class ToolExecutor {
  constructor(private agent: HumanRailAgent) {}

  async execute(toolCall: ToolCall): Promise<string> {
    switch (toolCall.name) {
      case 'check_capability': {
        const { action, amount_sol } = toolCall.arguments;
        const result = await this.agent.checkCapability({
          action: action as CapabilityScope,
          amount: amount_sol ? BigInt(Math.round(amount_sol * 1e9)) : undefined,
        });
        return JSON.stringify(result);
      }

      case 'execute_payment': {
        const { recipient, amount_sol, memo } = toolCall.arguments;
        const result = await this.agent.executePayment({
          to: new PublicKey(recipient as string),
          amount: BigInt(Math.round((amount_sol as number) * 1e9)),
          memo: memo as string,
        });
        return JSON.stringify({
          success: result.success,
          signatures: result.signatures,
          error: result.error,
        });
      }

      case 'store_data': {
        const { task_type, data } = toolCall.arguments;
        const result = await this.agent.executeDataAction({
          taskType: task_type as string,
          data: data as string,
        });
        return JSON.stringify({
          success: result.success,
          signatures: result.signatures,
          error: result.error,
        });
      }

      case 'sign_document': {
        const { document_hash, metadata } = toolCall.arguments;
        const hashBuffer = Buffer.from(document_hash as string, 'hex');
        const result = await this.agent.signDocument({
          documentHash: hashBuffer,
          metadata: metadata as string,
        });
        return JSON.stringify({
          success: result.success,
          signatures: result.signatures,
          error: result.error,
        });
      }

      case 'get_agent_status': {
        const status = await this.agent.getStatus();
        return JSON.stringify({
          status: status.agent.status,
          frozen: status.frozen,
          capabilities: status.capabilities.map(c => ({
            scope: c.scope,
            perTxLimit: Number(c.perTxLimit) / 1e9,
            dailyLimit: Number(c.dailyLimit) / 1e9,
            totalLimit: Number(c.totalLimit) / 1e9,
            amountUsed: Number(c.amountUsed) / 1e9,
            dailyUsed: Number(c.dailyUsed) / 1e9,
            frozen: c.frozen,
            expired: c.expiresAt ? Number(c.expiresAt) < Date.now() / 1000 : false,
          })),
          totalSpent: Number(status.totalSpent) / 1e9,
        });
      }

      case 'get_recent_receipts': {
        const limit = (toolCall.arguments.limit as number) || 10;
        const receipts = await this.agent.getStatus();
        return JSON.stringify(
          receipts.recentReceipts.slice(0, limit).map(r => ({
            action: r.actionType,
            amount: Number(r.amount) / 1e9,
            timestamp: Number(r.timestamp),
            txSignature: r.txSignature,
          }))
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
    }
  }
}
```

**STOP. Confirm all tool definitions are correct and the executor compiles before Phase 5.**

---

## PHASE 5: Agent Runtime — Agent Loop

**Goal:** Build the main agent loop that ties LLM + tools + HumanRail together.

### Step 5.1 — AgentRuntime class

Create `packages/agent/src/runtime.ts`:

```typescript
export class AgentRuntime {
  private provider: LLMProvider;
  private executor: ToolExecutor;
  private agent: HumanRailAgent;
  private systemPrompt: string;
  private conversationHistory: ChatMessage[];
  private onEvent?: (event: AgentEvent) => void;

  constructor(config: {
    llmProvider: LLMProvider;      // Claude, OpenAI, or custom
    agentKeypair: Keypair;
    principalPubkey: PublicKey;
    rpcUrl?: string;
    systemPrompt?: string;         // custom instructions for the agent
    onEvent?: (event: AgentEvent) => void;  // callback for UI updates
  }) {
    this.agent = new HumanRailAgent({
      agentKeypair: config.agentKeypair,
      principalPubkey: config.principalPubkey,
      rpcUrl: config.rpcUrl,
    });
    this.executor = new ToolExecutor(this.agent);
    this.provider = config.llmProvider;
    this.conversationHistory = [];

    // Build the system prompt that tells the LLM about its capabilities and constraints
    this.systemPrompt = this.buildSystemPrompt(config.systemPrompt);
  }

  private buildSystemPrompt(customInstructions?: string): string {
    return `You are an AI agent operating on the Solana blockchain through the HumanRail protocol.

## Your Identity
You are a registered on-chain agent with a verified human principal who controls your capabilities.
Your actions are bounded by capabilities (spending limits, scopes, and expiry) set by your principal.
Every action you take creates an immutable on-chain receipt.

## Rules
1. ALWAYS call check_capability BEFORE attempting any payment, data action, or document signing.
2. If a capability check returns unauthorized, explain why to the user and do NOT attempt the action.
3. Never attempt to exceed your spending limits. Check get_agent_status to see remaining budgets.
4. If you are frozen, inform the user that your principal has frozen your capabilities and you cannot take any actions.
5. Always include a clear memo/description for payments so the audit trail is meaningful.
6. Report transaction signatures after successful actions so the user can verify on-chain.

## Available Actions
- execute_payment: Send SOL payments (requires Payment capability)
- store_data: Store structured data on-chain via DataBlink (requires DataAction capability)
- sign_document: Attest/sign document hashes on-chain (requires DocumentSign capability)
- check_capability: Check if you're authorized for an action
- get_agent_status: View your current status, limits, and remaining budgets
- get_recent_receipts: View your recent on-chain activity

${customInstructions ? `\n## Custom Instructions from Principal\n${customInstructions}` : ''}`;
  }

  /**
   * Process a user message through the LLM + tool execution loop.
   * Handles multi-turn tool calling until the LLM produces a final text response.
   */
  async processMessage(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage });
    this.emit({ type: 'message_received', content: userMessage });

    // Check if agent is frozen before doing anything
    const frozen = await this.agent.isFrozen();
    if (frozen) {
      const response = 'I am currently frozen by my principal. All my capabilities are suspended and I cannot take any actions. Please contact my principal to unfreeze me.';
      this.conversationHistory.push({ role: 'assistant', content: response });
      this.emit({ type: 'response', content: response });
      return response;
    }

    // LLM loop — keep going until we get a text response with no tool calls
    let maxIterations = 10; // safety limit to prevent infinite loops
    while (maxIterations > 0) {
      maxIterations--;

      const llmResponse = await this.provider.chat({
        systemPrompt: this.systemPrompt,
        messages: this.conversationHistory,
        tools: HUMANRAIL_TOOLS,
      });

      // If there are tool calls, execute them and feed results back
      if (llmResponse.toolCalls.length > 0) {
        // Add assistant message with tool calls to history
        this.conversationHistory.push({
          role: 'assistant',
          content: llmResponse.content || '',
        });

        for (const toolCall of llmResponse.toolCalls) {
          this.emit({ type: 'tool_call', tool: toolCall.name, args: toolCall.arguments });

          const result = await this.executor.execute(toolCall);

          this.emit({ type: 'tool_result', tool: toolCall.name, result });

          this.conversationHistory.push({
            role: 'tool',
            content: result,
            toolCallId: toolCall.id,
          });
        }

        // Continue the loop — LLM will process tool results
        continue;
      }

      // No tool calls — this is the final response
      const finalResponse = llmResponse.content || 'I have completed the requested actions.';
      this.conversationHistory.push({ role: 'assistant', content: finalResponse });
      this.emit({ type: 'response', content: finalResponse });
      return finalResponse;
    }

    const fallback = 'I reached the maximum number of tool-calling iterations. Please try a simpler request.';
    this.emit({ type: 'response', content: fallback });
    return fallback;
  }

  /**
   * Reset conversation history (start fresh).
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }

  private emit(event: AgentEvent): void {
    this.onEvent?.(event);
  }
}

export type AgentEvent =
  | { type: 'message_received'; content: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: string }
  | { type: 'response'; content: string };
```

### Step 5.2 — Convenience factory

Create `packages/agent/src/index.ts`:

```typescript
export { AgentRuntime } from './runtime';
export { ClaudeProvider } from './providers/claude';
export { OpenAIProvider } from './providers/openai';
export type { LLMProvider, ChatMessage, ToolDefinition, ToolCall, LLMResponse } from './providers/types';
export type { AgentEvent } from './runtime';

// Convenience factory
export function createAgent(config: {
  provider: 'claude' | 'openai';
  apiKey: string;
  model?: string;
  agentKeypair: Keypair;
  principalPubkey: PublicKey;
  rpcUrl?: string;
  systemPrompt?: string;
  onEvent?: (event: AgentEvent) => void;
}): AgentRuntime {
  const llmProvider = config.provider === 'claude'
    ? new ClaudeProvider({ apiKey: config.apiKey, model: config.model })
    : new OpenAIProvider({ apiKey: config.apiKey, model: config.model });

  return new AgentRuntime({
    llmProvider,
    agentKeypair: config.agentKeypair,
    principalPubkey: config.principalPubkey,
    rpcUrl: config.rpcUrl,
    systemPrompt: config.systemPrompt,
    onEvent: config.onEvent,
  });
}
```

### Step 5.3 — Test the full loop

Create `packages/agent/tests/runtime.test.ts`:

```typescript
import { createAgent } from '../src';
import { Keypair, PublicKey } from '@solana/web3.js';

// Test with Claude (use env var for API key)
const agent = createAgent({
  provider: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentKeypair: Keypair.fromSecretKey(/* test agent keypair */),
  principalPubkey: new PublicKey('/* test principal */'),
  rpcUrl: 'https://api.devnet.solana.com',
  systemPrompt: 'You are a test agent. When asked, check your status and report your capabilities.',
  onEvent: (event) => console.log('[Event]', event.type, event),
});

// Test 1: Simple status check
const response1 = await agent.processMessage('What is your current status and what can you do?');
console.log('Response 1:', response1);

// Test 2: Attempt a payment (should check capability first)
const response2 = await agent.processMessage('Send 0.01 SOL to 11111111111111111111111111111111 for testing');
console.log('Response 2:', response2);
```

Run: `ANTHROPIC_API_KEY=sk-... npx tsx packages/agent/tests/runtime.test.ts`

**STOP. Confirm the full agent loop works — LLM calls tools, tools hit devnet, results come back. Before Phase 6.**

---

## PHASE 6: Agent Runtime — API Server

**Goal:** Build a lightweight API server so the Agent Vault frontend can communicate with running agents.

### Step 6.1 — Agent Server

Create `packages/agent/src/server.ts`:

A simple HTTP server (use Node's built-in `http` or install `express`/`fastify`) that:

1. **POST /agents/:agentId/chat** — Send a message to a running agent
   - Request body: `{ message: string }`
   - Response: `{ response: string, events: AgentEvent[] }`

2. **GET /agents/:agentId/status** — Get agent status from on-chain
   - Response: agent status object

3. **POST /agents/start** — Start an agent runtime
   - Request body: `{ agentId: string, provider: 'claude' | 'openai', apiKey: string, agentKeypair: string (base58 secret key), principalPubkey: string, systemPrompt?: string }`
   - Response: `{ started: true, agentId: string }`
   - Stores the running AgentRuntime in a Map

4. **POST /agents/:agentId/stop** — Stop a running agent
   - Removes from the Map, cleans up subscriptions

5. **GET /agents** — List running agents
   - Response: `{ agents: [{ id, provider, status }] }`

**Security considerations:**
- API keys (Claude/OpenAI) should be sent from the frontend and held in server memory only — never logged, never persisted to disk
- Agent keypairs are sensitive — same treatment
- In production this server MUST be behind auth. For now, add a simple bearer token check via `AGENT_SERVER_SECRET` env var

### Step 6.2 — WebSocket for real-time events

Add a WebSocket endpoint (use `ws` package):

**WS /agents/:agentId/events** — Stream `AgentEvent` objects in real-time as the agent processes messages and calls tools.

This lets the frontend show:
- "Agent is thinking..."
- "Agent is calling check_capability..."
- "Capability check passed ✓"
- "Agent is executing payment..."
- "Payment sent! Signature: 4x7f..."
- "Agent response: ..."

### Step 6.3 — Test the server

```bash
cd packages/agent
npx tsx src/server.ts &

# Start an agent
curl -X POST http://localhost:4000/agents/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_SERVER_SECRET" \
  -d '{
    "agentId": "test-agent-1",
    "provider": "claude",
    "apiKey": "sk-...",
    "agentKeypair": "base58_secret_key",
    "principalPubkey": "wallet_pubkey",
    "systemPrompt": "You are a helpful payment agent."
  }'

# Chat with the agent
curl -X POST http://localhost:4000/agents/test-agent-1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_SERVER_SECRET" \
  -d '{ "message": "What is your status?" }'
```

**STOP. Confirm server starts, agent starts, chat works, events stream. Before Phase 7.**

---

## PHASE 7: Frontend Integration — Agent Chat UI

**Goal:** Add a chat interface to Agent Vault where users can talk to their running agents.

### Step 7.1 — Agent Chat Page

Create `app/vault/agents/[agentId]/chat/page.tsx`:

A chat interface that connects to the agent server:

- **Chat messages area** — scrollable list of user and agent messages
- **Input field** — text input with send button
- **Tool call indicators** — when the agent calls a tool, show an inline status card:
  ```
  🔍 Checking capability: Payment, 0.5 SOL
  ✅ Authorized — daily remaining: 4.5 SOL
  ```
- **Transaction links** — when a tool result includes a signature, render it as a clickable link to Solana Explorer
- **Agent status sidebar** — show current agent status, capabilities, budget utilization (fetched from SDK)
- **Freeze banner** — if the agent is frozen, show a banner and disable the input

Communication:
- Use `fetch` for POST `/agents/:agentId/chat`
- Use WebSocket for real-time event streaming (show tool calls as they happen)
- The agent server URL comes from `NEXT_PUBLIC_AGENT_SERVER_URL` env var

### Step 7.2 — Agent Configuration Modal

In the Agent Detail page (`/vault/agents/[agentId]`), add a "Configure & Start Agent" button that opens a modal:

**LLM Provider Section:**
- Provider selector: Claude / ChatGPT / Custom
- API Key input (password field, never displayed after entry)
- Model selector (dropdown based on provider):
  - Claude: claude-sonnet-4-20250514, claude-haiku-4-5-20251001
  - ChatGPT: gpt-4o, gpt-4o-mini

**Agent Keypair Section:**
- Option 1: "Paste existing keypair" (base58 secret key input)
- Option 2: "Use keypair generated during deployment" (if the wizard generated one and stored it in browser sessionStorage)
- Warning text: "Your keypair is sent to the agent server over HTTPS and held in memory only. It is never stored on disk."

**Custom Instructions Section:**
- Textarea for the system prompt customization
- Placeholder: "e.g., You are a payment agent. Auto-pay invoices under 0.5 SOL from verified vendors."

**Start Button:**
- Calls POST `/agents/start` with all the configured values
- On success: navigates to `/vault/agents/[agentId]/chat`
- On error: shows error message

### Step 7.3 — Agent Controls in the Chat Page

Add control buttons to the chat page header:
- **Pause Agent** — stops the agent runtime (POST `/agents/:agentId/stop`)
- **Emergency Freeze** — freezes all capabilities on-chain AND stops the runtime
- **View Receipts** — links to the Activity tab on the agent detail page
- **Budget indicator** — live-updating remaining budget display

### Step 7.4 — Add "Chat" link to agent navigation

Update the agent detail page tabs to include a "Chat" tab:
```
Capabilities | Activity | Analytics | Chat
```

The Chat tab links to `/vault/agents/[agentId]/chat`.

Also add a "Chat" button on each agent card in the agents list (`/vault/agents/page.tsx`).

**STOP. Confirm the chat UI renders, connects to the agent server, and messages flow correctly. Before Phase 8.**

---

## PHASE 8: Custom Agent Templates

**Goal:** Provide pre-built agent templates so users can deploy common agent types without writing custom instructions.

### Step 8.1 — Template Definitions

Create `packages/agent/src/templates.ts`:

```typescript
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;        // lucide icon name
  category: string;
  suggestedCapabilities: {
    scope: CapabilityScope;
    perTxLimit: number;  // SOL
    dailyLimit: number;  // SOL
    totalLimit: number;  // SOL
    expiryDays: number;
  }[];
  systemPrompt: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'payment-agent',
    name: 'Payment Agent',
    description: 'Monitors invoices and auto-pays within your set limits. Reports all transactions with receipts.',
    icon: 'CreditCard',
    category: 'Finance',
    suggestedCapabilities: [{
      scope: 'Payment',
      perTxLimit: 0.5,
      dailyLimit: 5,
      totalLimit: 50,
      expiryDays: 30,
    }],
    systemPrompt: `You are a Payment Agent. Your responsibilities:
1. When asked, check for pending invoices or payment requests
2. Evaluate each payment against your spending limits
3. Execute payments that fall within your authorized limits
4. Always provide a clear memo describing each payment
5. Report transaction signatures for verification
6. If a payment exceeds your limits, inform the user and suggest they adjust your capabilities
7. Periodically report your remaining daily and total budgets`
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Collects information, analyzes data, and stores structured findings on-chain via DataBlink.',
    icon: 'Search',
    category: 'Data',
    suggestedCapabilities: [{
      scope: 'DataAction',
      perTxLimit: 0.01,
      dailyLimit: 0.1,
      totalLimit: 1,
      expiryDays: 90,
    }],
    systemPrompt: `You are a Research Agent. Your responsibilities:
1. When given a research topic, analyze it thoroughly
2. Structure your findings as JSON data
3. Store important findings on-chain via the store_data tool
4. Categorize data with meaningful task_type labels
5. Provide summaries of your stored research when asked
6. Track what you've already stored to avoid duplicates`
  },
  {
    id: 'compliance-agent',
    name: 'Compliance Agent',
    description: 'Reviews documents, verifies compliance, and provides on-chain attestations via Document Registry.',
    icon: 'Shield',
    category: 'Legal',
    suggestedCapabilities: [{
      scope: 'DocumentSign',
      perTxLimit: 0.01,
      dailyLimit: 0.1,
      totalLimit: 1,
      expiryDays: 90,
    }],
    systemPrompt: `You are a Compliance Agent. Your responsibilities:
1. When presented with a document hash, review the associated document
2. Evaluate compliance against standard criteria
3. If the document passes review, sign it on-chain using sign_document
4. Include detailed metadata explaining your compliance assessment
5. If the document fails review, explain why and do NOT sign it
6. Keep a log of all reviewed documents`
  },
  {
    id: 'general-agent',
    name: 'General Purpose Agent',
    description: 'A flexible agent that can perform payments, data actions, and document signing based on your instructions.',
    icon: 'Bot',
    category: 'General',
    suggestedCapabilities: [
      { scope: 'Payment', perTxLimit: 0.1, dailyLimit: 1, totalLimit: 10, expiryDays: 30 },
      { scope: 'DataAction', perTxLimit: 0.01, dailyLimit: 0.1, totalLimit: 1, expiryDays: 30 },
    ],
    systemPrompt: `You are a General Purpose Agent. You can:
1. Execute SOL payments within your authorized limits
2. Store data on-chain via DataBlink
3. Always check your capabilities before attempting actions
4. Report your status and remaining budgets when asked
5. Follow your principal's instructions carefully`
  },
];
```

### Step 8.2 — Template Selection in Wizard

Go back to the Agent Deployment Wizard (`app/vault/agents/new/page.tsx`).

Add a **Step 0** before the current Step 1:

**Step 0: Choose Agent Type**
- Show the templates as selectable cards in a grid
- Each card shows: icon, name, description, category badge
- Also include a "Custom Agent" card for users who want to configure everything manually
- When a template is selected, pre-fill:
  - Step 1: Agent name (template name + incrementing number), Agent type (from template)
  - Step 2: Capabilities (from template's suggestedCapabilities)
  - The system prompt is stored for use when the user starts the agent later

The user can still modify any pre-filled values.

### Step 8.3 — Template in Agent Configuration Modal

When the user opens the "Configure & Start Agent" modal (Phase 7, Step 7.2), if the agent was deployed from a template, pre-fill the system prompt from the template. The user can still edit it.

**STOP. Confirm templates render in the wizard, pre-fill works, and the full flow from template → deploy → configure → chat works end-to-end.**

---

## REFERENCE: Full Package Structure

```
packages/
  sdk/
    src/
      index.ts           # barrel exports
      client.ts          # HumanRailClient (read-only)
      agent.ts           # HumanRailAgent (read + write, agent-side)
      principal.ts       # HumanRailPrincipal (unsigned tx builder, frontend-side)
      instructions.ts    # raw TransactionInstruction builders
      parsers.ts         # buffer → typed object parsers
      constants.ts       # program IDs + PDA derivation helpers
      types.ts           # all TypeScript interfaces
      errors.ts          # typed error classes
    tests/
      read.test.ts
      write.test.ts
    package.json
    tsconfig.json

  agent/
    src/
      index.ts           # barrel exports + createAgent factory
      runtime.ts         # AgentRuntime — main agent loop
      executor.ts        # ToolExecutor — maps tool calls to SDK
      tools.ts           # HUMANRAIL_TOOLS definitions
      server.ts          # HTTP + WebSocket server
      templates.ts       # pre-built agent templates
      providers/
        types.ts         # LLMProvider interface
        claude.ts        # ClaudeProvider
        openai.ts        # OpenAIProvider
    tests/
      runtime.test.ts
      server.test.ts
    package.json
    tsconfig.json
```

## REFERENCE: Environment Variables

Add these to `.env.example`:

```env
# Existing
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# New — Agent Server
NEXT_PUBLIC_AGENT_SERVER_URL=http://localhost:4000
AGENT_SERVER_SECRET=your-secret-token-here

# New — LLM API Keys (server-side only, NEVER NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

**CRITICAL:** LLM API keys must NEVER be prefixed with `NEXT_PUBLIC_`. They are only used server-side in the agent runtime. The frontend sends the user's API key to the agent server via HTTPS — it is never embedded in client-side JavaScript.
