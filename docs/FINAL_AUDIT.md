# Final Audit — Mandara by HumanRail

**Branch:** `grant/ika-guarded-dwallets`  
**Date:** 2026-05-01  
**Auditor:** HumanRail Labs  

---

## Latest Commit

```
f1db594 feat: add agent cross-chain signature tool
```

Commit history (last 10):
```
f1db594 feat: add agent cross-chain signature tool
7c2ad60 feat: complete Ika signature lifecycle (Phase 5E)
b9fd52c feat: create Ika MessageApproval through Guard
...
```

---

## Program IDs

### HumanRail Programs (Devnet)

| Program | Address | Status |
|---------|---------|--------|
| Human Registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` | ✅ Deployed |
| Agent Registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` | ✅ Deployed |
| Delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` | ✅ Deployed |
| HumanPay | `HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9` | ✅ Deployed |
| DataBlink | `GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX` | ✅ Deployed |
| Document Registry | `8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28` | ✅ Deployed |
| Receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` | ✅ Deployed |
| **HumanRail dWallet Guard** | **`Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2`** | **✅ Deployed & Executable** |

### Ika Programs (Devnet)

| Program | Address | Status |
|---------|---------|--------|
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` | ✅ Pre-alpha devnet |

---

## Ika Artifacts

| Artifact | Address / Value |
|----------|-----------------|
| Ika dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| Guard CPI Authority PDA | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` |
| GuardedDwallet PDA | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| GuardSigningRequest PDA | `CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5` |
| Ika MessageApproval PDA | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` |
| Approve tx signature | `4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt` |
| MessageApproval status | **Signed(1)**, signature_len=64 |
| Signature (hex) | `ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e` |
| Signature (base64) | `ylwmQ0ifH6rj6jm6lgOG7KvkH7YSGMz69pP7fssbBc5BC5IrxFp+f4LGRqrLuBJ2Z27aOuP6Wvq4lgy7AMGbHg==` |

---

## Commands Run

### Build
```bash
npm run build
```
**Result:** ✅ SUCCESS — 27 routes, 0 errors

### Guard Program Verification
```bash
npm run verify:dwallet-guard
```
**Result:** ✅ DEPLOYED and EXECUTABLE
- Program ID: `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2`
- Data Length: 244,416 bytes
- Balance: 1.70233944 SOL
- Authority: `5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y`

### Guard Program Build Check
```bash
npm run check:dwallet-guard
```
**Result:** ✅ Build check complete
- SBF build: `-rwxr-xr-x 244,416 bytes`
- IDL generated: 19,724 bytes
- Keypair matches expected program ID

### Ika Lifecycle Verification
```bash
npm run ika:verify-lifecycle
```
**Result:** ✅ ALL CHECKS PASSED
- dWallet authority == Guard CPI PDA
- dWallet state = Active
- GuardedDwallet.dwallet matches
- GuardedDwallet not frozen

### Devnet Inspector
```bash
npm run devnet:inspect-ika
```
**Result:** ✅ Phase 5E COMPLETE
- Ika program executable: YES
- MessageApproval status: Signed(1)
- Signature len: 64
- Signature available: YES

### Agent Cross-Chain Tool Test
```bash
npm run test:agent-cross-chain-tool
```
**Result:** ✅ ALL TESTS PASSED (5/5)
- Test A: preview allowed → PASS
- Test B: preview rejected → PASS
- Test C: devnet_existing_artifact → PASS
- Test D: safety gate disabled → PASS
- Test E: policy hashes match → PASS

### Rust CLI Check
```bash
cargo check --manifest-path tools/ika-dkg-cli/Cargo.toml
```
**Result:** ✅ 1 warning (unused constant), 0 errors

---

## Security / Secret Audit

### .gitignore Check

```bash
git ls-files | grep -E "\.local-ika|\.local-keys|keypair|target/deploy" || true
```
**Result:** ✅ No sensitive files tracked

### Sensitive File Audit

| Path | Status |
|------|--------|
| `.local-ika/dwallet.json` | ✅ gitignored |
| `.local-ika/guarded-dwallet.json` | ✅ gitignored |
| `.local-ika/signing-request.json` | ✅ gitignored |
| `.local-keys/` | ✅ gitignored |
| `target/deploy/humanrail_dwallet_guard-keypair.json` | ✅ gitignored |

### Keypair Exposure Check

```bash
grep -r "\[.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*,.*\]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v target | head -5
```
**Result:** ✅ No private key arrays found in source

### Orphaned Program ID Check

```bash
grep -r "G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v target | grep -v ".git"
```
**Result:** ✅ No stale program ID references found

---

## Known Limitations

1. **Ika pre-alpha:** Single mock signer, not production MPC custody
2. **Devnet only:** All Ika interactions use pre-alpha devnet
3. **Demo policy:** Hardcoded to Base Sepolia USDC transfer for grant demo
4. **Browser execution:** Agent devnet execution requires Node.js server environment
5. **GasDeposit:** Not yet implemented (not required for pre-alpha)
6. **Signature verification:** ECDSA secp256k1 recovery against dWallet public key not yet implemented

---

## Submission Readiness Checklist

- [x] README.md is grant-ready with product branding
- [x] All devnet programs deployed and verified
- [x] Real Ika dWallet created and authority transferred
- [x] GuardedDwallet policy exists and is active
- [x] MessageApproval created via Guard CPI
- [x] Signature committed on-chain via gRPC Sign
- [x] Agent tool `request_cross_chain_signature` implemented
- [x] Test script passes (5/5)
- [x] Build passes (27 routes, 0 errors)
- [x] No secrets committed
- [x] No stale program IDs
- [x] Grant submission document complete
- [x] Judging criteria mapping complete
- [x] Demo video script complete
- [x] Final audit document complete
- [x] Final check script exists and passes
- [x] Pre-alpha disclaimer prominent in all docs

---

## Conclusion

**Status: ✅ READY FOR SUBMISSION**

All phases complete. All artifacts verified. No blockers.
