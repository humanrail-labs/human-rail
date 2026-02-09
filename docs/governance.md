# HumanRail Governance

## Authority Structure

### Program Upgrade Authority
All deployed programs share a single upgrade authority:
```
Authority: HMmyquFZXcJ2yHufXT8C7PiTajk4JRd64Nnq2JhmheHw
```

| Program | Program ID | ProgramData |
|---|---|---|
| human_registry | `GB35h1...HHo` | `BYFMCGEShUMZEYmhpVWXD27a1nf9CRtS6Yjvw2hQw6o7` |
| agent_registry | `GLrs6q...dhQ` | `7jBiRhD9eaJygveGkYMpYkAkWSsWczSyqsFPZkXuWgL9` |
| delegation | `DiNpgE...7XT` | `F7u3WJ4kZjfNs6vfERYcAV1v8xWYJUBdLFrf9r5ds33H` |
| receipts | `EFjLqS...ZwM` | `DihftfAwJHNCtxDd6aN8ZNvso1YkLAp3TkpvYcY6mprA` |

**Devnet:** Single-key authority (acceptable for development).
**Mainnet plan:** Transfer to Squads multisig before public launch.

### IssuerRegistry Admin
The IssuerRegistry singleton has an `admin` field that controls who can register/deactivate issuers:
```
Registry PDA: 3pjeEkwVmu9ggTZTKNPb5m5TyMCLJWBAt439rpbqswLs
Admin: HMmyquFZXcJ2yHufXT8C7PiTajk4JRd64Nnq2JhmheHw
```

**Mainnet plan:** Transfer admin to multisig.

## Issuer Onboarding Process

### Who can add issuers?
Only the registry admin can call `register_issuer`.

### Steps to onboard a new issuer:
1. Issuer generates a dedicated keypair (not their main wallet)
2. Admin reviews issuer credentials and type (KYC, PoP, Social, Device, etc.)
3. Admin calls `register_issuer` with:
   - Issuer name (32 bytes)
   - Issuer type
   - Max weight (how much score this issuer can contribute)
   - Validity period
4. Issuer receives their PDA and begins issuing attestations

### Issuer key rotation:
Currently not supported at protocol level. Rotation requires:
1. Admin deactivates old issuer
2. Admin registers new issuer with new authority
3. Existing attestations from old issuer remain valid until expiry

### Emergency procedures:
- **Revoke single attestation:** Issuer calls `revoke_attestation_v2`
- **Deactivate entire issuer:** Admin sets issuer status to inactive
- **Freeze agent:** Principal calls `emergency_freeze` on delegation program
- **Pause registry:** Admin can pause the IssuerRegistry (prevents new registrations)

## Upgrade Process

### Devnet
1. `anchor build`
2. `anchor deploy --provider.cluster devnet`
3. Run `scripts/check_program_ids.py` to verify consistency
4. Run `examples/hello-humanrail` smoke test

### Mainnet (planned)
1. `solana-verify build` (deterministic Docker build)
2. Review build hash
3. Submit upgrade via Squads multisig
4. 2-of-3 (or 3-of-5) signers approve
5. Execute upgrade
6. Verify on-chain hash matches build hash
7. Submit to OtterSec verification API

### Freeze (post-audit)
Once audited and stable:
```bash
solana program set-upgrade-authority <PROGRAM_ID> --final
```
This permanently removes upgrade capability. Only do this after thorough audit.

## Key Management

| Key | Purpose | Storage |
|---|---|---|
| Upgrade authority | Deploy/upgrade programs | HSM or multisig (mainnet) |
| Registry admin | Manage issuers | Multisig (mainnet) |
| Issuer authority | Sign attestations | Dedicated server keypair |
| Agent signing key | Operational agent key | Agent runtime |

### Rules:
- Never reuse keys across roles
- Issuer keys: `chmod 600`, loaded from env or KMS in production
- Never commit keypair files (`.keys/` is in `.gitignore`)
- Rotate issuer keys on any suspected compromise
