# HumanRail Roadmap

## Phase 1 – Make the skeleton compile

### human_registry
- [ ] Implement `HumanProfile` and `AttestationRef` state in `state.rs`
- [ ] Implement `init_profile` instruction to create a profile PDA
- [ ] Implement `register_attestation` with simple scoring logic
- [ ] Implement `recompute_score` and helper for enforcing minimum score / uniqueness
- [ ] Add Anchor integration test for basic profile + attestation flow

### human_pay
- [ ] Implement `ConfidentialInvoice` state and PDA seeds
- [ ] Implement `create_confidential_invoice` instruction
- [ ] Implement `pay_confidential_invoice` with `human_registry` score check
- [ ] Add integration test for simple invoice payment (non-confidential transfer for now)

### data_blink
- [ ] Implement `Task` and `Response` accounts in `state.rs`
- [ ] Implement `create_task` and `close_task` instructions
- [ ] Implement `submit_response` with human score check and budget tracking
- [ ] Implement `claim_rewards` from a funded reward vault PDA
- [ ] Add integration test for task + response + rewards flow

### SDK (packages/sdk)
- [ ] Implement core client config and program ID handling
- [ ] Implement identity helpers (`getHumanProfile`, `ensureHumanProfile`, `registerAttestation`)
- [ ] Implement payments helpers (`createInvoice`, `payInvoice`)
- [ ] Implement task helpers (`createTask`, `submitTaskResponse`, `claimTaskRewards`)
- [ ] Add SDK tests that exercise a minimal end-to-end flow on local validator

### Actions server (services/actions-server)
- [ ] Implement shared config and SDK client initialization
- [ ] Implement task Actions endpoints (describe task, build respond tx, build claim tx)
- [ ] Implement invoice Actions endpoints (describe invoice, build pay tx)
- [ ] Add minimal API tests to validate Actions JSON and transaction encoding

### Web demo (apps/web-demo)
- [ ] Bootstrap Next.js app with TypeScript and Solana wallet adapter
- [ ] Implement task list page that loads open tasks
- [ ] Implement task detail page with simple A/B response UI
- [ ] Wire submit response and claim rewards using the SDK
- [ ] Add a simple landing page explaining HumanRail and linking to the demo

## Phase 2 – Real integrations

- [ ] Integrate Solana Attestation Service for real attestations in `human_registry`
- [ ] Integrate a real Token-2022 confidential stablecoin mint in `human_pay`
- [ ] Add basic reputation and anti-Sybil rules on top of `human_score`
- [ ] Expose at least one production-ready Actions/Blinks example for RLHF-style tasks
- [ ] Improve documentation (architecture diagrams, examples, security notes)

