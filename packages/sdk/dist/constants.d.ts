import { PublicKey } from '@solana/web3.js';
export declare const HUMAN_REGISTRY_PROGRAM_ID: PublicKey;
export declare const HUMAN_PAY_PROGRAM_ID: PublicKey;
export declare const DATA_BLINK_PROGRAM_ID: PublicKey;
export declare const HUMAN_PROFILE_SEED: Buffer<ArrayBuffer>;
export declare const REGISTRY_CONFIG_SEED: Buffer<ArrayBuffer>;
export declare const INVOICE_SEED: Buffer<ArrayBuffer>;
export declare const INVOICE_VAULT_SEED: Buffer<ArrayBuffer>;
export declare const TASK_SEED: Buffer<ArrayBuffer>;
export declare const TASK_VAULT_SEED: Buffer<ArrayBuffer>;
export declare const RESPONSE_SEED: Buffer<ArrayBuffer>;
export declare const WORKER_STATS_SEED: Buffer<ArrayBuffer>;
export declare const UNIQUE_HUMAN_THRESHOLD = 5000;
export declare const MAX_HUMAN_SCORE = 10000;
export declare const ATTESTATION_WEIGHTS: {
    readonly SAS: 3000;
    readonly WorldId: 2500;
    readonly Civic: 2000;
    readonly GitcoinPassport: 1500;
    readonly Custom: 500;
};
//# sourceMappingURL=constants.d.ts.map