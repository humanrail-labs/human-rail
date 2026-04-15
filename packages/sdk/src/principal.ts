import { PublicKey, Transaction } from "@solana/web3.js";
import { HumanRailClient } from "./client.js";
import {
  buildRegisterAgentIx,
  buildIssueCapabilityIx,
  buildSuspendAgentIx,
  buildReactivateAgentIx,
  buildRevokeAgentIx,
  buildFreezeAgentIx,
  buildUnfreezeAgentIx,
} from "./instructions.js";
import type {
  AgentAccount,
  Capability,
  Receipt,
  CapabilityScope,
  HumanProfile,
} from "./types.js";

export class HumanRailPrincipal {
  private client: HumanRailClient;
  private walletPubkey: PublicKey;

  constructor(config: { walletPubkey: PublicKey; rpcUrl?: string }) {
    this.walletPubkey = config.walletPubkey;
    this.client = new HumanRailClient({ rpcUrl: config.rpcUrl });
  }

  async buildRegisterAgentTx(params: {
    agentPubkey: PublicKey;
    name: string;
    agentType: string;
  }): Promise<Transaction> {
    const nonce = BigInt(Date.now());
    const ix = buildRegisterAgentIx({
      principal: this.walletPubkey,
      agentPubkey: params.agentPubkey,
      name: params.name,
      agentType: params.agentType,
      nonce,
    });
    return new Transaction().add(ix);
  }

  async buildIssueCapabilityTx(params: {
    agentPubkey: PublicKey;
    scope: CapabilityScope;
    perTxLimit: bigint;
    dailyLimit: bigint;
    totalLimit: bigint;
    expiresAt: bigint | null;
    allowedPrograms?: PublicKey[];
  }): Promise<Transaction> {
    const nonce = BigInt(Date.now());
    const ix = buildIssueCapabilityIx({
      principal: this.walletPubkey,
      agent: params.agentPubkey,
      scope: params.scope,
      perTxLimit: params.perTxLimit,
      dailyLimit: params.dailyLimit,
      totalLimit: params.totalLimit,
      expiresAt: params.expiresAt,
      allowedPrograms: params.allowedPrograms || [],
      nonce,
    });
    return new Transaction().add(ix);
  }

  async buildSuspendAgentTx(agentPubkey: PublicKey): Promise<Transaction> {
    const ix = buildSuspendAgentIx({ principal: this.walletPubkey, agentPda: agentPubkey });
    return new Transaction().add(ix);
  }

  async buildReactivateAgentTx(agentPubkey: PublicKey): Promise<Transaction> {
    const ix = buildReactivateAgentIx({ principal: this.walletPubkey, agentPda: agentPubkey });
    return new Transaction().add(ix);
  }

  async buildRevokeAgentTx(agentPubkey: PublicKey): Promise<Transaction> {
    const ix = buildRevokeAgentIx({ principal: this.walletPubkey, agentPda: agentPubkey });
    return new Transaction().add(ix);
  }

  async buildFreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction> {
    // Need a capability PDA for the freeze instruction
    const caps = await this.client.getCapabilitiesForAgent(this.walletPubkey, agentPubkey);
    if (caps.length === 0) {
      throw new Error("No capability found for agent; cannot freeze");
    }
    const ix = buildFreezeAgentIx({
      principal: this.walletPubkey,
      agent: agentPubkey,
      capabilityPda: caps[0].pda,
    });
    return new Transaction().add(ix);
  }

  async buildUnfreezeAgentTx(agentPubkey: PublicKey): Promise<Transaction> {
    const ix = buildUnfreezeAgentIx({ principal: this.walletPubkey, agent: agentPubkey });
    return new Transaction().add(ix);
  }

  // Reads delegated to client
  async getMyAgents(): Promise<AgentAccount[]> {
    return this.client.getAgentsByPrincipal(this.walletPubkey);
  }

  async getMyProfile(): Promise<HumanProfile | null> {
    return this.client.getHumanProfile(this.walletPubkey);
  }

  async getAllCapabilities(): Promise<Capability[]> {
    // Fetch all agents first, then capabilities for each
    const agents = await this.getMyAgents();
    const allCaps: Capability[] = [];
    for (const agent of agents) {
      const caps = await this.client.getCapabilitiesForAgent(this.walletPubkey, agent.pda);
      allCaps.push(...caps);
    }
    return allCaps;
  }

  async getAllReceipts(): Promise<Receipt[]> {
    const agents = await this.getMyAgents();
    const allReceipts: Receipt[] = [];
    for (const agent of agents) {
      const receipts = await this.client.getReceipts(agent.pda);
      allReceipts.push(...receipts);
    }
    allReceipts.sort((a, b) => b.timestamp - a.timestamp);
    return allReceipts;
  }
}
