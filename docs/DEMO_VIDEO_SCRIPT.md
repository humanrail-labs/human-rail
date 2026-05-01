# Demo Video Script: Mandara by HumanRail

**Target length:** Under 5 minutes  
**Format:** Screen recording + voiceover  
**Route:** `/vault/dwallets`

---

## 0:00–0:30 — The Problem

**Screen:** Landing page (`/`) or black screen with text overlay

**Voiceover:**
> "AI agents are becoming autonomous economic actors. They manage treasuries, execute trades, and sign cross-chain transactions. But here's the problem: who authorized them? What are their limits? And who can freeze them if something goes wrong?"

**Screen action:** Fade to text:
- ❌ Unrestricted signing = dangerous
- ❌ Human-in-the-loop for every action = not autonomous
- ❌ No audit trail = not verifiable

**Voiceover:**
> "Mandara by HumanRail solves this by combining programmable policy with Ika cross-chain signing."

---

## 0:30–1:00 — Architecture

**Screen:** `/vault/dwallets` page, scrolled to the top

**Voiceover:**
> "Mandara has two layers. HumanRail provides the policy layer: verified human identity, agent lifecycle, spending limits, emergency freeze, and immutable receipts. Ika provides the cross-chain signing layer: dWallets that can sign for Ethereum, Bitcoin, and other chains. Together, a verified human can deploy an AI agent that signs cross-chain — but only within programmable bounds."

**Screen action:** Show the architecture diagram or the "Protocol Architecture" card on the page.

---

## 1:00–1:45 — Ika Readiness & Real dWallet

**Screen:** `/vault/dwallets`, Config & PDAs tab, scrolled to Phase 5A section

**Voiceover:**
> "Let's see what works on devnet. First, we verify that the Ika program is deployed and executable."

**Screen actions:**
1. Click "Fetch Ika Program Info" button
2. Show: `Executable: YES`, `Data size: 418,548 bytes`

**Voiceover:**
> "The Ika dWallet program is live on devnet. Now let's fetch the real dWallet we created via gRPC DKG."

**Screen actions:**
1. Scroll to "Phase 5C — Real Ika dWallet"
2. Click "Fetch Real Ika dWallet" button
3. Show results:
   - PDA: `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp`
   - State: Active
   - Authority: `FCHUW...` (Guard CPI PDA)
   - Curve: Secp256k1

**Voiceover:**
> "This is a real Ika dWallet. Its authority is the HumanRail Guard CPI PDA — meaning only the Guard program can authorize signatures."

---

## 1:45–2:30 — GuardedDwallet Policy

**Screen:** Scroll to "Phase 5C — Real Ika GuardedDwallet Policy"

**Voiceover:**
> "Next, the GuardedDwallet policy. This is where the human principal sets the rules: which chain, which asset, which recipient, and how much per transaction."

**Screen actions:**
1. Click "Fetch Real Ika GuardedDwallet" button
2. Show results:
   - PDA: `C4kAi...`
   - Linked dWallet: `A6hbi...`
   - Chain: 84532 (Base Sepolia)
   - Asset hash: `d077e...`
   - Recipient hash: `efda2...`
   - Per-tx limit: 100,000,000
   - Frozen: false

**Voiceover:**
> "The policy is active and not frozen. Every signing request must match these constraints, or the Guard program rejects it on-chain."

---

## 2:30–3:15 — Approved Request & MessageApproval

**Screen:** Scroll to "Phase 5D/5E — Approved Signing Request"

**Voiceover:**
> "Now let's look at an approved signing request. The Guard program checked the request against policy, then CPI-called Ika's approve_message instruction."

**Screen actions:**
1. Show the artifact card with:
   - Preimage: "HumanRail Mandara demo approved request..."
   - Message digest: `5c125f...`
   - GuardSigningRequest PDA: `CmqCp...`
   - Ika MessageApproval PDA: `Csrk5...`
2. Click "Fetch Approved Request" button
3. Show: Status = approved(1), Rejection code = 0

**Voiceover:**
> "The GuardSigningRequest is approved with zero rejection code. Now let's check the Ika MessageApproval."

**Screen actions:**
1. Click "Fetch MessageApproval" button
2. Show results:
   - Status: Signed(1)
   - Signature len: 64
   - Signature available: YES

**Voiceover:**
> "The MessageApproval status is Signed, with a 64-byte ECDSA signature committed on-chain by the Ika network."

---

## 3:15–4:00 — Signature Proof

**Screen:** Scroll to show signature details

**Voiceover:**
> "Here's the actual signature. We can verify that the on-chain signature matches the gRPC response exactly."

**Screen actions:**
1. Show signature hex: `ca5c26...c19b1e`
2. Show signature base64: `ylwmQ0ifH6rj6jm6lgOG7KvkH7YSGMz69pP7fssbBc5BC5IrxFp+f4LGRqrLuBJ2Z27aOuP6Wvq4lgy7AMGbHg==`
3. Show explorer link to MessageApproval PDA

**Voiceover:**
> "This signature was produced by the Ika mock signer via gRPC and committed to the MessageApproval account. In production, this would be a threshold MPC signature."

---

## 4:00–4:30 — Agent Runtime Tool

**Screen:** Scroll to "Agent Runtime Tool — Phase 6" or open terminal

**Voiceover:**
> "Finally, the agent runtime. AI agents can request cross-chain signatures through the request_cross_chain_signature tool. It has three modes: preview for policy checking, devnet_existing_artifact for reading state, and devnet_execute_new_request for submitting requests — gated by environment variable for safety."

**Screen actions:**
1. Show the Agent Runtime Tool card in the UI
2. Switch to terminal
3. Run: `npm run test:agent-cross-chain-tool`
4. Show output:
   - Test A: preview allowed → PASS
   - Test B: preview rejected (amount too high) → PASS
   - Test C: devnet_existing_artifact → reads signed state → PASS
   - Test D: safety gate disabled → PASS
   - Test E: policy hashes match → PASS

**Voiceover:**
> "All tests pass. The preview mode correctly allows valid requests and rejects out-of-policy requests. The safety gate prevents accidental execution."

---

## 4:30–5:00 — Closing

**Screen:** Back to `/vault/dwallets` top, or landing page

**Voiceover:**
> "Mandara by HumanRail. Programmable mandates for cross-chain AI agents. Verified humans. Bounded agents. Immutable receipts. Powered by Ika dWallets."

**Screen:** Show final text overlay:
- HumanRail Protocol
- Mandara by HumanRail
- GitHub: [repo link]
- Demo: `/vault/dwallets`

**End.**

---

## Recording Tips

1. **Use a clean browser** — no bookmarks bar, minimal extensions
2. **Zoom in** — 125-150% browser zoom for readability
3. **Highlight clicks** — use a screen recorder that shows cursor clicks
4. **Terminal font** — use a large monospace font (16px+) for terminal recordings
5. **Pause between sections** — 1-2 second silence for editing
6. **Pre-load the page** — have `/vault/dwallets` open before recording to avoid loading delays
7. **Pre-run commands** — run `npm run test:agent-cross-chain-tool` once before recording so artifacts are warm
