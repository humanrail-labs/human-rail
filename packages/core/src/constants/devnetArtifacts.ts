/**
 * Public devnet artifacts from the completed Mandara / HumanRail / Ika lifecycle.
 * These are on-chain addresses, transaction signatures, and hashes — all public.
 * No private key material, DKG secrets, or attestation payloads.
 */

export const MANDARA_DEVNET_ARTIFACTS = {
  humanrailGuardProgramId: "Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2",
  ikaDwalletProgramId: "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",
  guardCpiAuthority: "FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd",

  ikaDwallet: {
    pda: "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
    publicKeyHex:
      "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d",
    publicKeyBase64: "AuLV9TsavARR38v8WjJCH6bN+3xsv79/hKPmuxd8sKpd",
    curve: "Secp256k1",
    state: "Active",
    authority: "FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd",
    authorityTransferSignature:
      "33xoiwuXmu56hC5Ks18kn6zMota41PNMGHu1KkVdzyFRnRcXX1VCdtK64Jg1LzSku5HuTWkxU6jvaFt63AXxUhtz",
  },

  guardedPolicy: {
    pda: "C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup",
    allowedChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    assetHashHex:
      "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593",
    recipientHashHex:
      "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55",
    perTxLimit: "100000000",
    dailyLimit: "500000000",
    totalLimit: "1000000000",
    expiresAt: "2027-05-01T00:00:00Z",
  },

  signingRequest: {
    requestIdHex:
      "f655534b535015853069dde66e0a501d9eb96869c778d69259b4846056b121da",
    guardSigningRequestPda: "CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5",
    messageDigestHex:
      "5c125f25f32ea5fa95ade18eabba8299fb1497f53fcac4799e4b5eefa7fdf46b",
    messageMetadataDigestHex:
      "0000000000000000000000000000000000000000000000000000000000000000",
    message:
      "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42",
    amount: "42000000",
    destinationChainId: 84532,
    signatureScheme: "EcdsaKeccak256",
    approveTxSignature:
      "4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt",
    status: "signed",
    signedAt: "2026-05-01T21:40:17.026996367+00:00",
    signatureHex:
      "ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e",
    signatureBase64:
      "ylwmQ0ifH6rj6jm6lgOG7KvkH7YSGMz69pP7fssbBc5BC5IrxFp+f4LGRqrLuBJ2Z27aOuP6Wvq4lgy7AMGbHg==",
  },

  messageApproval: {
    pda: "Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM",
    status: "signed",
    signatureLength: 64,
    signatureHex:
      "ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e",
    signatureBase64:
      "ylwmQ0ifH6rj6jm6lgOG7KvkH7YSGMz69pP7fssbBc5BC5IrxFp+f4LGRqrLuBJ2Z27aOuP6Wvq4lgy7AMGbHg==",
  },
} as const;

export const MANDARA_DEMO_ORG_NAME = "Mandara Devnet Demo";
export const MANDARA_DEMO_AGENT_NAME = "Cross-Chain Treasury Agent";
export const MANDARA_DEMO_POLICY_NAME = "Base Sepolia USDC Mandate";
