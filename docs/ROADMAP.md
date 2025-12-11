# HumanRail Roadmap

This document outlines planned features and improvements for HumanRail. Items are listed roughly in priority order.

## Phase 1: Foundation (Current)

- [x] Core Anchor programs (human_registry, human_pay, data_blink)
- [x] TypeScript SDK with basic wrappers
- [x] Actions/Blinks server skeleton
- [x] Web demo application
- [ ] Complete integration tests
- [ ] Deploy to devnet

## Phase 2: Identity Integration

### Solana Attestation Service Integration
- [ ] Integrate real SAS verification in human_registry
- [ ] Support multiple attestation schema types
- [ ] Add attestation expiry handling
- [ ] Implement attestation revocation checks

### Additional PoP Providers
- [ ] World ID integration
- [ ] Civic Pass integration
- [ ] Gitcoin Passport integration
- [ ] Generic signature-based attestation support

### zkCompression
- [ ] Explore compressed attestation storage
- [ ] Implement merkle proof verification
- [ ] Reduce on-chain storage costs

## Phase 3: Confidential Payments

### Token 2022 Confidential Transfer
- [ ] Implement confidential transfer extension support
- [ ] Add ElGamal encryption for amounts
- [ ] Generate range proofs
- [ ] Handle confidential balance decryption

### Payment Features
- [ ] Recurring invoices
- [ ] Partial payments
- [ ] Payment streaming
- [ ] Multi-token invoice support

## Phase 4: Task System Improvements

### Task Types
- [ ] Support for image comparison tasks
- [ ] Text classification tasks
- [ ] Multi-option ranking tasks
- [ ] Custom task type framework

### Quality Control
- [ ] Response quality scoring
- [ ] Majority voting aggregation
- [ ] Worker reputation system
- [ ] Spam detection

### Task Distribution
- [ ] Task targeting based on worker attributes
- [ ] Geographic distribution controls
- [ ] Rate limiting per worker

## Phase 5: Production Readiness

### Security
- [ ] Comprehensive security audit
- [ ] Bug bounty program
- [ ] Rate limiting on Actions server
- [ ] Input validation hardening

### Performance
- [ ] Optimize account sizes
- [ ] Batch instruction support
- [ ] Caching layer for Actions server

### Monitoring
- [ ] On-chain event indexing
- [ ] Metrics dashboard
- [ ] Alert system for anomalies

## Phase 6: Ecosystem

### Integrations
- [ ] SDK packages for Python, Rust
- [ ] Webhook support for task completion
- [ ] API for enterprise integrations

### Documentation
- [ ] Comprehensive API documentation
- [ ] Tutorial series
- [ ] Example integrations

## GitHub Issues to Create

Copy these to create initial GitHub issues:

```
Title: Integrate Solana Attestation Service verification
Labels: enhancement, identity
Description: Replace placeholder verification in human_registry with real SAS verification logic.

Title: Implement Token 2022 Confidential Transfer
Labels: enhancement, payments
Description: Add support for confidential transfers in human_pay using Token 2022 extensions.

Title: Add World ID attestation support
Labels: enhancement, identity
Description: Integrate World ID as a proof-of-personhood provider in human_registry.

Title: Implement task response quality scoring
Labels: enhancement, tasks
Description: Add quality scoring mechanism for task responses to improve data quality.

Title: Security audit preparation
Labels: security
Description: Prepare codebase for professional security audit.

Title: Deploy to devnet
Labels: deployment
Description: Deploy all programs to Solana devnet and update documentation with addresses.

Title: Add comprehensive integration tests
Labels: testing
Description: Expand test coverage with full end-to-end integration tests.

Title: Implement worker reputation system
Labels: enhancement, tasks
Description: Track worker performance and reliability for task assignment.
```

## Contributing

See CONTRIBUTING.md for information on how to contribute to these roadmap items.
