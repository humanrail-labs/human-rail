# HumanRail

HumanRail is a set of on-chain programs on :contentReference[oaicite:0]{index=0} for:

- **Human profiles** (wallet-bound identity, with optional issuer attestations)
- **Agent profiles** (agents owned by a human, with key rotation + disable controls)
- **Delegation** (capabilities that limit what an agent can do)
- **Receipts** (an audit trail of actions)

The goal is simple: **let apps safely accept actions from humans and agents, with clear permissions and accountability.**

---

## Programs

### Core
- `human_registry` — human profiles + attestations
- `agent_registry` — agent profiles + key lifecycle
- `delegation` — capabilities (scopes/limits/time bounds) + revoke/freeze controls
- `receipts` — shared audit trail (receipts)
- `common` — shared types/constants

### Optional modules
- `human_pay` — invoicing / payment rail with verification hooks
- `data_blink` — tasks + rewards rail
- `document_registry` — document signing rail

---

## Key concepts (one minute)

- **HumanProfile**: a wallet-owned profile. Issuers can attach attestations (KYC optional, no PII on-chain).
- **AgentProfile**: an agent linked to a human. Agents have signing keys; keys can be rotated or disabled.
- **Capability**: a permission slip for an agent (scope + limits + expiry + allowlists). Capabilities can be revoked.
- **Receipt**: a record tying an action back to an agent + capability (auditability).

---

## Devnet program IDs (deployed)

These IDs are the ones produced by `anchor keys list` (and match your `target/deploy/*-keypair.json` files):

| Program | Devnet Program ID |
|---|---|
| `human_registry` | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` |
| `agent_registry` | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` |
| `delegation` | `HRmukQDzeju62kb1frapSX37GvH1qwwrjC2XdezWfS5Z` |
| `receipts` | `7Q8tdMyTKvtomuSYiHPCB2inV29wr6P2SB7Cmo4kof6z` |
| `human_pay` | `CFxYX4vxNef9VwtkNHNd4m3mH3LpwoS3gSvEBGB4jeUV` |
| `data_blink` | `GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX` |
| `document_registry` | `8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28` |

Verify on devnet:
```bash
solana -u devnet program show GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ
solana -u devnet program show GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo
solana -u devnet program show HRmukQDzeju62kb1frapSX37GvH1qwwrjC2XdezWfS5Z
solana -u devnet program show 7Q8tdMyTKvtomuSYiHPCB2inV29wr6P2SB7Cmo4kof6z
Quick start (localnet)
Prerequisites
Solana CLI

Rust (stable)

Anchor 0.32+

Node 18+

Install
npm install
Build
anchor build
Test
anchor test
Fresh local validator + deploy
pkill -f solana-test-validator || true
solana-test-validator --reset --quiet &
sleep 5

anchor deploy --provider.cluster localnet
anchor test --skip-local-validator --skip-deploy
Repo structure
programs/
  human_registry/
  agent_registry/
  delegation/
  receipts/
  common/
  # optional modules
  human_pay/
  data_blink/
  document_registry/

packages/
  sdk/

tests/
  *.ts
License
MIT