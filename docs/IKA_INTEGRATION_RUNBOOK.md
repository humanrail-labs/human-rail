# Ika Integration Runbook — HumanRail dWallet Guard

> Current active HumanRail Guard program ID:
> `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2`
>
> Last updated: 2026-05-01

---

## Pre-Alpha Disclaimer

Ika is currently in **pre-alpha**. All of the following applies to the pre-alpha devnet deployment only:

- **Single mock signer** — There is no real 2PC-MPC network yet. Signatures are produced by a mock coordinator for testing purposes.
- **Data wiped periodically** — Devnet state (dWallets, MessageApprovals, etc.) may be reset without notice.
- **Interface subject to change** — Instruction layouts, account structures, and gRPC APIs may change between versions.
- **Not production custody** — Do not use pre-alpha Ika for real assets. This is explicitly a development and demonstration environment.

---

## Devnet Configuration

| Parameter | Value |
|-----------|-------|
| HumanRail Guard Program ID | `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2` |
| HumanRail Guard CPI Authority PDA | `find_program_address(["__ika_cpi_authority"], Bzxgv...)` |
| Ika dWallet Program ID | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |
| Ika gRPC Endpoint | `https://pre-alpha-dev-1.ika.ika-network.net:443` |
| Solana Devnet RPC | `https://api.devnet.solana.com` |
| CPI Authority Seed | `__ika_cpi_authority` |

---

## Complete Target Lifecycle

```
1. DKG (gRPC)
   └── User calls SubmitTransaction(DWalletRequest::DKG)
   └── Ika mock network generates keypair
   └── Response: NetworkSignedAttestation with dWallet public key

2. dWallet on-chain commit
   └── Mock commits dWallet account to Solana devnet
   └── Account: DWallet PDA (discriminator=2)

3. Authority transfer
   └── User sends transfer_ownership instruction to Ika program
   └── New authority = HumanRail Guard CPI authority PDA
   └── Now the Guard program can sign approve_message CPI calls

4. GuardedDwallet policy creation
   └── User calls initialize_guarded_dwallet (or demo variant)
   └── Creates GuardedDwallet PDA with limits, chains, expiry
   └── Links to the Ika dWallet pubkey

5. Signing request
   └── Agent/principal calls approve_guarded_message
   └── Guard checks policy (limits, chain, expiry, freeze)
   └── If approved: CPI to Ika approve_message
   └── Ika creates MessageApproval PDA (status=Pending)

6. gRPC Sign
   └── User calls SubmitTransaction(DWalletRequest::Sign)
   └── Provides: presign, approval_proof, dwallet_attestation
   └── Ika mock network produces signature
   └── Commits signature on-chain

7. Signature readable
   └── MessageApproval status updates to Signed (1)
   └── Signature bytes stored at offset 175
   └── User can read signature from Solana account
```

---

## Phase 4B — What Already Works

- Guard program deployed to devnet (`Bzxgv...`)
- Demo initializer creates GuardedDwallet without HumanRail owner checks
- Freeze/unfreeze lifecycle tested
- Rejected signing request path verified (status=2, code=7)
- Phase 4B PDAs:
  - GuardedDwallet: `FNt1H6B4ZyDMPvZj2VUX5KYr6PjwYLCxWAgjifoeFM4b`
  - GuardSigningRequest: `AwQUee1KHkitvEy3BAAM9ostZdDawxiquMaoSnuwUsqV`

---

## Phase 5A — What This Phase Adds (COMPLETE)

- **Deterministic Ika constants** (`lib/ika/constants.ts`) — program IDs, endpoints, offsets, discriminators
- **TypeScript enums/types** (`lib/ika/types.ts`) — DWalletCurve, DWalletState, IkaSignatureScheme, MessageApprovalStatus
- **PDA derivation helpers** (`lib/ika/pda.ts`) — dWallet PDA, MessageApproval PDA, CPI authority PDA, coordinator PDA
- **Account parsers** (`lib/ika/parsers.ts`) — parseIkaDwalletAccount, parseIkaMessageApprovalAccount
- **Honest client interface** (`lib/ika/client.ts`) — read-only methods implemented, mutation methods throw explicit errors
- **Devnet inspect script** (`scripts/devnet-inspect-ika.ts`) — verifies Ika program status, derives PDAs, fetches accounts
- **UI readiness panel** (`/vault/dwallets`) — displays Ika config, allows deriving/fetching dWallet and MessageApproval accounts

**All values are sourced from the official Ika pre-alpha crates**, not guessed:
- `ika-dwallet-anchor` (git: dwallet-labs/ika-pre-alpha, rev 3bd7945)
- `ika-dwallet-types`
- `chains/solana/examples/_shared/ika-setup.ts`
- `chains/solana/examples/voting/e2e-rust/src/main.rs`

---

## Phase 5B — Create Real Ika dWallet via gRPC/DKG (NEXT)

**Goal:** Execute a real DKG flow and create an on-chain dWallet.

**Blockers/Questions:**
1. **gRPC request construction** — Need to BCS-serialize `SignedRequestData { request: DWalletRequest::DKG { ... } }`
2. **User signature** — The gRPC request requires an Ed25519 user signature over the BCS payload. In pre-alpha, the mock accepts zeroed signatures, but we need to confirm this for the live devnet.
3. **CommitDWallet** — After DKG, the mock should commit the dWallet on-chain automatically. Need to verify the polling logic.

**Implementation plan:**
- Add `createDwalletViaDkg()` to `IkaClient`
- Use `@mysten/bcs` for serialization (already used in ika-setup.ts)
- Build `UserSignedRequest` with Ed25519 signature
- Poll for dWallet PDA after DKG response

---

## Phase 5C — Transfer Authority + Real Signing Request

**Goal:** Transfer dWallet authority to Guard CPI PDA, then execute a real `approve_guarded_message` that passes policy and CPI-calls Ika.

**Blockers/Questions:**
1. **Authority transfer transaction** — Simple Solana tx with TransferOwnership instruction. Needs current authority (payer) to sign.
2. **MessageApproval PDA derivation** — Verified from e2e-rust: hierarchical seeds with dWallet prefix + scheme + message digest.
3. **Coordinator account** — Need to pass the DWalletCoordinator PDA to approve_message. Derivation: `["dwallet_coordinator"]`.

---

## Phase 5D — gRPC Sign + Signature Verification

**Goal:** Submit a `DWalletRequest::Sign` via gRPC and verify the signature is committed on-chain.

**Blockers/Questions:**
1. **Presign allocation** — Must call `Presign` or `PresignForDWallet` via gRPC before signing.
2. **ApprovalProof construction** — `ApprovalProof::Solana { transaction_signature, slot }`. The transaction signature comes from the `approve_guarded_message` Solana tx.
3. **Polling for signature** — After gRPC Sign, poll MessageApproval until status=Signed.

---

## Phase 5E — Agent Runtime Integration

**Goal:** Add `request_cross_chain_signature` tool to the agent runtime.

**Blockers/Questions:**
1. **Agent capability check** — Verify the agent has an active HumanRail capability before creating a GuardSigningRequest.
2. **Message formatting** — Convert user intent ("send 0.005 ETH to 0xABC...") into keccak256 message digest.
3. **Receipt emission** — Emit HumanRail Receipts on approve/reject.

---

## Open Implementation Questions

### gRPC Request Construction
- Exact BCS serialization of `SignedRequestData` and `DWalletRequest` variants
- Whether the pre-alpha mock still accepts zeroed Ed25519 signatures
- How to handle `session_identifier_preimage` (must be unique per DKG)

### Rust CLI vs JS Client
- The e2e-rust example uses tonic gRPC client with BCS serialization
- The TypeScript example uses `@grpc/grpc-js` with `@grpc/proto-loader`
- Both approaches work; JS is better for frontend integration, Rust for scripts

### DWalletCoordinator / SystemState PDA
- Derivation: `["dwallet_coordinator"]` under the Ika program ID
- Must be present and active before any approve_message CPI
- On devnet, the mock initializes this automatically

### MessageApproval PDA Derivation
- Verified seeds: `["dwallet", chunks(curve_u16_le || pk), "message_approval", scheme_u16_le, message_digest]`
- **Important:** The seeds include the dWallet PDA prefix, not just the dWallet pubkey
- The scheme is u16 LE, not a single byte

### Sign ApprovalProof Payload
- `ApprovalProof::Solana { transaction_signature: Vec<u8>, slot: u64 }`
- `transaction_signature` is the base58-decoded Solana tx signature from approve_guarded_message
- `slot` can be 0 in pre-alpha (mock doesn't verify it strictly)

### Gas Deposit Requirements
- dWallet account creation requires rent exemption (~0.005 SOL for 692 bytes)
- MessageApproval creation requires rent exemption (~0.003 SOL for ~287 bytes)
- The Guard program's `approve_guarded_message` pays for MessageApproval creation via CPI
- No additional gas deposit mechanism is currently documented for pre-alpha

---

## Crate Availability in This Repo

| Crate | Status | Source |
|-------|--------|--------|
| `ika-dwallet-anchor` | ✅ Installed | Cargo.toml git dependency |
| `ika-dwallet-types` | ✅ Available | Same git repo, used by e2e examples |
| `ika-grpc` | ✅ Available | Same git repo, generated protobuf types |
| `ika-solana-sdk-types` | ✅ Available | `chains/solana/sdk/types` — SystemState, Validator, StakeAccount readers |
| `ika-grpc` npm package | ❌ Not installed | Would require `@grpc/grpc-js` + proto compilation |

The repo currently has `ika-dwallet-anchor` as a Rust dependency only. No npm `@ika/grpc` or similar package is installed. For Phase 5B gRPC integration, we will either:
1. Use `@grpc/grpc-js` + `@grpc/proto-loader` (matching the TypeScript example)
2. Or create a small Rust CLI tool that uses `ika_grpc` crate directly

---

## References

- Ika pre-alpha repo: `https://github.com/dwallet-labs/ika-pre-alpha` (rev `3bd7945`)
- `ika-dwallet-anchor` CPI SDK: `chains/solana/program-sdk/anchor/src/lib.rs`
- TypeScript shared setup: `chains/solana/examples/_shared/ika-setup.ts`
- E2E Rust voting example: `chains/solana/examples/voting/e2e-rust/src/main.rs`
- E2E Rust multisig example: `chains/solana/examples/multisig/e2e-rust/src/main.rs`
