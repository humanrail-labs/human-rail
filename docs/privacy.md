# HumanRail KYC Issuer — Data Privacy

## What is stored (SQLite: `services/kyc-issuer/data/kyc.db`)

| Field | Example | PII? |
|---|---|---|
| `wallet_pubkey` | `8yyhW3ph...` | No (public blockchain address) |
| `veriff_session_id` | `a1b2c3d4-...` | No (opaque session reference) |
| `status` | `attested` | No |
| `payload_hash` | `6b79632d...` (SHA256 hex) | No (one-way hash) |
| `tx_signature` | `5xYz...` | No (public blockchain tx) |
| `attestation_pda` | `3tK7...` | No (public blockchain address) |
| `nonce` | `1` | No |
| `created_at` / `updated_at` | Unix timestamp | No |

## What is NOT stored

- Name, date of birth, nationality
- Document images (passport, ID, selfie)
- Veriff verification details or raw decision data
- IP addresses
- Any biometric data

## How it works

1. User submits their **wallet public key** (already public on-chain).
2. Service creates a Veriff session (Veriff handles all identity data).
3. On approval, service computes `SHA256(sessionId|decision|timestamp)` — a deterministic, irreversible hash containing no PII.
4. This hash is stored as `payload_hash` and submitted on-chain as the attestation payload.
5. Veriff retains identity data per their own retention policy. HumanRail never receives or stores it.

## Payload hash construction
```
input  = "${veriffSessionId}|${decision}|${decisionTimestamp}"
hash   = SHA256(input)
```

The hash proves the attestation corresponds to a specific Veriff decision without revealing what that decision contained.

## Compliance notes

- GDPR: No personal data processed or stored by HumanRail.
- Veriff is the data controller for identity verification data.
- HumanRail acts as a relayer: it receives a "pass/fail" signal and issues an on-chain attestation.
- Users can request attestation revocation, which marks it expired on-chain.
