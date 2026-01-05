"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "address": "Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR",
    "metadata": {
        "name": "humanRegistry",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Human identity and proof of personhood registry for HumanRail"
    },
    "instructions": [
        {
            "name": "initProfile",
            "docs": ["Initialize a new HumanProfile for the signing authority."],
            "discriminator": [210, 162, 212, 95, 95, 186, 89, 119],
            "accounts": [
                {
                    "name": "authority",
                    "docs": ["The wallet for which we are creating a profile."],
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "profile",
                    "docs": ["PDA storing the HumanProfile for this authority."],
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [104, 117, 109, 97, 110, 95, 112, 114, 111, 102, 105, 108, 101] },
                            { "kind": "account", "path": "authority" }
                        ]
                    }
                },
                {
                    "name": "systemProgram",
                    "docs": ["System program for account creation."],
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": []
        },
        {
            "name": "registerAttestation",
            "docs": ["Register or update an attestation and recompute the human score."],
            "discriminator": [16, 160, 132, 114, 195, 169, 210, 204],
            "accounts": [
                {
                    "name": "authority",
                    "docs": ["The wallet that owns the profile and signs the transaction."],
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "profile",
                    "docs": ["The HumanProfile PDA tied to the authority wallet."],
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [104, 117, 109, 97, 110, 95, 112, 114, 111, 102, 105, 108, 101] },
                            { "kind": "account", "path": "authority" }
                        ]
                    }
                }
            ],
            "args": [
                { "name": "source", "type": "pubkey" },
                { "name": "payloadHash", "type": { "array": ["u8", 32] } },
                { "name": "weight", "type": "u16" }
            ]
        }
    ],
    "accounts": [
        { "name": "humanProfile", "discriminator": [32, 133, 87, 162, 100, 194, 215, 212] }
    ],
    "events": [
        { "name": "attestationRegistered", "discriminator": [167, 94, 4, 138, 121, 70, 55, 158] }
    ],
    "errors": [
        { "code": 6000, "name": "tooManyAttestations", "msg": "Maximum number of attestations reached" },
        { "code": 6001, "name": "walletMismatch", "msg": "Profile wallet does not match authority" },
        { "code": 6002, "name": "missingProfileBump", "msg": "Profile bump missing from context" }
    ],
    "types": [
        {
            "name": "attestationRef",
            "docs": ["Lightweight reference to an external attestation."],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "source", "docs": ["Identity / KYC / PoP provider."], "type": "pubkey" },
                    { "name": "payloadHash", "docs": ["Hash of the attestation payload."], "type": { "array": ["u8", 32] } },
                    { "name": "weight", "docs": ["Weight contributed to human_score."], "type": "u16" }
                ]
            }
        },
        {
            "name": "humanProfile",
            "docs": ["HumanProfile stores per-wallet identity score and attestations."],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "wallet", "type": "pubkey" },
                    { "name": "humanScore", "type": "u16" },
                    { "name": "isUnique", "type": "bool" },
                    { "name": "attestationCount", "type": "u32" },
                    { "name": "lastAttestationAt", "type": "i64" },
                    { "name": "lastAttestationHash", "type": { "array": ["u8", 32] } },
                    { "name": "attestations", "type": { "vec": { "defined": { "name": "attestationRef" } } } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ]
};
//# sourceMappingURL=human_registry.js.map