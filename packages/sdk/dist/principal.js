"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanRailPrincipal = void 0;
const web3_js_1 = require("@solana/web3.js");
const client_js_1 = require("./client.js");
const instructions_js_1 = require("./instructions.js");
class HumanRailPrincipal {
    constructor(config) {
        this.walletPubkey = config.walletPubkey;
        this.client = new client_js_1.HumanRailClient({ rpcUrl: config.rpcUrl });
    }
    async buildRegisterAgentTx(params) {
        const nonce = BigInt(Date.now());
        const ix = (0, instructions_js_1.buildRegisterAgentIx)({
            principal: this.walletPubkey,
            agentPubkey: params.agentPubkey,
            name: params.name,
            agentType: params.agentType,
            nonce,
        });
        return new web3_js_1.Transaction().add(ix);
    }
    async buildIssueCapabilityTx(params) {
        const nonce = BigInt(Date.now());
        const ix = (0, instructions_js_1.buildIssueCapabilityIx)({
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
        return new web3_js_1.Transaction().add(ix);
    }
    async buildSuspendAgentTx(agentPubkey) {
        const ix = (0, instructions_js_1.buildSuspendAgentIx)({ principal: this.walletPubkey, agentPda: agentPubkey });
        return new web3_js_1.Transaction().add(ix);
    }
    async buildReactivateAgentTx(agentPubkey) {
        const ix = (0, instructions_js_1.buildReactivateAgentIx)({ principal: this.walletPubkey, agentPda: agentPubkey });
        return new web3_js_1.Transaction().add(ix);
    }
    async buildRevokeAgentTx(agentPubkey) {
        const ix = (0, instructions_js_1.buildRevokeAgentIx)({ principal: this.walletPubkey, agentPda: agentPubkey });
        return new web3_js_1.Transaction().add(ix);
    }
    async buildFreezeAgentTx(agentPubkey) {
        // Need a capability PDA for the freeze instruction
        const caps = await this.client.getCapabilitiesForAgent(this.walletPubkey, agentPubkey);
        if (caps.length === 0) {
            throw new Error("No capability found for agent; cannot freeze");
        }
        const ix = (0, instructions_js_1.buildFreezeAgentIx)({
            principal: this.walletPubkey,
            agent: agentPubkey,
            capabilityPda: caps[0].pda,
        });
        return new web3_js_1.Transaction().add(ix);
    }
    async buildUnfreezeAgentTx(agentPubkey) {
        const ix = (0, instructions_js_1.buildUnfreezeAgentIx)({ principal: this.walletPubkey, agent: agentPubkey });
        return new web3_js_1.Transaction().add(ix);
    }
    // Reads delegated to client
    async getMyAgents() {
        return this.client.getAgentsByPrincipal(this.walletPubkey);
    }
    async getMyProfile() {
        return this.client.getHumanProfile(this.walletPubkey);
    }
    async getAllCapabilities() {
        // Fetch all agents first, then capabilities for each
        const agents = await this.getMyAgents();
        const allCaps = [];
        for (const agent of agents) {
            const caps = await this.client.getCapabilitiesForAgent(this.walletPubkey, agent.pda);
            allCaps.push(...caps);
        }
        return allCaps;
    }
    async getAllReceipts() {
        const agents = await this.getMyAgents();
        const allReceipts = [];
        for (const agent of agents) {
            const receipts = await this.client.getReceipts(agent.pda);
            allReceipts.push(...receipts);
        }
        allReceipts.sort((a, b) => b.timestamp - a.timestamp);
        return allReceipts;
    }
}
exports.HumanRailPrincipal = HumanRailPrincipal;
//# sourceMappingURL=principal.js.map