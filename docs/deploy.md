# HumanRail Deployment Guide

## Prerequisites

- Rust 1.79+
- Solana CLI 1.18+
- Anchor CLI 0.30+
- Node.js 20+

## Devnet Deployment
```bash
# 1. Configure
solana config set --url https://api.devnet.solana.com
solana-keygen new  # if no keypair exists

# 2. Fund
solana airdrop 5

# 3. Build
anchor build

# 4. Deploy
anchor deploy --provider.cluster devnet

# 5. Verify IDs
python3 scripts/check_program_ids.py

# 6. Smoke test
cd examples/hello-humanrail
npm install
ANCHOR_WALLET=~/.config/solana/id.json npx tsx hello.ts
```

## Verified Builds (Mainnet)

### Install solana-verify
```bash
cargo install solana-verify
```

### Build deterministically
```bash
# Per-program verified build
solana-verify build --library-name human_registry
solana-verify build --library-name agent_registry
solana-verify build --library-name delegation
solana-verify build --library-name receipts
```

This runs inside a Docker container for reproducibility.

### Verify against deployed program
```bash
solana-verify verify-from-repo \
  --program-id GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo \
  https://github.com/humanrail-labs/human-rail \
  --commit-hash <COMMIT> \
  --library-name human_registry
```

### Remote verification (OtterSec API)
```bash
solana-verify verify-from-repo \
  --remote \
  --program-id GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo \
  https://github.com/humanrail-labs/human-rail \
  --commit-hash <COMMIT> \
  --library-name human_registry
```

Verified programs show a checkmark in Solana Explorer, SolanaFM, and SolScan.

## KYC Issuer Service
```bash
cd services/kyc-issuer
cp .env.example .env

# Fill in:
#   VERIFF_API_KEY, VERIFF_API_SECRET
#   ISSUER_KEYPAIR_PATH (chmod 600)

npm install
npm run dev        # development
npm run build      # production build
node dist/server.js  # production run
```

### Production checklist:
- [ ] `NODE_ENV=production`
- [ ] Issuer keypair file is `chmod 600`
- [ ] Behind reverse proxy (nginx/caddy) with TLS
- [ ] `trust proxy` enabled in Express if behind proxy
- [ ] Rate limiting tuned for expected traffic
- [ ] Monitoring/alerting on `/health` endpoint
- [ ] Log aggregation configured
