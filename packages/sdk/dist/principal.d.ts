import { PublicKey, Transaction } from "@solana/web3.js";
import type { AgentAccount, Capability, Receipt, CapabilityScope, HumanProfile } from "./types.js";
export declare class HumanRailPrincipal {
    private client;
    private walletPubkey;
    constructor(config: {
        walletPubkey: PublicKey;
        rpcUrl?: string;
    });
    buildRegisterAgentTx(params: {
        agentPubkey: PublicKey;
        name: string;
        agentType: string;
    }): Promise<Transaction>;
    buildIssueCapabilityTx(params: {
        agentPubkey: PublicKey;
        scope: CapabilityScope;
        perTxLimit: bigint;
        dailyLimit: bigint;
        totalLimit: bigint;
        expiresAt: bigint | null;
        allowedPrograms?: PublicKey[];
    }): Promise<Transaction>;
    buildSuspendAgentTx(agentPubkey: PublicKey): Promise<Transaction>;
    buildReactivateAgentTx(agentPubkey: PublicKey): Promise<Transaction>;
    buildRevokeAgentTx(agentPubkey: PublicKey): Promise<Transaction>;
    buildFreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction>;
    buildUnfreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction>;
    getMyAgents(): Promise<AgentAccount[]>;
    getMyProfile(): Promise<HumanProfile | null>;
    getAllCapabilities(): Promise<Capability[]>;
    getAllReceipts(): Promise<Receipt[]>;
}
//# sourceMappingURL=principal.d.ts.map