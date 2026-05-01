# HumanRail dWallet Guard Program

> On-chain policy controller for Ika cross-chain signing.  
> Path: `programs/humanrail-dwallet-guard/`  
> Status: **Phase 2C complete** — SBF-buildable, IDL generated, program ID assigned.  
**Deployment:** Blocked — devnet airdrop faucet rate-limited (0 SOL in deployer wallet).  
**Program ID:** `G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF`

---

## Purpose

The HumanRail dWallet Guard is a Solana program that sits between HumanRail's policy layer and Ika's cross-chain signing layer. It enforces programmable guardrails before any Ika `approve_message` CPI is executed.

### Key Responsibilities
1. **Store policy** — Per-dWallet limits, allowed chains/assets/recipients, expiry, freeze state.
2. **Record requests** — Every signing attempt creates an immutable `GuardSigningRequest`.
3. **Enforce policy** — Rejects requests that exceed limits or violate constraints.
4. **CPI to Ika** — Only calls `approve_message` when all policy checks pass.
5. **Freeze/unfreeze** — Principal can instantly halt all future approvals.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HUMAN PRINCIPAL                          │
└──────────────┬──────────────────────────────────────────────┘
               │ initialize / freeze / unfreeze
               ▼
┌─────────────────────────────────────────────────────────────┐
│              GuardedDwallet (PDA)                           │
│  ├─ principal, agent, capability references                 │
│  ├─ allowed_chain_id, asset_hash, recipient_hash            │
│  ├─ per_tx_limit, daily_limit, total_limit                  │
│  ├─ daily_spent, total_spent, last_spend_day                │
│  ├─ expires_at, frozen                                      │
└──────────────┬──────────────────────────────────────────────┘
               │ approve_guarded_message
               ▼
┌─────────────────────────────────────────────────────────────┐
│         GuardSigningRequest (PDA)                           │
│  ├─ request_id, message_digest, metadata_digest             │
│  ├─ destination_chain_id, asset_hash, recipient_hash        │
│  ├─ amount, signature_scheme                                │
│  ├─ status (pending/approved/rejected)                      │
│  ├─ rejection_code                                          │
│  └─ ika_message_approval                                    │
└──────────────┬──────────────────────────────────────────────┘
               │ CPI (if approved)
               ▼
┌─────────────────────────────────────────────────────────────┐
│              IKA approve_message                            │
│  ├─ dWallet                                                 │
│  ├─ message_approval PDA                                    │
│  ├─ CPI authority PDA (signer)                              │
│  └─ config + coordinator accounts                           │
└─────────────────────────────────────────────────────────────┘
```

---

## PDA Seeds

| PDA | Seeds | Program ID |
|-----|-------|------------|
| `CPI Authority` | `["__ika_cpi_authority"]` | HumanRail dWallet Guard |
| `GuardedDwallet` | `["guarded_dwallet", principal, agent, dwallet]` | HumanRail dWallet Guard |
| `GuardSigningRequest` | `["guard_signing_request", guarded_dwallet, request_id]` | HumanRail dWallet Guard |

The CPI authority PDA is derived from the Guard program's own ID so that the Guard program can sign for it during CPI into Ika. Ika verifies that the caller's program-derived address matches `find_program_address(["__ika_cpi_authority"], caller_program_id)`.

---

## Account Layouts

### GuardedDwallet

| Field | Type | Offset | Size |
|-------|------|--------|------|
| *(discriminator)* | — | 0 | 8 |
| version | u8 | 8 | 1 |
| principal | Pubkey | 9 | 32 |
| human_profile | Pubkey | 41 | 32 |
| agent | Pubkey | 73 | 32 |
| humanrail_capability | Pubkey | 105 | 32 |
| dwallet | Pubkey | 137 | 32 |
| allowed_chain_id | u32 | 169 | 4 |
| allowed_asset_hash | [u8; 32] | 173 | 32 |
| allowed_recipient_hash | [u8; 32] | 205 | 32 |
| per_tx_limit | u64 | 237 | 8 |
| daily_limit | u64 | 245 | 8 |
| total_limit | u64 | 253 | 8 |
| daily_spent | u64 | 261 | 8 |
| total_spent | u64 | 269 | 8 |
| last_spend_day | i64 | 277 | 8 |
| expires_at | i64 | 285 | 8 |
| frozen | bool | 293 | 1 |
| bump | u8 | 294 | 1 |
| **Total** | | | **295** |

Anchor `space` allocated: 360 bytes (includes padding for future fields).

### GuardSigningRequest

| Field | Type | Size |
|-------|------|------|
| *(discriminator)* | — | 8 |
| version | u8 | 1 |
| request_id | [u8; 32] | 32 |
| guarded_dwallet | Pubkey | 32 |
| principal | Pubkey | 32 |
| agent | Pubkey | 32 |
| dwallet | Pubkey | 32 |
| message_digest | [u8; 32] | 32 |
| message_metadata_digest | [u8; 32] | 32 |
| destination_chain_id | u32 | 4 |
| asset_hash | [u8; 32] | 32 |
| recipient_hash | [u8; 32] | 32 |
| amount | u64 | 8 |
| signature_scheme | u16 | 2 |
| status | u8 | 1 |
| rejection_code | u16 | 2 |
| ika_message_approval | Pubkey | 32 |
| created_at | i64 | 8 |
| bump | u8 | 1 |
| **Total** | | **387** |

Anchor `space` allocated: 440 bytes.

---

## Instructions

### `initialize_guarded_dwallet`

Create a `GuardedDwallet` policy account.

**Signer:** `principal`

**Accounts:**
- `principal` — signer, pays for account creation
- `guarded_dwallet` — PDA to initialize
- `human_profile` — Human Registry account (owner checked)
- `agent` — Agent Registry account (owner checked)
- `humanrail_capability` — Delegation capability account (owner checked)
- `dwallet` — Ika dWallet pubkey reference
- `system_program`

**Arguments:**
- `allowed_chain_id: u32`
- `allowed_asset_hash: [u8; 32]`
- `allowed_recipient_hash: [u8; 32]`
- `per_tx_limit: u64`
- `daily_limit: u64`
- `total_limit: u64` (0 = unlimited)
- `expires_at: i64`

**Checks:**
- `expires_at > now`
- `per_tx_limit > 0`
- `daily_limit > 0`
- `per_tx_limit <= daily_limit`
- `daily_limit <= total_limit` (if `total_limit > 0`)
- Account owners match HumanRail program IDs

### `freeze_guarded_dwallet`

Set `frozen = true`. Only the principal can freeze.

**Signer:** `principal` (must match `GuardedDwallet.principal`)

### `unfreeze_guarded_dwallet`

Set `frozen = false`. Only the principal can unfreeze.

**Signer:** `principal` (must match `GuardedDwallet.principal`)

### `approve_guarded_message`

Create a `GuardSigningRequest` and, if policy passes, CPI-call Ika `approve_message`.

**Signers:** Either the `principal` OR the agent's `signing_key` (verified against Agent Registry account).

**Accounts:**
- `requester` — signer
- `guarded_dwallet` — mut
- `guard_signing_request` — PDA to initialize
- `dwallet` — must match `GuardedDwallet.dwallet`
- `agent_registry_account` — optional, for agent signer verification
- `cpi_authority` — PDA `["__ika_cpi_authority"]`
- `ika_program` — Ika program ID
- `ika_config` — Ika config account
- `ika_coordinator` — Ika coordinator account
- `message_approval` — Ika MessageApproval PDA (created by Ika CPI)
- `system_program`

**Arguments:**
- `request_id: [u8; 32]`
- `message_digest: [u8; 32]`
- `message_metadata_digest: [u8; 32]`
- `destination_chain_id: u32`
- `asset_hash: [u8; 32]`
- `recipient_hash: [u8; 32]`
- `amount: u64`
- `user_pubkey: [u8; 32]`
- `signature_scheme: u16`
- `message_approval_bump: u8`

**Policy checks (in order):**
1. Signer authorization (principal or agent signing key)
2. dWallet matches `GuardedDwallet.dwallet`
3. `frozen == false`
4. `now <= expires_at`
5. `destination_chain_id == allowed_chain_id`
6. `asset_hash == allowed_asset_hash`
7. `recipient_hash == allowed_recipient_hash`
8. `amount > 0`
9. `amount <= per_tx_limit`
10. `daily_spent + amount <= daily_limit` (with daily reset)
11. `total_spent + amount <= total_limit` (if `total_limit > 0`)

**Success:**
- `GuardSigningRequest.status = 1` (approved)
- Spend counters updated
- Ika CPI executed

**Failure:**
- `GuardSigningRequest.status = 2` (rejected)
- `rejection_code` set
- No Ika CPI
- No spend counter update

---

## Policy Checks Detail

### Daily Reset

```rust
let current_day = now / 86400;
if current_day != guarded_dwallet.last_spend_day {
    guarded_dwallet.daily_spent = 0;
    guarded_dwallet.last_spend_day = current_day;
}
```

This ensures daily limits reset automatically every 24 hours.

### Rejection Codes

| Code | Name | Trigger |
|------|------|---------|
| 0 | `None` | Approved |
| 1 | `Frozen` | `guarded_dwallet.frozen == true` |
| 2 | `Expired` | `now > expires_at` |
| 3 | `ChainNotAllowed` | `destination_chain_id != allowed_chain_id` |
| 4 | `AssetNotAllowed` | `asset_hash != allowed_asset_hash` |
| 5 | `RecipientNotAllowed` | `recipient_hash != allowed_recipient_hash` |
| 6 | `InvalidAmount` | `amount == 0` |
| 7 | `PerTxLimitExceeded` | `amount > per_tx_limit` |
| 8 | `DailyLimitExceeded` | `daily_spent + amount > daily_limit` |
| 9 | `TotalLimitExceeded` | `total_spent + amount > total_limit` |
| 10 | `DwalletMismatch` | `dwallet != GuardedDwallet.dwallet` |
| 11 | `UnauthorizedPrincipal` | Signer is not principal or agent signing key |

---

## Ika CPI Authority Flow

1. During `initialize_guarded_dwallet`, the dWallet authority is **not yet transferred**. The transfer must happen in a separate transaction (or UI flow) before `approve_guarded_message` can succeed.
2. The CPI authority PDA is derived as:
   ```
   find_program_address(["__ika_cpi_authority"], humanrail_dwallet_guard_program_id)
   ```
3. The dWallet owner calls Ika to transfer authority to this PDA.
4. When `approve_guarded_message` CPI-calls Ika, it passes the CPI authority PDA as a signer via `invoke_signed`.
5. Ika verifies the signer is the correct PDA for the calling program.

---

## Ika approve_message Flow

```
approve_guarded_message
        │
        ├─── Policy checks ────► Rejected? ──► Create GuardSigningRequest (rejected) ──► Return Ok
        │
        └─── Approved ──► Update spend counters ──► Create GuardSigningRequest (approved)
                                    │
                                    ▼
                         CPI: ika::approve_message
                                    │
                                    ├─── dWallet
                                    ├─── message_approval (created by Ika)
                                    ├─── cpi_authority (signer, PDA)
                                    ├─── ika_config
                                    ├─── ika_coordinator
                                    └─── system_program
                                    │
                                    ▼
                         Ika network processes signing request
                         (mock signer in pre-alpha)
```

---

## Pre-Alpha Limitations

- Ika uses a **single mock signer**, not real MPC.
- Devnet data is **wiped periodically**.
- Ika uses a **single mock signer**, not real MPC (pre-alpha limitation).
- Devnet data is **wiped periodically**.
- `ika-dwallet-anchor` interfaces may change as Ika evolves.

---

## How to Build / Check / Deploy

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Rust | 1.75+ |
| Solana CLI | 3.1.14+ |
| Anchor CLI | 1.0.0+ |

### Install (if missing)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.14/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 1.0.0
avm use 1.0.0
```

### Build

```bash
cd programs/humanrail-dwallet-guard
cargo build --features no-idl
# For Solana target:
# cargo build-sbf --features no-idl
```

### Check

```bash
cargo check
cargo clippy
```

### Deploy (devnet)

**Current blocker:** Deployer wallet `5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y` has 0 SOL.  
Devnet airdrop faucet returned `429` rate-limit error repeatedly.

```bash
solana config set --url devnet
solana program deploy target/deploy/humanrail_dwallet_guard.so \
  --program-id target/deploy/humanrail_dwallet_guard-keypair.json
```

After deployment succeeds, verify:
```bash
solana program show G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF --url devnet
```

### Update Frontend/SDK

After deployment, verify these are already updated (done in Phase 2C):
1. ✅ `packages/sdk/src/constants.ts` — `HUMANRAIL_DWALLET_GUARD_PROGRAM_ID_DEVNET`
2. ✅ `lib/programs/index.ts` — `PROGRAM_IDS.devnet.dwalletGuard`
3. ✅ `programs/humanrail-dwallet-guard/src/lib.rs` — `declare_id!()`
4. ✅ `lib/idl/humanrail_dwallet_guard.json` — IDL copied from `target/idl/`
5. ✅ `Anchor.toml` — `[programs.devnet]` entry

---

## Phase 3 — Frontend Integration (COMPLETE)

### New Route: `/vault/dwallets`

A dedicated vault page for managing guarded dWallets:
- **Config & PDAs tab** — Shows Guard program status (configured/deployed), Ika protocol config, and derived PDAs (CPI authority, GuardedDwallet, GuardSigningRequest).
- **Policy Creation tab** — Form to define guardrails (agent, dWallet, chain ID, asset/recipient hashes, limits, expiry). Includes demo hash computation.
- **Signing Request tab** — Form to submit cross-chain signing requests with keccak256 digest, signature scheme selector, and status preview cards (Pending / Approved / Rejected / Ika Signed).

### Deployment Gating
All transaction buttons are disabled until `connection.getAccountInfo(guardProgramId)` confirms the program is executable on-chain. If not deployed, a banner shows:
> "Guard program not deployed yet — SBF build complete; deploy pending devnet SOL"

### SDK / Lib Modules Added
- `lib/hooks/use-dwallet-guard.ts` — Deployment check, PDA derivations, account parsers
- `lib/dwallet-guard/utils.ts` — keccak256, policy hash helpers, signature scheme enum
- `lib/dwallet-guard/instructions.ts` — Raw `TransactionInstruction` builders for all 4 instructions
- `lib/dwallet-guard/noble-hashes.d.ts` — Type declarations for `@noble/hashes/sha3`

### Transaction Builders
Implemented as raw instruction builders using exact IDL discriminators and account order. Buttons are gated by `isDeployed`. Full transaction signing is deferred to Phase 4 (agent runtime + live Ika gRPC).

---

## What Remains for Phase 4

1. **Fund deployer wallet** — Devnet airdrop or faucet to get ≥2 SOL for program deployment.
2. **Deploy to devnet** — Run `anchor deploy --provider.cluster devnet` or `solana program deploy`.
3. **Validate parsers** — Update `packages/sdk/src/parsers.ts` with exact offsets from the IDL.
4. **dWallet authority transfer** — Build UI flow to transfer dWallet authority to the CPI authority PDA.
5. **gRPC client** — Implement `lib/ika/client.ts` for off-chain signing request submission.
6. **Receipt integration** — Optionally emit HumanRail Receipts on approve/reject.
7. **Tests** — Write Rust unit tests + TypeScript integration tests against devnet.
