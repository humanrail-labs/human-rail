# Phase 1 Freeze — Core v1 (devnet)

**Tag:** `core-v1-devnet`
**Date:** 2025-02-07
**Status:** FROZEN

## Deployed Programs (devnet)

| Program | Address | Deploy Type |
|---------|---------|-------------|
| human_registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` | Upgraded |
| agent_registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` | Upgraded |
| delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` | Fresh |
| receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` | Fresh |

## Freeze Rules

1. **No account layout changes** in Core programs without an explicit migration plan
2. **No new features** in Core — only bugfixes and security hardening
3. **Optional modules** (human_pay, document_registry, data_blink) are out-of-scope for Core v1
4. **Any Core change** requires re-running `tests/devnet-smoke-ed25519.ts` and confirming 3/3 pass

## Verification Evidence

- Devnet smoke test: 3/3 passing (real Ed25519, no test-skip-sig-verify)
- POSITIVE tx: `5Msb4MhGmXWv93TLAMg35GEXsDSzSMkrmkZy1Mkbg75dkB8RNeaTiQJUADkaSr9jCunBPrnNBQegaVKCcJ6hFpNT` (meta.err=null)
- NEGATIVE tx: `5aarnR9PtLiyf9kDPTP1nseVVx9DEvWvrZxaQ5DwVEgiT9pVA7FG6yUXBg8uSXME6AawDf1DmvWTx5RUp2UGZocF` (MessageMismatch 0x1777)
- Production binary verified: `check-no-test-features.sh` ✅

## Phase 2 Scope (Hardening)

- [ ] SECURITY.md: attacker model, trust assumptions, invariants per instruction
- [ ] Attack-path tests: replay, ordering, capability boundaries, DoS
- [ ] Lock upgrade authorities (multisig)
- [ ] Audit scope document
- [ ] Remove/gate test-skip-sig-verify in CI
