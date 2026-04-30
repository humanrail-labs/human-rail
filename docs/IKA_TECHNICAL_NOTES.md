# Ika Technical Notes — HumanRail Integration

> For developers implementing the HumanRail dWallet Guard program and frontend integration.  
> Last updated: 2026-04-30  

---

## Pre-Alpha Disclaimer

Ika is currently in **pre-alpha**. All of the following applies to the pre-alpha devnet deployment only:

- **Single mock signer** — There is no real 2PC-MPC network yet. Signatures are produced by a mock coordinator for testing purposes.
- **Data wiped periodically** — Devnet state (dWallets, MessageApprovals, etc.) may be reset without notice.
- **Interface subject to change** — Instruction layouts, account structures, and gRPC APIs may change between versions.
- **Not production custody** — Do not use pre-alpha Ika for real assets. This is explicitly a development and demonstration environment.

---

## Ika Devnet Configuration

| Parameter | Value |
|-----------|-------|
| Program ID | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |
| gRPC Endpoint | `https://pre-alpha-dev-1.ika.ika-network.net:443` |
| CPI Authority Seed | `__ika_cpi_authority` |

---

## Core Concepts

### dWallet
A dWallet is a decentralized signing key derived via 2PC-MPC. It is represented on-chain as a PDA owned by the Ika program. Each dWallet supports multiple cryptographic curves and can produce signatures for multiple chains.

### MessageApproval
When a program (or user) wants a dWallet to sign a message, they must first call `approve_message` on-chain. This creates a `MessageApproval` PDA with status `Pending`. After the gRPC signing flow completes, the status becomes `Signed` and the signature is available on-chain.

### CPI Authority
For a program to call `approve_message` on behalf of a dWallet, the dWallet's authority must be transferred to the program's **CPI authority PDA**. The CPI authority PDA is derived from the seed `"__ika_cpi_authority"` and the program's own program ID.

```
CPI Authority PDA = find_program_address(["__ika_cpi_authority"], ika_program_id)
```

**Important:** The dWallet authority must be transferred to this PDA **before** any `approve_message` CPI call can succeed. This is typically done once during guard initialization.

---

## approve_message Instruction

### Message Digest Requirement
The message digest passed to `approve_message` **MUST be keccak256**. Ika enforces this at the program level. If you pass a different hash function, the instruction will fail.

```rust
// Correct
let message_digest = keccak256(message_bytes);

// Incorrect — will fail
let message_digest = sha256(message_bytes);
```

### Supported Curves

| Curve | Use Case |
|-------|----------|
| `Secp256k1` | Bitcoin, Ethereum |
| `Secp256r1` | Passkeys, WebAuthn |
| `Curve25519` | General purpose |
| `Ristretto` | Privacy-preserving signatures |

### Supported Signature Schemes

| Scheme | Enum Value | Chain |
|--------|-----------|-------|
| `EcdsaKeccak256` | Ethereum personal sign / raw ECDSA | Ethereum, EVM chains |
| `EcdsaSha256` | Standard ECDSA | Generic |
| `EcdsaDoubleSha256` | Bitcoin transaction signing | Bitcoin |
| `TaprootSha256` | Bitcoin Taproot | Bitcoin |
| `EcdsaBlake2b256` | Cosmos / Substrate | Cosmos, Polkadot |
| `EddsaSha512` (Ed25519) | Solana, Cardano | Solana-native |
| `SchnorrkelMerlin` | Substrate | Polkadot |

### Account Layout (approximate)

The exact account layout for `approve_message` depends on the Ika crate version. Based on pre-alpha docs, the accounts typically include:

1. `dWallet` — The dWallet PDA
2. `message_approval` — The MessageApproval PDA to create (derived from dWallet + message digest)
3. `authority` — The dWallet authority (must be the CPI authority PDA for program calls)
4. `ika_config` — Ika protocol config account
5. `system_program` — For account creation
6. *(version-dependent)* `coordinator` — Coordinator account for the signing network
7. *(version-dependent)* `message_metadata_digest` — Additional metadata digest (u16-prefixed)

---

## gRPC Sign Lifecycle

After `approve_message` creates a `MessageApproval` with status `Pending`, the off-chain signing flow proceeds as follows:

```
1. Client creates a transaction on the Ika Sui chain:
   SubmitTransaction(
     DWalletRequest::Sign {
       dwallet_id,
       message: message_digest,
       approval_proof: MessageApproval PDA proof,
       signature_scheme,
       ...
     }
   )

2. Ika network processes the signing request (mock signer in pre-alpha)

3. Signature is produced and committed on-chain:
   CommitSignature {
     dwallet_id,
     message,
     signature,
     signature_scheme,
   }

4. MessageApproval status updates to Signed
```

### Important Notes
- The gRPC client must be initialized with the correct `DWalletContext` from the `ika-dwallet-*` crate.
- Do **not** hand-roll the byte layout for `DWalletRequest::Sign`. Use the official crate's serialization methods.
- The `approval_proof` is derived from the `MessageApproval` PDA and proves that on-chain approval was granted.

---

## Documentation Inconsistency Warning

Older sections of the Ika integration guide show `approve_message` accepting a **single-byte** `signature_scheme` parameter. Newer sections show a more complex layout with:
- `signature_scheme` as **u16**
- `message_metadata_digest` as an additional field
- A `coordinator` account requirement

**Recommendation:** Do not rely on hand-rolled byte layouts. Use the official `ika-dwallet-*` crate and its `DWalletContext` methods. If the crate version is pinned, refer to the exact version's documentation rather than general guides.

---

## Implementation Recommendations

### For the dWallet Guard Program (Rust/Anchor)

1. **Pin Ika crate version** — Use a specific `ika-dwallet-*` version in `Cargo.toml` and document it.
2. **Use `DWalletContext`** — For reading dWallet state and constructing CPI calls.
3. **keccak256 only** — Enforce keccak256 in the guard program before passing to Ika.
4. **Validate signature scheme** — Only allow schemes explicitly listed in the `GuardConfig`.
5. **Emit receipts** — Every `request_sign` and `approve_sign` should emit a HumanRail receipt.
6. **Handle pre-alpha resets** — Gracefully handle cases where the dWallet or MessageApproval no longer exists due to devnet wipes.

### For the Frontend (TypeScript)

1. **gRPC client** — Use `@grpc/grpc-js` or a Web gRPC client to connect to `https://pre-alpha-dev-1.ika.ika-network.net:443`.
2. **Message hashing** — Use `ethers.utils.keccak256` or `@noble/hashes/keccak256` in the browser.
3. **Polling for signature** — After submitting `DWalletRequest::Sign`, poll the Ika chain (or use a websocket if available) for the `CommitSignature` event.
4. **Error handling** — Pre-alpha may return transient errors; implement retry with exponential backoff.

### For the Agent Runtime (TypeScript/Node)

1. **New tool: `request_cross_chain_signature`** — Arguments: `chain` ("ethereum" | "bitcoin"), `message` (hex string or plaintext), `signature_scheme`.
2. **Capability check first** — The tool implementation should call HumanRail capability checks before creating a `GuardRequest`.
3. **gRPC integration** — The agent executor needs an Ika gRPC client instance.

---

## TODOs for Implementation

- [ ] Add `ika-dwallet-*` crate dependency to the new program
- [ ] Implement CPI call to `ika::approve_message` in the guard program
- [ ] Add gRPC client wrapper in `lib/ika/client.ts`
- [ ] Implement `request_cross_chain_signature` agent tool
- [ ] Add `/vault/dwallets` route and UI
- [ ] Handle Ika devnet resets gracefully in UI and agent runtime
