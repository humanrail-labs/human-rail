# Changelog

## Phase 3 — SDK, KYC Issuer, Integration Cookbook (2026-02-09)

### Added

**TypeScript SDK (`packages/sdk/`)**
- `constants.ts` — Deployed devnet program IDs, PDA seeds, thresholds
- `types.ts` — TypeScript interfaces matching all on-chain structs
- `pda.ts` — PDA derivation for all 4 programs (12 derivation functions)
- `ed25519.ts` — Ed25519 attestation signing (146-byte format) + precompile instruction builder
- `errors.ts` — Error code mapping for all programs
- `accounts.ts` — IDL-based account fetchers (10 fetch functions)
- `instructions/humanRegistry.ts` — initRegistry, initProfile, registerIssuer, issueAttestation, revokeAttestationV2, verifyHuman
- `instructions/agentRegistry.ts` — registerAgent, suspendAgent, reactivateAgent, revokeAgent, rotateAgentKey, updateAgentMetadata
- `instructions/delegation.ts` — issueCapability, revokeCapability, emergencyFreeze, unfreezeAgent, validateCapability
- `instructions/receipts.ts` — emitReceipt

**KYC Issuer Service (`services/kyc-issuer/`)**
- Express server with Veriff webhook integration
- HMAC-SHA256 webhook signature verification
- SQLite persistence (zero PII stored)
- On-chain attestation issuance (Ed25519 + precompile)
- Webhook freshness check (±15 min window)
- Idempotent webhook processing (no double attestations)
- Per-wallet nonce tracking
- Key file permission guard (refuses world-readable in production)
- Rate limiting on all endpoints
- 10 unit tests (HMAC, payload hash, signing bytes format)

**Examples**
- `examples/hello-humanrail/` — Full lifecycle demo (profile → issuer → attestation → agent → capability → validate)
- `examples/gated-action/` — Human-verified access control pattern

**Admin Scripts**
- `scripts/register-veriff-issuer.ts` — One-time issuer registration
- `services/kyc-issuer/scripts/simulate-webhook.ts` — Local e2e webhook simulation

**Documentation**
- `docs/integration/cookbook.md` — Integration patterns: Human Gate, KYC Issuer, Agent Registration, Capability Delegation, Receipt Logging, PDA Reference, Error Codes
- `docs/privacy.md` — Zero-PII data documentation

### Security
- All 4 program IDs verified consistent across Anchor.toml, SDK, KYC service, and on-chain
- Upgrade authority (`HMmyquFZXcJ2yHufXT8C7PiTajk4JRd64Nnq2JhmheHw`) documented
- `.keys/` and `services/kyc-issuer/data/` added to .gitignore
- Legacy SDK files moved to `packages/sdk/src/_legacy/` (excluded from build)

### Devnet Deployment Status
| Program | ID | Status |
|---|---|---|
| human_registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` | ✅ Deployed |
| agent_registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` | ✅ Deployed |
| delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` | ✅ Deployed |
| receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` | ✅ Deployed |
