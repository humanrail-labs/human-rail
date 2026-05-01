/**
 * Ika dWallet Protocol — Deterministic Constants
 *
 * All values are sourced from the official Ika pre-alpha crates and examples:
 * - ika-dwallet-anchor (git: dwallet-labs/ika-pre-alpha)
 * - ika-dwallet-types
 * - chains/solana/examples/_shared/ika-setup.ts
 * - chains/solana/examples/voting/e2e-rust/src/main.rs
 *
 * Pre-alpha disclaimer: Ika devnet uses a single mock signer.
 * Data is wiped periodically. Not production custody.
 */

import { PublicKey } from "@solana/web3.js";

/** Ika dWallet program ID on Solana devnet. */
export const IKA_DWALLET_PROGRAM_ID_DEVNET = new PublicKey(
  "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"
);

/** Ika gRPC endpoint for pre-alpha devnet. */
export const IKA_GRPC_ENDPOINT_DEVNET =
  "https://pre-alpha-dev-1.ika.ika-network.net:443";

/** Solana devnet RPC endpoint. */
export const IKA_SOLANA_RPC_DEVNET = "https://api.devnet.solana.com";

/** Seed for deriving the CPI authority PDA from a caller program. */
export const IKA_CPI_AUTHORITY_SEED = "__ika_cpi_authority";

/** Seed for deriving the DWalletCoordinator PDA. */
export const IKA_SEED_DWALLET_COORDINATOR = "dwallet_coordinator";

/** Seed for deriving the dWallet PDA. */
export const IKA_SEED_DWALLET = "dwallet";

/** Seed for deriving the MessageApproval PDA. */
export const IKA_SEED_MESSAGE_APPROVAL = "message_approval";

// ── Account discriminators (from ika-dwallet-litesvm-test) ──

/** dWallet account discriminator. */
export const IKA_DISC_DWALLET = 2;

/** MessageApproval account discriminator. */
export const IKA_DISC_MESSAGE_APPROVAL = 14;

/** DWalletCoordinator account discriminator. */
export const IKA_DISC_COORDINATOR = 1;

/** NetworkEncryptionKey account discriminator. */
export const IKA_DISC_NEK = 3;

// ── Account sizes ──

/** DWallet account total size (discriminator + version + data). */
export const IKA_DWALLET_LEN = 153; // actual devnet account size (pre-alpha mock may vary)

/** DWalletCoordinator account total size. */
export const IKA_COORDINATOR_LEN = 116;

/** NetworkEncryptionKey account total size. */
export const IKA_NEK_LEN = 164;

// ── dWallet field offsets (after 2-byte header) ──

/** authority pubkey offset in dWallet account data. */
export const IKA_DW_OFFSET_AUTHORITY = 2;

/** curve byte offset in dWallet account data. */
export const IKA_DW_OFFSET_CURVE = 34;

/** state byte offset in dWallet account data. */
export const IKA_DW_OFFSET_STATE = 35;

/** public_key_len byte offset in dWallet account data. */
export const IKA_DW_OFFSET_PUBLIC_KEY_LEN = 36;

/** public_key bytes offset in dWallet account data. */
export const IKA_DW_OFFSET_PUBLIC_KEY = 37;

/** created_epoch u64 offset in dWallet account data. */
export const IKA_DW_OFFSET_CREATED_EPOCH = 102;

/** noa_public_key pubkey offset in dWallet account data. */
export const IKA_DW_OFFSET_NOA_PUBLIC_KEY = 110;

/** is_imported byte offset in dWallet account data. */
export const IKA_DW_OFFSET_IS_IMPORTED = 142;

/** bump byte offset in dWallet account data. */
export const IKA_DW_OFFSET_BUMP = 659;

// ── MessageApproval field offsets (after 2-byte header) ──
// Verified from e2e-rust examples (voting + multisig).

/** dwallet pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_DWALLET = 2;

/** message_hash / message_digest offset in MessageApproval account data. */
export const IKA_MA_OFFSET_MESSAGE_HASH = 34;

/** approver pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_APPROVER = 66;

/** user_pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_USER_PUBKEY = 98;

/** signature_scheme offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE_SCHEME = 130;

/** status byte offset in MessageApproval account data. */
export const IKA_MA_OFFSET_STATUS = 172;

/** signature_len u16 offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE_LEN = 173;

/** signature bytes offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE = 175;

// ── Instruction discriminators ──

/** approve_message instruction discriminator. */
export const IKA_IX_APPROVE_MESSAGE = 8;

/** transfer_ownership instruction discriminator. */
export const IKA_IX_TRANSFER_OWNERSHIP = 24;

/** transfer_future_sign instruction discriminator. */
export const IKA_IX_TRANSFER_FUTURE_SIGN = 42;

/** commit_dwallet instruction discriminator. */
export const IKA_IX_COMMIT_DWALLET = 31;
