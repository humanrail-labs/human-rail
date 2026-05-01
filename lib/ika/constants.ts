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
export const IKA_DWALLET_LEN = 153;

/** MessageApproval account total size. */
export const IKA_MESSAGE_APPROVAL_LEN = 312;

/** DWalletCoordinator account total size. */
export const IKA_COORDINATOR_LEN = 116;

/** NetworkEncryptionKey account total size. */
export const IKA_NEK_LEN = 164;

// ── dWallet field offsets (after 2-byte header) ──
// Layout verified against real 153-byte devnet dWallet accounts.
//
// DWallet (153 bytes):
//   0      discriminator (1)
//   1      version (1)
//   2..34  authority (32)
//   34..36 curve u16 LE (2)
//   36     state (1)
//   37     public_key_len (1)
//   38..103 public_key (65 bytes padded)
//   103..111 created_epoch u64 LE (8)
//   111..143 noa_public_key (32)
//   143    is_imported (1)
//   144    bump (1)
//   145..153 reserved (8)

/** authority pubkey offset in dWallet account data. */
export const IKA_DW_OFFSET_AUTHORITY = 2;

/** curve u16 LE offset in dWallet account data. */
export const IKA_DW_OFFSET_CURVE = 34;

/** state byte offset in dWallet account data. */
export const IKA_DW_OFFSET_STATE = 36;

/** public_key_len byte offset in dWallet account data. */
export const IKA_DW_OFFSET_PUBLIC_KEY_LEN = 37;

/** public_key bytes offset in dWallet account data. */
export const IKA_DW_OFFSET_PUBLIC_KEY = 38;

/** created_epoch u64 offset in dWallet account data. */
export const IKA_DW_OFFSET_CREATED_EPOCH = 103;

/** noa_public_key pubkey offset in dWallet account data. */
export const IKA_DW_OFFSET_NOA_PUBLIC_KEY = 111;

/** is_imported byte offset in dWallet account data. */
export const IKA_DW_OFFSET_IS_IMPORTED = 143;

/** bump byte offset in dWallet account data. */
export const IKA_DW_OFFSET_BUMP = 144;

// ── MessageApproval field offsets (after 2-byte header) ──
// Layout verified from e2e-rust examples (voting + multisig).
// Includes message_metadata_digest field present in newer Ika revisions.
//
// MessageApproval (312 bytes):
//   0      discriminator (1)
//   1      version (1)
//   2..34  dwallet (32)
//   34..66 message_digest (32)
//   66..98 message_metadata_digest (32)
//   98..130 approver (32)
//   130..162 user_pubkey (32)
//   162..164 signature_scheme u16 LE (2)
//   164..172 epoch u64 LE (8)
//   172    status (1)
//   173..175 signature_len u16 LE (2)
//   175..303 signature (128 bytes padded)
//   303    bump (1)
//   304..312 reserved (8)

/** dwallet pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_DWALLET = 2;

/** message_digest offset in MessageApproval account data. */
export const IKA_MA_OFFSET_MESSAGE_DIGEST = 34;

/** message_metadata_digest offset in MessageApproval account data. */
export const IKA_MA_OFFSET_MESSAGE_METADATA_DIGEST = 66;

/** approver pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_APPROVER = 98;

/** user_pubkey offset in MessageApproval account data. */
export const IKA_MA_OFFSET_USER_PUBKEY = 130;

/** signature_scheme u16 LE offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE_SCHEME = 162;

/** epoch u64 LE offset in MessageApproval account data. */
export const IKA_MA_OFFSET_EPOCH = 164;

/** status byte offset in MessageApproval account data. */
export const IKA_MA_OFFSET_STATUS = 172;

/** signature_len u16 offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE_LEN = 173;

/** signature bytes offset in MessageApproval account data. */
export const IKA_MA_OFFSET_SIGNATURE = 175;

/** bump byte offset in MessageApproval account data. */
export const IKA_MA_OFFSET_BUMP = 303;

// ── Instruction discriminators ──

/** approve_message instruction discriminator. */
export const IKA_IX_APPROVE_MESSAGE = 8;

/** transfer_ownership instruction discriminator. */
export const IKA_IX_TRANSFER_OWNERSHIP = 24;

/** transfer_future_sign instruction discriminator. */
export const IKA_IX_TRANSFER_FUTURE_SIGN = 42;

/** commit_dwallet instruction discriminator. */
export const IKA_IX_COMMIT_DWALLET = 31;
