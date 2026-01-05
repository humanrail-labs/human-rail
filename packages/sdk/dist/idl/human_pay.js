"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "address": "6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe",
    "metadata": {
        "name": "humanPay",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Confidential payment and invoice rail for HumanRail"
    },
    "instructions": [
        {
            "name": "cancelInvoice",
            "docs": ["Cancel an unpaid invoice (merchant only)."],
            "discriminator": [88, 158, 54, 49, 53, 26, 92, 68],
            "accounts": [
                { "name": "invoice", "writable": true },
                { "name": "merchant", "signer": true }
            ],
            "args": []
        },
        {
            "name": "createConfidentialInvoice",
            "docs": ["Create a new confidential invoice."],
            "discriminator": [68, 183, 71, 137, 45, 242, 87, 48],
            "accounts": [
                {
                    "name": "invoice",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [105, 110, 118, 111, 105, 99, 101] },
                            { "kind": "account", "path": "merchant" },
                            { "kind": "account", "path": "mint" },
                            { "kind": "arg", "path": "params.nonce" }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [118, 97, 117, 108, 116] },
                            { "kind": "account", "path": "invoice" }
                        ]
                    }
                },
                { "name": "mint" },
                { "name": "merchant", "writable": true, "signer": true },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
                { "name": "systemProgram", "address": "11111111111111111111111111111111" }
            ],
            "args": [
                { "name": "params", "type": { "defined": { "name": "createInvoiceParams" } } }
            ]
        },
        {
            "name": "payConfidentialInvoice",
            "docs": ["Pay an existing confidential invoice."],
            "discriminator": [185, 34, 221, 44, 96, 229, 75, 237],
            "accounts": [
                { "name": "invoice", "writable": true },
                { "name": "vault", "writable": true },
                { "name": "mint" },
                {
                    "name": "payerProfile",
                    "docs": ["Payer's human profile for verification"],
                    "pda": {
                        "seeds": [
                            { "kind": "const", "value": [104, 117, 109, 97, 110, 95, 112, 114, 111, 102, 105, 108, 101] },
                            { "kind": "account", "path": "payer" }
                        ],
                        "program": { "kind": "account", "path": "humanRegistryProgram" }
                    }
                },
                { "name": "payerTokenAccount", "writable": true },
                { "name": "payer", "writable": true, "signer": true },
                { "name": "humanRegistryProgram", "address": "Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR" },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }
            ],
            "args": []
        },
        {
            "name": "withdrawInvoice",
            "docs": ["Withdraw funds from a paid invoice (merchant only)."],
            "discriminator": [51, 204, 149, 37, 211, 216, 6, 200],
            "accounts": [
                { "name": "invoice", "writable": true },
                { "name": "vault", "writable": true },
                { "name": "mint" },
                { "name": "merchantTokenAccount", "writable": true },
                { "name": "merchant", "writable": true, "signer": true },
                { "name": "tokenProgram", "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }
            ],
            "args": []
        }
    ],
    "accounts": [
        { "name": "confidentialInvoice", "discriminator": [173, 58, 222, 166, 125, 132, 62, 52] }
    ],
    "errors": [
        { "code": 6000, "name": "invoiceAlreadyPaid", "msg": "Invoice has already been paid" },
        { "code": 6001, "name": "invoiceCancelled", "msg": "Invoice has been cancelled" },
        { "code": 6002, "name": "invoiceExpired", "msg": "Invoice has expired" },
        { "code": 6003, "name": "invalidInvoiceState", "msg": "Invoice is not in the correct state for this operation" },
        { "code": 6004, "name": "insufficientHumanScore", "msg": "Payer does not meet minimum human score requirement" },
        { "code": 6005, "name": "invalidMint", "msg": "Invalid mint for this invoice" },
        { "code": 6006, "name": "insufficientBalance", "msg": "Insufficient balance for payment" },
        { "code": 6007, "name": "unauthorizedMerchant", "msg": "Only the merchant can perform this operation" },
        { "code": 6008, "name": "unauthorizedPayer", "msg": "Only the payer can perform this operation" },
        { "code": 6009, "name": "arithmeticOverflow", "msg": "Arithmetic overflow" },
        { "code": 6010, "name": "invalidExpiration", "msg": "Invalid expiration time" },
        { "code": 6011, "name": "confidentialTransferNotEnabled", "msg": "Confidential transfer not yet enabled" },
        { "code": 6012, "name": "humanProfileNotFound", "msg": "Human profile not found for payer" }
    ],
    "types": [
        {
            "name": "confidentialInvoice",
            "docs": ["Confidential invoice account"],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "merchant", "type": "pubkey" },
                    { "name": "payer", "type": "pubkey" },
                    { "name": "amount", "type": "u64" },
                    { "name": "mint", "type": "pubkey" },
                    { "name": "humanRequirements", "type": "u16" },
                    { "name": "status", "type": { "defined": { "name": "invoiceStatus" } } },
                    { "name": "createdAt", "type": "i64" },
                    { "name": "expiresAt", "type": "i64" },
                    { "name": "paidAt", "type": "i64" },
                    { "name": "memo", "type": { "array": ["u8", 32] } },
                    { "name": "vault", "type": "pubkey" },
                    { "name": "bump", "type": "u8" },
                    { "name": "vaultBump", "type": "u8" },
                    { "name": "nonce", "type": "u64" }
                ]
            }
        },
        {
            "name": "createInvoiceParams",
            "docs": ["Parameters for creating a new invoice"],
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "amount", "type": "u64" },
                    { "name": "humanRequirements", "type": "u16" },
                    { "name": "expiresAt", "type": "i64" },
                    { "name": "memo", "type": { "array": ["u8", 32] } },
                    { "name": "nonce", "type": "u64" }
                ]
            }
        },
        {
            "name": "invoiceStatus",
            "docs": ["Invoice status enumeration"],
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "open" },
                    { "name": "paid" },
                    { "name": "cancelled" },
                    { "name": "withdrawn" }
                ]
            }
        }
    ]
};
//# sourceMappingURL=human_pay.js.map