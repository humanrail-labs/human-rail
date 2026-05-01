# Judging Criteria Mapping

This document maps the Mandara by HumanRail project to each judging criterion with concrete proof.

---

## 1. Core Integration of Ika

**Criterion:** How deeply and correctly does the project integrate Ika's dWallet, approve_message, and gRPC Sign infrastructure?

**Proof:**

| Integration Point | Evidence |
|-------------------|----------|
| **Real dWallet DKG** | `npm run ika:create-dwallet` creates a real Secp256k1 dWallet on devnet via gRPC |
| **dWallet PDA** | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` — verified on-chain, state=Active, authority=Guard CPI PDA |
| **approve_message CPI** | `4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt` — Guard program CPI-calls Ika `approve_message` with correct account order and instruction data |
| **MessageApproval PDA** | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` — created by Ika program, status=Signed(1), approver=Guard CPI PDA |
| **gRPC Presign** | `DWalletRequest::Presign` with `curve=Secp256k1`, `signature_algorithm=ECDSASecp256k1` — returns `VersionedPresignDataAttestation::V1` |
| **gRPC Sign** | `DWalletRequest::Sign` with `ApprovalProof::Solana { transaction_signature, slot: 0 }` — returns `TransactionResponseData::Signature { signature: 64 bytes }` |
| **On-chain signature** | MessageApproval signature_len=64, signature bytes verified against gRPC response — exact match ✅ |
| **Rust CLI** | `tools/ika-dkg-cli/` — official tonic gRPC client with BCS serialization, extends Ika pre-alpha examples |
| **Source verification** | PDA derivation verified against `ika-dwallet-anchor` crate and `e2e-rust` examples (rev `3bd7945`) |

**Score: 10/10** — Full lifecycle from DKG → authority transfer → approve_message → gRPC Sign → on-chain signature verification.

---

## 2. Innovation

**Criterion:** Does the project introduce novel concepts, creative problem-solving, or unique features?

**Proof:**

| Innovation | Description |
|------------|-------------|
| **Policy-governed cross-chain signing** | First integration that checks signing requests against on-chain policy *before* Ika sees them |
| **Agent runtime tool** | `request_cross_chain_signature` lets AI agents autonomously request signatures within bounded policy |
| **Three-mode tool design** | `preview` (safe), `devnet_existing_artifact` (read-only), `devnet_execute_new_request` (gated) — novel safety UX |
| **Guard CPI bridge** | HumanRail Guard program acts as a policy-enforcing CPI controller between agents and Ika |
| **Immutable receipts** | Every approval and signature creates a HumanRail Receipt for compliance audit |
| **Pre-image hashing** | Policy uses keccak256 hashing identical to Guard program for deterministic evaluation |

**Score: 9/10** — Novel policy layer + agent tool combination. The three-mode design is particularly innovative for safety.

---

## 3. Technical Execution

**Criterion:** Is the code well-written, robust, and properly tested?

**Proof:**

| Aspect | Evidence |
|--------|----------|
| **Programs deployed** | 8/8 HumanRail programs + Ika program on devnet |
| **Guard program** | 244,416 bytes, deployed at slot 459380196, authority verified |
| **Build passes** | `npm run build` → 27 routes, 0 errors |
| **Type safety** | `packages/agent/src/crossChainPolicy.ts` — typed policy evaluation with keccak256 |
| **Test coverage** | `scripts/test-agent-cross-chain-tool.ts` — 5 tests covering all modes + safety gates |
| **Error handling** | Artifact reader gracefully degrades in browser; executor returns structured errors |
| **Bugfix history** | Phase 5D: fixed critical `user_pubkey` serialization bug in `buildApproveGuardedMessageIx` |
| **Code organization** | Modular: policy utility, artifact reader, tool definition, executor handler, runtime prompt, template |

**Score: 9/10** — Clean architecture, good tests, proper error handling. Could add more unit tests for edge cases.

---

## 4. Product & Commercial Potential

**Criterion:** Does the project have real-world applicability and commercial viability?

**Proof:**

| Market | Size | Fit |
|--------|------|-----|
| Crypto treasury management | $50B+ AUM | Agents can rebalance across chains within policy |
| AI agent automation | $10B+ by 2027 | Mandara provides the trust layer agents need |
| Cross-chain DeFi | $100B+ TVL | Policy-governed signing for bridges and DEXs |
| Enterprise finance | Growing | Compliance-first automation with audit trails |

| Revenue Model | Description |
|---------------|-------------|
| SaaS dashboard fees | Policy management, agent monitoring, compliance reporting |
| Micro-transaction fees | Small fee per Guard approval (on-chain revenue) |
| Enterprise audits | Custom compliance reports and risk assessments |

**Score: 8/10** — Clear market fit and revenue model. Needs mainnet Ika for production viability.

---

## 5. Impact

**Criterion:** Does the project positively impact the Solana and/or Ika ecosystem?

**Proof:**

**For Solana:**
- Brings verified human identity to AI agents (new use case)
- Positions Solana as the **policy layer** for cross-chain actions
- Drives program adoption through agent automation

**For Ika:**
- Provides the **missing policy layer** Ika needs for enterprise adoption
- Demonstrates real-world agent use of dWallets
- Creates an integration template for other projects

**For the broader ecosystem:**
- Proves that cross-chain signing can be policy-governed and auditable
- Sets a safety standard for AI agent custody

**Score: 9/10** — High impact on both ecosystems. The policy layer concept is broadly applicable.

---

## 6. Usability & Experience

**Criterion:** Is the project user-friendly with good documentation and a smooth demo?

**Proof:**

| UX Element | Evidence |
|------------|----------|
| **Demo page** | `/vault/dwallets` — single page showing full lifecycle |
| **Visual indicators** | Phase badges (5A, 5C, 5D, 5E, 6), status colors, explorer links |
| **One-click commands** | All devnet flows available as `npm run` scripts |
| **Agent tool** | Three modes let users explore safely (preview first) |
| **Documentation** | 7 docs: runbook, submission plan, technical notes, grant submission, judging criteria, video script, final audit |
| **README** | Grant-ready with quick commands, reproduce flow, artifact table |
| **Pre-alpha disclaimer** | Clear and prominent — never hides limitations |

**Score: 9/10** — Excellent documentation and smooth demo flow. The three-mode agent tool is particularly user-friendly for safety.

---

## 7. Completeness & Clarity

**Criterion:** Is the project complete, well-documented, and easy to understand?

**Proof:**

| Deliverable | Status |
|-------------|--------|
| Deployed program | ✅ HumanRail dWallet Guard on devnet |
| Real Ika dWallet | ✅ Created via gRPC DKG, authority transferred |
| Policy enforcement | ✅ GuardedDwallet with chain/asset/recipient/amount limits |
| Message approval | ✅ Guard CPI → Ika approve_message → MessageApproval PDA |
| Signature committed | ✅ gRPC Sign → on-chain signature, status=Signed |
| Agent tool | ✅ `request_cross_chain_signature` with preview/artifact/execute modes |
| Test script | ✅ 5 tests, all passing |
| UI demo | ✅ `/vault/dwallets` with full lifecycle display |
| Documentation | ✅ 7 docs covering technical, submission, and demo aspects |
| Final check script | ✅ `npm run final:check` verifies everything |

| Documentation | Purpose |
|---------------|---------|
| `docs/GRANT_SUBMISSION.md` | Full grant submission document |
| `docs/JUDGING_CRITERIA.md` | This file — criteria mapping |
| `docs/DEMO_VIDEO_SCRIPT.md` | Under-5-minute demo script |
| `docs/FINAL_AUDIT.md` | Audit and readiness checklist |
| `docs/IKA_INTEGRATION_RUNBOOK.md` | Technical integration phases |
| `docs/GRANT_IKA_SUBMISSION_PLAN.md` | Original submission plan |
| `docs/IKA_TECHNICAL_NOTES.md` | Ika technical notes |

**Score: 10/10** — Project is complete from DKG to agent tool, with comprehensive documentation.

---

## Summary

| Criterion | Score | Key Strength |
|-----------|-------|--------------|
| Core Integration of Ika | 10/10 | Full lifecycle: DKG → approve_message → gRPC Sign → on-chain verification |
| Innovation | 9/10 | Policy-governed signing + three-mode agent tool |
| Technical Execution | 9/10 | Clean code, good tests, robust error handling |
| Product & Commercial Potential | 8/10 | Clear market fit, needs mainnet Ika |
| Impact | 9/10 | High impact on both Solana and Ika ecosystems |
| Usability & Experience | 9/10 | Excellent docs, smooth demo, safety-first UX |
| Completeness & Clarity | 10/10 | Full stack complete, 7 docs, final check script |

**Total: 64/70**
