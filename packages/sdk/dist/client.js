"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanRailClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_js_1 = require("./constants.js");
const parsers_js_1 = require("./parsers.js");
class HumanRailClient {
    constructor(config) {
        const rpcUrl = config?.rpcUrl ?? "https://api.devnet.solana.com";
        const commitment = config?.commitment ?? "confirmed";
        this.connection = new web3_js_1.Connection(rpcUrl, commitment);
    }
    // Human Registry reads
    async getHumanProfile(wallet) {
        const [pda] = (0, constants_js_1.deriveHumanProfilePda)(wallet);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo)
            return null;
        return (0, parsers_js_1.parseHumanProfile)(accountInfo.data);
    }
    async humanProfileExists(wallet) {
        const [pda] = (0, constants_js_1.deriveHumanProfilePda)(wallet);
        const accountInfo = await this.connection.getAccountInfo(pda);
        return accountInfo !== null;
    }
    // Agent Registry reads
    async getAgent(principal, nonce) {
        const [pda] = (0, constants_js_1.deriveAgentPda)(principal, nonce);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo)
            return null;
        return (0, parsers_js_1.parseAgentProfile)(accountInfo.data, pda);
    }
    async getAgentByPubkey(agentPubkey) {
        const accountInfo = await this.connection.getAccountInfo(agentPubkey);
        if (!accountInfo)
            return null;
        return (0, parsers_js_1.parseAgentProfile)(accountInfo.data, agentPubkey);
    }
    async getAgentsByPrincipal(principal) {
        const programId = constants_js_1.PROGRAM_IDS.agentRegistry;
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
        const parsedAgents = [];
        for (const { pubkey, account } of accounts) {
            const parsed = (0, parsers_js_1.parseAgentProfile)(account.data, pubkey);
            if (parsed)
                parsedAgents.push(parsed);
        }
        parsedAgents.sort((a, b) => b.createdAt - a.createdAt);
        return parsedAgents;
    }
    // Delegation reads
    async getCapability(principal, agent, nonce) {
        const [pda] = (0, constants_js_1.deriveCapabilityPda)(principal, agent, nonce);
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo)
            return null;
        const parsed = (0, parsers_js_1.parseCapability)(accountInfo.data, pda);
        if (!parsed)
            return null;
        parsed.isFrozen = await this._isFrozen(principal, agent);
        return parsed;
    }
    async getCapabilitiesForAgent(principal, agent) {
        const programId = constants_js_1.PROGRAM_IDS.delegation;
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
        const parsedCapabilities = [];
        const isFrozen = await this._isFrozen(principal, agent);
        for (const { pubkey, account } of accounts) {
            const parsed = (0, parsers_js_1.parseCapability)(account.data, pubkey);
            if (parsed) {
                parsed.isFrozen = isFrozen;
                parsedCapabilities.push(parsed);
            }
        }
        parsedCapabilities.sort((a, b) => b.issuedAt - a.issuedAt);
        return parsedCapabilities;
    }
    async getFreezeStatus(principal, agent) {
        const [freezePda] = (0, constants_js_1.deriveFreezePda)(principal, agent);
        const accountInfo = await this.connection.getAccountInfo(freezePda);
        if (!accountInfo)
            return null;
        return (0, parsers_js_1.parseFreezeAccount)(accountInfo.data);
    }
    // Receipt reads
    async getReceipts(agent, limit) {
        const programId = constants_js_1.PROGRAM_IDS.receipts;
        const receiptAccounts = await this.connection.getProgramAccounts(programId, {
            filters: [{ memcmp: { offset: 40, bytes: agent.toBase58() } }],
        });
        const parsedReceipts = [];
        for (const { pubkey, account } of receiptAccounts) {
            const parsed = (0, parsers_js_1.parseReceipt)(account.data, pubkey);
            if (parsed)
                parsedReceipts.push(parsed);
        }
        parsedReceipts.sort((a, b) => b.timestamp - a.timestamp);
        return limit ? parsedReceipts.slice(0, limit) : parsedReceipts;
    }
    async getReceiptCount(agent) {
        const receipts = await this.getReceipts(agent);
        return receipts.length;
    }
    // Aggregated reads (convenience)
    async getAgentStatus(agentPubkey) {
        const agent = await this.getAgentByPubkey(agentPubkey);
        if (!agent)
            throw new Error(`Agent not found: ${agentPubkey.toBase58()}`);
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
    async _isFrozen(principal, agent) {
        const [freezePda] = (0, constants_js_1.deriveFreezePda)(principal, agent);
        const accountInfo = await this.connection.getAccountInfo(freezePda);
        return accountInfo !== null;
    }
}
exports.HumanRailClient = HumanRailClient;
//# sourceMappingURL=client.js.map