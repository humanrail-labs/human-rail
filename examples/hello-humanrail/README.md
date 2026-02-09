# Hello HumanRail

Minimal end-to-end example demonstrating the complete HumanRail lifecycle on Solana devnet.

## What it does

1. **Create Human Profile** — `init_profile` on human_registry
2. **Register KYC Issuer** — `register_issuer` (admin operation)
3. **Issue Attestation** — Ed25519-signed `issue_attestation` (real cryptographic proof)
4. **Register AI Agent** — `register_agent` on agent_registry
5. **Issue Capability** — `issue_capability` on delegation program
6. **Validate Capability** — `validate_capability` (read-only check)

## Prerequisites

- Solana CLI configured for devnet
- A funded keypair (0.1+ SOL)

## Run
```bash
# Ensure devnet
solana config set --url https://api.devnet.solana.com

# Fund wallet if needed
solana airdrop 1

# Run the demo
ANCHOR_WALLET=~/.config/solana/id.json npx tsx hello.ts
```

## Expected Output
```
╔══════════════════════════════════════════╗
║       Hello HumanRail — Devnet Demo      ║
╚══════════════════════════════════════════╝
Wallet: <your-pubkey>
Balance: X.XXXX SOL

─── Step 1: Create Human Profile ───
  ✅ init_profile: <tx-sig>

─── Step 2: Register KYC Issuer ───
  ✅ register_issuer: <tx-sig>

─── Step 3: Issue Signed Attestation ───
  ✅ issue_attestation: <tx-sig>

─── Step 4: Register AI Agent ───
  ✅ register_agent: <tx-sig>

─── Step 5: Issue Capability ───
  ✅ issue_capability: <tx-sig>

─── Step 6: Validate Capability ───
  ✅ validate_capability: <tx-sig>

╔══════════════════════════════════════════╗
║           🎉  All Steps Complete!         ║
╚══════════════════════════════════════════╝
```

## Architecture
```
Human (wallet)
  ├── HumanProfile PDA ← human_registry
  │     └── SignedAttestation PDA ← issuer signs with Ed25519
  ├── AgentProfile PDA ← agent_registry
  │     └── OperatorStats PDA
  └── Capability PDA ← delegation
        └── validates: limits, expiry, freeze status
```
