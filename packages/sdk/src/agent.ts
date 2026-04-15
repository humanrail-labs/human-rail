import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  Commitment,
} from "@solana/web3.js";
import { HumanRailClient } from "./client.js";
import {
  buildDirectPaymentIx,
  buildCreateReceiptIx,
  buildSignDocumentIx,
} from "./instructions.js";
import { deriveCapabilityPda, deriveFreezePda, PROGRAM_IDS } from "./constants.js";
import type { Capability, AgentAccount, Receipt, CapabilityScope } from "./types.js";

export interface PaymentResult {
  success: boolean;
  receipt?: Receipt;
  signatures: string[];
  error?: string;
}

export class HumanRailAgent {
  private connection: Connection;
  private agentKeypair: Keypair;
  private principalPubkey: PublicKey;
  private client: HumanRailClient;

  constructor(config: {
    agentKeypair: Keypair;
    principalPubkey: PublicKey;
    rpcUrl?: string;
    commitment?: Commitment;
  }) {
    const rpcUrl = config.rpcUrl ?? "https://api.devnet.solana.com";
    const commitment = config.commitment ?? "confirmed";
    this.connection = new Connection(rpcUrl, commitment);
    this.agentKeypair = config.agentKeypair;
    this.principalPubkey = config.principalPubkey;
    this.client = new HumanRailClient({ rpcUrl, commitment });
  }

  get pubkey(): PublicKey {
    return this.agentKeypair.publicKey;
  }

  // === Authorization checks ===
  async checkCapability(params: {
    action: CapabilityScope;
    amount?: bigint;
    targetProgram?: PublicKey;
  }): Promise<{ authorized: boolean; reason?: string; capability?: Capability }> {
    const status = await this.client.getAgentStatus(this.pubkey);
    if (status.agent.status !== "Active") {
      return { authorized: false, reason: `Agent is ${status.agent.status}` };
    }
    if (status.frozen) {
      return { authorized: false, reason: "Agent is frozen" };
    }

    const scopeMap: Record<CapabilityScope, bigint> = {
      Payment: BigInt(1),
      DataAction: BigInt(2),
      DocumentSign: BigInt(4),
      Full: BigInt("0xFFFFFFFFFFFFFFFF"),
    };
    const requiredScope = scopeMap[params.action];

    const now = Math.floor(Date.now() / 1000);
    for (const cap of status.capabilities) {
      if (cap.status !== "Active") continue;
      if (cap.isFrozen) continue;
      if (cap.expiresAt > 0 && cap.expiresAt < now) continue;
      if ((cap.allowedPrograms & requiredScope) === BigInt(0)) continue;

      if (params.targetProgram) {
        // Additional program allowlist check if needed
      }

      if (params.amount !== undefined && params.amount > BigInt(0)) {
        if (params.amount > cap.perTxLimit) {
          return { authorized: false, reason: "Amount exceeds per-transaction limit" };
        }
        if (cap.dailySpent + params.amount > cap.dailyLimit) {
          return { authorized: false, reason: "Amount exceeds daily limit" };
        }
        if (cap.totalSpent + params.amount > cap.totalLimit) {
          return { authorized: false, reason: "Amount exceeds total limit" };
        }
      }

      return { authorized: true, capability: cap };
    }

    return { authorized: false, reason: "No matching capability found" };
  }

  // === Agent status ===
  async getStatus(): Promise<{
    agent: AgentAccount;
    capabilities: Capability[];
    frozen: boolean;
    totalSpent: bigint;
    dailyRemaining: bigint;
    recentReceipts: Receipt[];
  }> {
    const status = await this.client.getAgentStatus(this.pubkey);
    const dailyRemaining = status.capabilities.reduce(
      (sum, c) => sum + (c.dailyLimit - c.dailySpent),
      BigInt(0)
    );
    return { ...status, dailyRemaining };
  }

  async isFrozen(): Promise<boolean> {
    const freeze = await this.client.getFreezeStatus(this.principalPubkey, this.pubkey);
    return freeze ? freeze.frozen : false;
  }

  async isActive(): Promise<boolean> {
    const agent = await this.client.getAgentByPubkey(this.pubkey);
    return agent ? agent.status === "Active" : false;
  }

  // === Actions ===
  async executePayment(params: {
    to: PublicKey;
    amount: bigint;
    memo?: string;
  }): Promise<PaymentResult> {
    const check = await this.checkCapability({ action: "Payment", amount: params.amount });
    if (!check.authorized || !check.capability) {
      return { success: false, error: check.reason, signatures: [] };
    }

    const ix = buildDirectPaymentIx({
      from: this.pubkey,
      to: params.to,
      amount: params.amount,
    });

    try {
      const sig = await this.sendAndConfirm(ix);

      // Emit receipt
      const receiptSig = await this.emitReceipt({
        capabilityPda: check.capability.pda,
        actionType: 6, // Payment
        amount: params.amount,
        destination: params.to,
        memo: params.memo || "Payment",
      });

      const receipts = await this.client.getReceipts(this.pubkey, 1);
      return {
        success: true,
        signatures: [sig, receiptSig],
        receipt: receipts[0],
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Payment failed", signatures: [] };
    }
  }

  async executeDataAction(params: {
    taskType: string;
    data: string;
  }): Promise<PaymentResult> {
    const check = await this.checkCapability({ action: "DataAction" });
    if (!check.authorized || !check.capability) {
      return { success: false, error: check.reason, signatures: [] };
    }

    try {
      // For DataBlink, the on-chain interaction is complex (task vaults, Token-2022).
      // We emit a receipt to record that the agent performed this data action.
      const destination = this.pubkey; // self-reference
      const receiptSig = await this.emitReceipt({
        capabilityPda: check.capability.pda,
        actionType: 4, // Task Response
        amount: BigInt(0),
        destination,
        memo: `${params.taskType}: ${params.data.slice(0, 200)}`,
      });

      const receipts = await this.client.getReceipts(this.pubkey, 1);
      return {
        success: true,
        signatures: [receiptSig],
        receipt: receipts[0],
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Data action failed", signatures: [] };
    }
  }

  async signDocument(params: {
    documentHash: Buffer;
    metadata?: string;
  }): Promise<PaymentResult> {
    const check = await this.checkCapability({ action: "DocumentSign" });
    if (!check.authorized || !check.capability) {
      return { success: false, error: check.reason, signatures: [] };
    }

    try {
      const ix = buildSignDocumentIx({
        signer: this.pubkey,
        documentPda: (await this.findOrRegisterDocument(params.documentHash)).documentPda,
        role: params.metadata || "Agent Signer",
      });

      const sig = await this.sendAndConfirm(ix);

      const receiptSig = await this.emitReceipt({
        capabilityPda: check.capability.pda,
        actionType: 5, // Document Sign
        amount: BigInt(0),
        destination: this.pubkey,
        memo: params.metadata || "Document signed by agent",
      });

      const receipts = await this.client.getReceipts(this.pubkey, 1);
      return {
        success: true,
        signatures: [sig, receiptSig],
        receipt: receipts[0],
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Document signing failed", signatures: [] };
    }
  }

  // === Event listening ===
  onFreeze(callback: (frozen: boolean) => void): () => void {
    const [freezePda] = deriveFreezePda(this.principalPubkey, this.pubkey);
    const subId = this.connection.onAccountChange(freezePda, (accountInfo) => {
      callback(accountInfo !== null);
    });
    return () => {
      this.connection.removeAccountChangeListener(subId);
    };
  }

  onCapabilityChange(callback: (capabilities: Capability[]) => void): () => void {
    // Poll capabilities every 10s (Solana WebSocket for program accounts is limited)
    const interval = setInterval(async () => {
      const caps = await this.client.getCapabilitiesForAgent(this.principalPubkey, this.pubkey);
      callback(caps);
    }, 10000);
    return () => clearInterval(interval);
  }

  // === Internal helpers ===
  private async sendAndConfirm(ix: import("@solana/web3.js").TransactionInstruction): Promise<string> {
    const tx = new Transaction().add(ix);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.pubkey;
    tx.sign(this.agentKeypair);
    const sig = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    return sig;
  }

  private async emitReceipt(params: {
    capabilityPda: PublicKey;
    actionType: number;
    amount: bigint;
    destination: PublicKey;
    memo: string;
  }): Promise<string> {
    const nonce = BigInt(Date.now());
    const ix = buildCreateReceiptIx({
      agent: this.pubkey,
      principal: this.principalPubkey,
      capability: params.capabilityPda,
      actionType: params.actionType,
      amount: params.amount,
      destination: params.destination,
      memo: params.memo,
      nonce,
    });
    return this.sendAndConfirm(ix);
  }

  private async findOrRegisterDocument(docHash: Buffer): Promise<{ documentPda: PublicKey; existed: boolean }> {
    const [documentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("document"), docHash],
      PROGRAM_IDS.documentRegistry
    );
    const info = await this.connection.getAccountInfo(documentPda);
    if (!info) {
      throw new Error("Document not registered on-chain. The document must be registered before an agent can sign it.");
    }
    return { documentPda, existed: true };
  }
}
