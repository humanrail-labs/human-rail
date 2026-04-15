import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import {
  PROGRAM_IDS,
  deriveHumanProfilePda,
  deriveAgentPda,
  deriveCapabilityPda,
  deriveFreezePda,
  deriveReceiptPda,
} from "./constants.js";
import {
  parseHumanProfile,
  parseAgentProfile,
  parseCapability,
  parseFreezeAccount,
  parseReceipt,
} from "./parsers.js";
import type { HumanProfile, AgentAccount, Capability, FreezeAccount, Receipt } from "./types.js";

export class HumanRailClient {
  private connection: Connection;

  constructor(config?: { rpcUrl?: string; commitment?: Commitment }) {
    const rpcUrl = config?.rpcUrl ?? "https://api.devnet.solana.com";
    const commitment = config?.commitment ?? "confirmed";
    this.connection = new Connection(rpcUrl, commitment);
  }

  // Human Registry reads
  async getHumanProfile(wallet: PublicKey): Promise<HumanProfile | null> {
    const [pda] = deriveHumanProfilePda(wallet);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    return parseHumanProfile(accountInfo.data as Buffer);
  }

  async humanProfileExists(wallet: PublicKey): Promise<boolean> {
    const [pda] = deriveHumanProfilePda(wallet);
    const accountInfo = await this.connection.getAccountInfo(pda);
    return accountInfo !== null;
  }

  // Agent Registry reads
  async getAgent(principal: PublicKey, nonce: bigint): Promise<AgentAccount | null> {
    const [pda] = deriveAgentPda(principal, nonce);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    return parseAgentProfile(accountInfo.data as Buffer, pda);
  }

  async getAgentByPubkey(agentPubkey: PublicKey): Promise<AgentAccount | null> {
    const accountInfo = await this.connection.getAccountInfo(agentPubkey);
    if (!accountInfo) return null;
    return parseAgentProfile(accountInfo.data as Buffer, agentPubkey);
  }

  async getAgentsByPrincipal(principal: PublicKey): Promise<AgentAccount[]> {
    const programId = PROGRAM_IDS.agentRegistry;
    const accounts = await this.connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: principal.toBase58(),
          },
        },
      ],
    });

    const parsedAgents: AgentAccount[] = [];
    for (const { pubkey, account } of accounts) {
      const parsed = parseAgentProfile(account.data as Buffer, pubkey);
      if (parsed) parsedAgents.push(parsed);
    }
    parsedAgents.sort((a, b) => b.createdAt - a.createdAt);
    return parsedAgents;
  }

  // Delegation reads
  async getCapability(
    principal: PublicKey,
    agent: PublicKey,
    nonce: bigint
  ): Promise<Capability | null> {
    const [pda] = deriveCapabilityPda(principal, agent, nonce);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    const parsed = parseCapability(accountInfo.data as Buffer, pda);
    if (!parsed) return null;
    parsed.isFrozen = await this._isFrozen(principal, agent);
    return parsed;
  }

  async getCapabilitiesForAgent(principal: PublicKey, agent: PublicKey): Promise<Capability[]> {
    const programId = PROGRAM_IDS.delegation;
    const accounts = await this.connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: principal.toBase58(),
          },
        },
        {
          memcmp: {
            offset: 40,
            bytes: agent.toBase58(),
          },
        },
      ],
    });

    const parsedCapabilities: Capability[] = [];
    const isFrozen = await this._isFrozen(principal, agent);

    for (const { pubkey, account } of accounts) {
      const parsed = parseCapability(account.data as Buffer, pubkey);
      if (parsed) {
        parsed.isFrozen = isFrozen;
        parsedCapabilities.push(parsed);
      }
    }
    parsedCapabilities.sort((a, b) => b.issuedAt - a.issuedAt);
    return parsedCapabilities;
  }

  async getFreezeStatus(principal: PublicKey, agent: PublicKey): Promise<FreezeAccount | null> {
    const [freezePda] = deriveFreezePda(principal, agent);
    const accountInfo = await this.connection.getAccountInfo(freezePda);
    if (!accountInfo) return null;
    return parseFreezeAccount(accountInfo.data as Buffer);
  }

  // Receipt reads
  async getReceipts(agent: PublicKey, limit?: number): Promise<Receipt[]> {
    const programId = PROGRAM_IDS.receipts;
    const receiptAccounts = await this.connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 40, bytes: agent.toBase58() } }],
    });

    const parsedReceipts: Receipt[] = [];
    for (const { pubkey, account } of receiptAccounts) {
      const parsed = parseReceipt(account.data as Buffer, pubkey);
      if (parsed) parsedReceipts.push(parsed);
    }
    parsedReceipts.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? parsedReceipts.slice(0, limit) : parsedReceipts;
  }

  async getReceiptCount(agent: PublicKey): Promise<number> {
    const receipts = await this.getReceipts(agent);
    return receipts.length;
  }

  // Aggregated reads (convenience)
  async getAgentStatus(agentPubkey: PublicKey): Promise<{
    agent: AgentAccount;
    capabilities: Capability[];
    frozen: boolean;
    totalSpent: bigint;
    recentReceipts: Receipt[];
  }> {
    const agent = await this.getAgentByPubkey(agentPubkey);
    if (!agent) throw new Error(`Agent not found: ${agentPubkey.toBase58()}`);

    const capabilities = await this.getCapabilitiesForAgent(agent.ownerPrincipal, agentPubkey);
    const frozen = await this._isFrozen(agent.ownerPrincipal, agentPubkey);
    const recentReceipts = await this.getReceipts(agentPubkey, 10);
    const totalSpent = recentReceipts.reduce((sum, r) => sum + r.amount, BigInt(0));

    return {
      agent,
      capabilities,
      frozen,
      totalSpent,
      recentReceipts,
    };
  }

  // Internal helper
  private async _isFrozen(principal: PublicKey, agent: PublicKey): Promise<boolean> {
    const [freezePda] = deriveFreezePda(principal, agent);
    const accountInfo = await this.connection.getAccountInfo(freezePda);
    return accountInfo !== null;
  }
}
