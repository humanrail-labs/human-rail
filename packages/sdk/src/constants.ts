import { PublicKey } from '@solana/web3.js';

// Program IDs - canonical addresses from keypairs
export const HUMAN_REGISTRY_PROGRAM_ID = new PublicKey(
  '6BrHosLK9gjJmGWtdxUw8fgEWoew4HBM8QBrkwwokcS2'
);

export const HUMAN_PAY_PROGRAM_ID = new PublicKey(
  '6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe'
);

export const DATA_BLINK_PROGRAM_ID = new PublicKey(
  '3j1Gfbi9WL2KUMKQavxdpjA2rJNBP8M8AmYgv1rKZKyj'
);

// PDA Seeds
export const HUMAN_PROFILE_SEED = Buffer.from('human_profile');
export const REGISTRY_CONFIG_SEED = Buffer.from('registry_config');
export const INVOICE_SEED = Buffer.from('invoice');
export const INVOICE_VAULT_SEED = Buffer.from('vault');
export const TASK_SEED = Buffer.from('task');
export const TASK_VAULT_SEED = Buffer.from('task_vault');
export const RESPONSE_SEED = Buffer.from('response');
export const WORKER_STATS_SEED = Buffer.from('worker_stats');

// Score thresholds
export const UNIQUE_HUMAN_THRESHOLD = 5000;
export const MAX_HUMAN_SCORE = 10000;

// Attestation type weights (in basis points)
export const ATTESTATION_WEIGHTS = {
  SAS: 3000,
  WorldId: 2500,
  Civic: 2000,
  GitcoinPassport: 1500,
  Custom: 500,
} as const;
