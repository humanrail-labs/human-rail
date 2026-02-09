# HumanRail Integration Cookbook

Practical patterns for integrating HumanRail into your dApp, service, or AI agent framework.

## Quick Reference

| I want to... | Pattern | Programs involved |
|---|---|---|
| Gate an action behind human verification | [Human Gate](#human-gate) | human_registry |
| Run a KYC flow and issue attestations | [KYC Issuer](#kyc-issuer) | human_registry |
| Register an AI agent under a human | [Agent Registration](#agent-registration) | agent_registry, human_registry |
| Delegate spending power to an agent | [Capability Delegation](#capability-delegation) | delegation |
| Log agent actions on-chain | [Receipt Logging](#receipt-logging) | receipts |
| Build a full end-to-end flow | [Hello HumanRail](#hello-humanrail) | all |

## Program IDs (Devnet)
```
human_registry  = GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo
agent_registry  = GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ
delegation      = DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT
receipts        = EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM
```

---

## Human Gate

**Use case:** Require a minimum humanity score before allowing a swap, mint, vote, or any on-chain action.

**How it works:**

1. Derive the user's HumanProfile PDA: `seeds = ["human_profile", wallet_pubkey]`
2. Fetch the account and read `humanity_score` (u16 at byte offset 40)
3. Compare against your threshold

**TypeScript (using SDK):**
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { deriveHumanProfile, fetchHumanProfile } from '@humanrail/sdk';

async function isHuman(connection: Connection, wallet: PublicKey): Promise<boolean> {
  const profile = await fetchHumanProfile(connection, wallet);
  return profile.humanityScore >= 60;
}
```

**TypeScript (zero dependencies):**
```typescript
// See examples/gated-action/ for full implementation
const [profilePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('human_profile'), wallet.toBuffer()],
  new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo')
);
const info = await connection.getAccountInfo(profilePda);
const score = new DataView(info.data.buffer, info.data.byteOffset).getUint16(40, true);
```

**On-chain (Rust CPI):**
```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct GatedAction<'info> {
    pub user: Signer<'info>,
    /// CHECK: Verified via CPI to human_registry::verify_human
    pub human_profile: AccountInfo<'info>,
    pub human_registry_program: Program<'info, HumanRegistry>,
}

pub fn gated_action(ctx: Context<GatedAction>) -> Result<()> {
    // CPI: verify_human checks score >= threshold
    let cpi_ctx = CpiContext::new(
        ctx.accounts.human_registry_program.to_account_info(),
        VerifyHuman { profile: ctx.accounts.human_profile.to_account_info() },
    );
    human_registry::cpi::verify_human(cpi_ctx, VerifyHumanParams {
        min_score: 60,
        require_unique: false,
    })?;

    // If we reach here, the user is verified
    msg!("Human verified! Proceeding with action.");
    Ok(())
}
```

---

## KYC Issuer

**Use case:** You're a KYC provider (or using one like Veriff) and want to issue HumanRail attestations.

**Architecture:**
```
User ──> Your Frontend ──> KYC Service ──> Veriff
                                │
                                ▼ (on approval)
                           Solana: issue_attestation
                           (Ed25519 signed + precompile verified)
```

**Steps:**

1. **Register as issuer** (one-time admin operation):
```bash
   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/register-veriff-issuer.ts .keys/veriff-issuer.json
```

2. **Run the KYC service:**
```bash
   cd services/kyc-issuer
   cp .env.example .env  # fill in Veriff credentials
   npm run dev
```

3. **Frontend integration:**
```typescript
   // 1. Create session
   const { sessionId, verificationUrl } = await fetch('/kyc/session', {
     method: 'POST',
     body: JSON.stringify({ walletPubkey: wallet.publicKey.toBase58() }),
   }).then(r => r.json());

   // 2. Redirect user to Veriff
   window.open(verificationUrl);

   // 3. Poll status
   const status = await fetch(`/kyc/status?walletPubkey=${wallet.publicKey.toBase58()}`)
     .then(r => r.json());
   // status.status === 'attested' means on-chain attestation exists
```

**Attestation signing format (146 bytes):**

| Offset | Size | Field |
|---|---|---|
| 0 | 24 | Domain: `humanrail:attestation:v1` |
| 24 | 32 | Profile PDA |
| 56 | 32 | Issuer PDA |
| 88 | 32 | Payload hash (SHA256, no PII) |
| 120 | 2 | Weight (u16 LE) |
| 122 | 8 | issued_at (i64 LE) |
| 130 | 8 | expires_at (i64 LE) |
| 138 | 8 | Nonce (u64 LE) |

The issuer signs this message with Ed25519. The transaction includes an Ed25519SigVerify precompile instruction followed by `issue_attestation`.

---

## Agent Registration

**Use case:** Register an AI agent (trading bot, assistant, automation) under a human principal.

**Requirements:**
- Human must have a profile with `humanity_score >= 50`
```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { registerAgent } from '@humanrail/sdk';
import { BN } from '@coral-xyz/anchor';

const signingKey = Keypair.generate(); // agent's operational key
const nonce = new BN(Date.now());

const ix = await registerAgent(provider, wallet.publicKey, {
  name: Array.from(padBytes('MyTradingBot', 32)),
  signingKey: signingKey.publicKey,
  metadataHash: Array.from(new Uint8Array(32)),
  nonce,
});
```

**PDA derivation:**
```
agent = seeds["agent", principal_pubkey, nonce_u64_le] @ agent_registry
operator_stats = seeds["operator_stats", agent_pda] @ agent_registry
```

---

## Capability Delegation

**Use case:** Give an AI agent permission to act on your behalf with specific limits.
```typescript
import { issueCapability } from '@humanrail/sdk';
import { BN } from '@coral-xyz/anchor';

const ix = await issueCapability(provider, wallet.publicKey, agentPda, {
  allowedPrograms: new BN(0xFFFFFFFF),  // bitmask of allowed programs
  allowedAssets: new BN(0xFFFFFFFF),     // bitmask of allowed assets
  perTxLimit: new BN(1_000_000_000),     // 1 SOL per tx
  dailyLimit: new BN(10_000_000_000),    // 10 SOL/day
  totalLimit: new BN(100_000_000_000),   // 100 SOL lifetime
  maxSlippageBps: 500,                   // 5% max slippage
  maxFee: new BN(100_000_000),           // 0.1 SOL max fee
  validFrom: new BN(now),
  expiresAt: new BN(now + 30 * 86400),
  cooldownSeconds: 60,
  riskTier: 1,
  nonce: new BN(1),
  enforceAllowlist: false,
  destinationAllowlist: [],
});
```

**Emergency freeze:**
```typescript
// Principal can freeze all agent activity instantly
const freezeIx = await emergencyFreeze(provider, wallet.publicKey, capPda, agentPda);
```

---

## Receipt Logging

**Use case:** Log every agent action on-chain for auditability.
```typescript
import { emitReceipt } from '@humanrail/sdk';
import { BN } from '@coral-xyz/anchor';

const ix = await emitReceipt(provider, emitterPubkey, agentPda, {
  actionHash: Array.from(sha256('swap:SOL/USDC:1.5')),
  resultHash: Array.from(sha256('ok:tx:5xYz...')),
  actionType: 1,  // app-defined
  value: new BN(1_500_000_000),
  destination: targetPubkey,
  offchainRef: Array.from(padBytes('order-123', 32)),
  hasOffchainRef: true,
  nonce: new BN(1),
});
```

---

## Hello HumanRail

Full end-to-end example: profile → issuer → attestation → agent → capability → validate.
```bash
cd examples/hello-humanrail
npm install
ANCHOR_WALLET=~/.config/solana/id.json npx tsx hello.ts
```

See [examples/hello-humanrail/README.md](../../examples/hello-humanrail/README.md).

---

## PDA Reference

| Account | Seeds | Program |
|---|---|---|
| IssuerRegistry | `["issuer_registry"]` | human_registry |
| HumanProfile | `["human_profile", wallet]` | human_registry |
| Issuer | `["issuer", authority]` | human_registry |
| SignedAttestation | `["attestation", profile, issuer, nonce_u64_le]` | human_registry |
| AgentProfile | `["agent", principal, nonce_u64_le]` | agent_registry |
| OperatorStats | `["operator_stats", agent]` | agent_registry |
| KeyRotation | `["key_rotation", agent]` | agent_registry |
| Capability | `["capability", principal, agent, nonce_u64_le]` | delegation |
| Revocation | `["revocation", capability]` | delegation |
| FreezeRecord | `["freeze", principal, agent]` | delegation |
| UsageTracker | `["usage", capability]` | delegation |
| ActionReceipt | `["receipt", agent, nonce_u64_le]` | receipts |
| ReceiptIndex | `["receipt_index", entity]` | receipts |

---

## Error Codes

| Code | Program | Meaning |
|---|---|---|
| 6000 | human_registry | Unauthorized |
| 6001 | human_registry | AlreadyRevoked |
| 6002 | human_registry | ProfileMismatch |
| 6003 | human_registry | IssuerMismatch |
| 6000 | agent_registry | AgentNotActive |
| 6001 | agent_registry | Unauthorized |
| 6002 | agent_registry | InsufficientHumanScore |
| 6000 | delegation | CapabilityNotActive |
| 6001 | delegation | CapabilityRevoked |
| 6002 | delegation | LimitExceeded |

See `packages/sdk/src/errors.ts` for the full map.

---

## Nonce & Idempotency Rules

### Attestation nonce scope
- Nonce is scoped to `(profile_pda, issuer_pda)` pair
- The attestation PDA is derived as: `seeds["attestation", profile, issuer, nonce_u64_le]`
- Each unique nonce creates a new attestation PDA
- Reusing a nonce for the same (profile, issuer) will fail (PDA already exists)

### KYC service nonce tracking
- The KYC issuer service tracks nonces per wallet in SQLite
- `store.getNextNonce(wallet)` returns `MAX(nonce) + 1` for that wallet
- Nonce is assigned on `approved` status, before submitting the transaction

### Webhook idempotency
- If a Veriff webhook is delivered twice for the same session:
  - First delivery: processes normally, issues attestation
  - Subsequent deliveries: returns `{ status: "ok", note: "already_attested" }`
  - No double attestation is issued
- The idempotency key is `veriff_session_id` (primary key in sessions table)

### Webhook freshness
- Webhooks are rejected if `decisionTime` is more than ±15 minutes from server time
- This prevents replay of old webhook payloads
- Adjust `WEBHOOK_FRESHNESS_SECONDS` in server.ts if needed

### Failure modes
| Scenario | Behavior | Recovery |
|---|---|---|
| Webhook arrives, chain tx fails | Status set to `chain_error` | Manual retry or re-trigger from Veriff dashboard |
| Duplicate webhook after success | Returns `already_attested` | No action needed |
| Stale webhook (>15 min old) | Rejected with 400 | Veriff retries automatically |
| Nonce collision on-chain | Transaction fails (PDA exists) | Service increments nonce and retries |
| RPC timeout | Status stays `approved` (not `attested`) | Cron job or manual retry needed |

### Agent/Capability nonce
- Agent nonce is scoped to `(principal)` — typically use timestamp or sequential counter
- Capability nonce is scoped to `(principal, agent)` — use sequential counter starting from 1
- There is no on-chain nonce counter; the caller manages nonce uniqueness
