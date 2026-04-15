"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecutor = void 0;
const web3_js_1 = require("@solana/web3.js");
class ToolExecutor {
    constructor(agent) {
        this.agent = agent;
    }
    async execute(toolCall) {
        switch (toolCall.name) {
            case "check_capability": {
                const { action, amount_sol } = toolCall.arguments;
                const result = await this.agent.checkCapability({
                    action: action,
                    amount: amount_sol ? BigInt(Math.round(amount_sol * 1e9)) : undefined,
                });
                return JSON.stringify(result);
            }
            case "execute_payment": {
                const { recipient, amount_sol, memo } = toolCall.arguments;
                const result = await this.agent.executePayment({
                    to: new web3_js_1.PublicKey(recipient),
                    amount: BigInt(Math.round(amount_sol * 1e9)),
                    memo: memo || "Payment",
                });
                return JSON.stringify({
                    success: result.success,
                    signatures: result.signatures,
                    error: result.error,
                });
            }
            case "store_data": {
                const { task_type, data } = toolCall.arguments;
                const result = await this.agent.executeDataAction({
                    taskType: task_type,
                    data: data,
                });
                return JSON.stringify({
                    success: result.success,
                    signatures: result.signatures,
                    error: result.error,
                });
            }
            case "sign_document": {
                const { document_hash, metadata } = toolCall.arguments;
                const hashBuffer = Buffer.from(document_hash, "hex");
                const result = await this.agent.signDocument({
                    documentHash: hashBuffer,
                    metadata: metadata,
                });
                return JSON.stringify({
                    success: result.success,
                    signatures: result.signatures,
                    error: result.error,
                });
            }
            case "get_agent_status": {
                const status = await this.agent.getStatus();
                return JSON.stringify({
                    status: status.agent.status,
                    frozen: status.frozen,
                    capabilities: status.capabilities.map((c) => ({
                        scope: c.allowedPrograms.toString(), // simplified
                        perTxLimit: Number(c.perTxLimit) / 1e9,
                        dailyLimit: Number(c.dailyLimit) / 1e9,
                        totalLimit: Number(c.totalLimit) / 1e9,
                        amountUsed: Number(c.totalSpent) / 1e9,
                        dailyUsed: Number(c.dailySpent) / 1e9,
                        frozen: c.isFrozen,
                        expired: c.expiresAt ? Number(c.expiresAt) < Date.now() / 1000 : false,
                    })),
                    totalSpent: Number(status.totalSpent) / 1e9,
                });
            }
            case "get_recent_receipts": {
                const limit = toolCall.arguments.limit || 10;
                const status = await this.agent.getStatus();
                return JSON.stringify(status.recentReceipts.slice(0, limit).map((r) => ({
                    action: r.actionType,
                    amount: Number(r.amount) / 1e9,
                    timestamp: Number(r.timestamp),
                    txSignature: r.pda.toBase58(), // Using PDA as proxy for tx sig in read layer
                })));
            }
            default:
                return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
        }
    }
}
exports.ToolExecutor = ToolExecutor;
//# sourceMappingURL=executor.js.map