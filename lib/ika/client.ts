/**
 * Ika gRPC Client — Honest Interface for HumanRail dWallet Integration
 *
 * Phase 5A: Read-only methods implemented. Mutation methods throw
 * explicit IkaNotImplementedError until Phase 5B/5C.
 *
 * Pre-alpha disclaimer: Ika devnet uses a single mock signer.
 * All data is subject to periodic wipes. Not production custody.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  IKA_DWALLET_PROGRAM_ID_DEVNET,
  IKA_GRPC_ENDPOINT_DEVNET,
  IKA_SOLANA_RPC_DEVNET,
} from "./constants";
import { IkaNotImplementedError, IkaDwallet, IkaMessageApproval } from "./types";
import { parseIkaDwalletAccount, parseIkaMessageApprovalAccount } from "./parsers";

// Re-export legacy constants for backward compatibility
export const IKA_DEVNET_PROGRAM_ID = IKA_DWALLET_PROGRAM_ID_DEVNET.toBase58();
export const IKA_GRPC_ENDPOINT = IKA_GRPC_ENDPOINT_DEVNET;

// Legacy interfaces are now in types.ts: IkaSignRequest, IkaSignResult

/**
 * IkaClient provides read-only access to Ika dWallet state on Solana,
 * plus stub methods for mutation operations that will be implemented
 * in Phase 5B/5C (gRPC DKG + signing).
 */
export class IkaClient {
  readonly connection: Connection;
  readonly dwalletProgramId: PublicKey;
  readonly grpcEndpoint: string;

  constructor(options?: {
    connection?: Connection;
    dwalletProgramId?: PublicKey;
    grpcEndpoint?: string;
  }) {
    this.connection =
      options?.connection ?? new Connection(IKA_SOLANA_RPC_DEVNET, "confirmed");
    this.dwalletProgramId =
      options?.dwalletProgramId ?? IKA_DWALLET_PROGRAM_ID_DEVNET;
    this.grpcEndpoint = options?.grpcEndpoint ?? IKA_GRPC_ENDPOINT_DEVNET;
  }

  // ── Read-Only Methods (Phase 5A — implemented) ──

  /**
   * Fetch and parse an Ika dWallet account from Solana.
   *
   * @param publicKey - The dWallet PDA address.
   * @returns Parsed IkaDwallet or null if not found / invalid.
   */
  async fetchDwallet(publicKey: PublicKey): Promise<IkaDwallet | null> {
    const info = await this.connection.getAccountInfo(publicKey);
    if (!info) return null;
    try {
      return parseIkaDwalletAccount(info.data as Buffer);
    } catch (err) {
      console.error("[IkaClient.fetchDwallet] Parse error:", err);
      return null;
    }
  }

  /**
   * Fetch and parse an Ika MessageApproval account from Solana.
   *
   * @param publicKey - The MessageApproval PDA address.
   * @returns Parsed IkaMessageApproval or null if not found / invalid.
   */
  async fetchMessageApproval(
    publicKey: PublicKey
  ): Promise<IkaMessageApproval | null> {
    const info = await this.connection.getAccountInfo(publicKey);
    if (!info) return null;
    try {
      return parseIkaMessageApprovalAccount(info.data as Buffer);
    } catch (err) {
      console.error("[IkaClient.fetchMessageApproval] Parse error:", err);
      return null;
    }
  }

  /**
   * Poll a MessageApproval account until its status becomes Signed,
   * or the timeout is reached.
   *
   * @param publicKey - The MessageApproval PDA address.
   * @param timeoutMs - Maximum wait time in milliseconds (default 30000).
   * @returns The parsed IkaMessageApproval once signed, or null on timeout.
   */
  async waitForMessageApprovalSigned(
    publicKey: PublicKey,
    timeoutMs = 30000
  ): Promise<IkaMessageApproval | null> {
    const interval = 500;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const ma = await this.fetchMessageApproval(publicKey);
      if (ma && ma.status === 1 /* MessageApprovalStatus.Signed */) {
        return ma;
      }
      await new Promise((r) => setTimeout(r, interval));
    }

    return null;
  }

  /**
   * Check whether the Ika dWallet program is deployed and executable
   * on the configured cluster.
   */
  async isDwalletProgramExecutable(): Promise<boolean> {
    try {
      const info = await this.connection.getAccountInfo(this.dwalletProgramId);
      return info?.executable === true;
    } catch {
      return false;
    }
  }

  // ── Mutation Methods (Phase 5B/5C — NOT YET IMPLEMENTED) ──

  /**
   * Create a new Ika dWallet via gRPC DKG.
   *
   * NOT YET IMPLEMENTED — Phase 5B.
   *
   * This requires:
   * 1. A live gRPC connection to the Ika network.
   * 2. BCS-serialized DWalletRequest::DKG payload.
   * 3. A user signature (Ed25519) over the signed request data.
   * 4. Polling for the on-chain CommitDWallet transaction.
   */
  async createDwalletViaDkg(): Promise<never> {
    throw new IkaNotImplementedError("createDwalletViaDkg");
  }

  /**
   * Transfer dWallet authority to a new pubkey (e.g., CPI authority PDA).
   *
   * NOT YET IMPLEMENTED — Phase 5B.
   *
   * This is a Solana transaction, not a gRPC call. It requires:
   * 1. The current authority to sign.
   * 2. A TransferOwnership instruction to the Ika program.
   */
  async transferDwalletAuthority(): Promise<never> {
    throw new IkaNotImplementedError("transferDwalletAuthority");
  }

  /**
   * Sign an approved message via Ika gRPC.
   *
   * NOT YET IMPLEMENTED — Phase 5C.
   *
   * This requires:
   * 1. A presign session identifier (from prior Presign gRPC call).
   * 2. An ApprovalProof referencing the on-chain MessageApproval.
   * 3. BCS-serialized DWalletRequest::Sign payload.
   * 4. Polling for CommitSignature on-chain.
   */
  async signApprovedMessage(): Promise<never> {
    throw new IkaNotImplementedError("signApprovedMessage");
  }
}
