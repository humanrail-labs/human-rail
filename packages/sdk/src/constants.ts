import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = {
  humanRegistry: new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo'),
  agentRegistry: new PublicKey('GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ'),
  delegation: new PublicKey('DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT'),
  receipts: new PublicKey('EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM'),
} as const;

export type ProgramIdKeys = keyof typeof PROGRAM_IDS;

export const SEEDS = {
  HUMAN_PROFILE: Buffer.from('human_profile'),
  ISSUER: Buffer.from('issuer'),
  ATTESTATION: Buffer.from('attestation'),
  ISSUER_REGISTRY: Buffer.from('issuer_registry'),
  AGENT: Buffer.from('agent'),
  AGENT_STATS: Buffer.from('agent_stats'),
  KEY_ROTATION: Buffer.from('key_rotation'),
  CAPABILITY: Buffer.from('capability'),
  REVOCATION: Buffer.from('revocation'),
  FREEZE: Buffer.from('freeze'),
  USAGE: Buffer.from('usage'),
  RECEIPT: Buffer.from('receipt'),
  RECEIPT_INDEX: Buffer.from('receipt_index'),
} as const;

export const UNIQUE_THRESHOLD = 100;
export const MIN_HUMAN_SCORE_FOR_AGENT = 50;
export const VERIFIED_HUMAN_THRESHOLD = 60;
export const MAX_ATTESTATIONS = 8;
export const DEFAULT_ATTESTATION_VALIDITY = 90 * 24 * 60 * 60;

export const PROGRAM_SCOPE = {
  HUMAN_PAY: 1n << 0n,
  DATA_BLINK: 1n << 1n,
  TOKEN_TRANSFER: 1n << 2n,
  NFT_TRANSFER: 1n << 3n,
  SWAP: 1n << 4n,
  STAKE: 1n << 5n,
  GOVERNANCE: 1n << 6n,
  DOCUMENT_SIGN: 1n << 7n,
} as const;

export const ASSET_SCOPE = {
  SOL: 1n << 0n,
  USDC: 1n << 1n,
  USDT: 1n << 2n,
  ANY_SPL_TOKEN: 1n << 3n,
  ANY_NFT: 1n << 4n,
} as const;

export const ATTESTATION_DOMAIN_SEPARATOR = 'humanrail:attestation:v1';
export const ATTESTATION_SIGNING_BYTES_LEN = 146;
export const INTERFACE_VERSION = 1;
