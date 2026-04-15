import { PublicKey, Keypair, Commitment } from "@solana/web3.js";
import type { Capability, AgentAccount, Receipt, CapabilityScope } from "./types.js";
export interface PaymentResult {
    success: boolean;
    receipt?: Receipt;
    signatures: string[];
    error?: string;
}
export declare class HumanRailAgent {
    private connection;
    private agentKeypair;
    private principalPubkey;
    private client;
    constructor(config: {
        agentKeypair: Keypair;
        principalPubkey: PublicKey;
        rpcUrl?: string;
        commitment?: Commitment;
    });
    get pubkey(): PublicKey;
    checkCapability(params: {
        action: CapabilityScope;
        amount?: bigint;
        targetProgram?: PublicKey;
    }): Promise<{
        authorized: boolean;
        reason?: string;
        capability?: Capability;
    }>;
    getStatus(): Promise<{
        agent: AgentAccount;
        capabilities: Capability[];
        frozen: boolean;
        totalSpent: bigint;
        dailyRemaining: bigint;
        recentReceipts: Receipt[];
    }>;
    isFrozen(): Promise<boolean>;
    isActive(): Promise<boolean>;
    executePayment(params: {
        to: PublicKey;
        amount: bigint;
        memo?: string;
    }): Promise<PaymentResult>;
    executeDataAction(params: {
        taskType: string;
        data: string;
    }): Promise<PaymentResult>;
    signDocument(params: {
        documentHash: Buffer;
        metadata?: string;
    }): Promise<PaymentResult>;
    onFreeze(callback: (frozen: boolean) => void): () => void;
    onCapabilityChange(callback: (capabilities: Capability[]) => void): () => void;
    private sendAndConfirm;
    private emitReceipt;
    private findOrRegisterDocument;
}
//# sourceMappingURL=agent.d.ts.map