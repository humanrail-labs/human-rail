import { PublicKey, Commitment } from "@solana/web3.js";
import type { HumanProfile, AgentAccount, Capability, FreezeAccount, Receipt } from "./types.js";
export declare class HumanRailClient {
    private connection;
    constructor(config?: {
        rpcUrl?: string;
        commitment?: Commitment;
    });
    getHumanProfile(wallet: PublicKey): Promise<HumanProfile | null>;
    humanProfileExists(wallet: PublicKey): Promise<boolean>;
    getAgent(principal: PublicKey, nonce: bigint): Promise<AgentAccount | null>;
    getAgentByPubkey(agentPubkey: PublicKey): Promise<AgentAccount | null>;
    getAgentsByPrincipal(principal: PublicKey): Promise<AgentAccount[]>;
    getCapability(principal: PublicKey, agent: PublicKey, nonce: bigint): Promise<Capability | null>;
    getCapabilitiesForAgent(principal: PublicKey, agent: PublicKey): Promise<Capability[]>;
    getFreezeStatus(principal: PublicKey, agent: PublicKey): Promise<FreezeAccount | null>;
    getReceipts(agent: PublicKey, limit?: number): Promise<Receipt[]>;
    getReceiptCount(agent: PublicKey): Promise<number>;
    getAgentStatus(agentPubkey: PublicKey): Promise<{
        agent: AgentAccount;
        capabilities: Capability[];
        frozen: boolean;
        totalSpent: bigint;
        recentReceipts: Receipt[];
    }>;
    private _isFrozen;
}
//# sourceMappingURL=client.d.ts.map