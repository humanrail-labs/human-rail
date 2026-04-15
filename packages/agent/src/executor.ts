import { PublicKey } from "@solana/web3.js";
import { HumanRailAgent } from "@humanrail/sdk";
import type { ToolCall } from "./providers/types.js";
import type { CapabilityScope } from "@humanrail/sdk";

export class ToolExecutor {
  constructor(private agent: HumanRailAgent) {}

  async execute(toolCall: ToolCall): Promise<string> {
    switch (toolCall.name) {
      case "check_capability": {
        const { action, amount_sol } = toolCall.arguments;
        const result = await this.agent.checkCapability({
          action: action as CapabilityScope,
          amount: amount_sol ? BigInt(Math.round((amount_sol as number) * 1e9)) : undefined,
        });
        return JSON.stringify(result);
      }

      case "execute_payment": {
        const { recipient, amount_sol, memo } = toolCall.arguments;
        const result = await this.agent.executePayment({
          to: new PublicKey(recipient as string),
          amount: BigInt(Math.round((amount_sol as number) * 1e9)),
          memo: (memo as string) || "Payment",
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
          taskType: task_type as string,
          data: data as string,
        });
        return JSON.stringify({
          success: result.success,
          signatures: result.signatures,
          error: result.error,
        });
      }

      case "sign_document": {
        const { document_hash, metadata } = toolCall.arguments;
        const hashBuffer = Buffer.from(document_hash as string, "hex");
        const result = await this.agent.signDocument({
          documentHash: hashBuffer,
          metadata: metadata as string,
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
        const limit = (toolCall.arguments.limit as number) || 10;
        const status = await this.agent.getStatus();
        return JSON.stringify(
          status.recentReceipts.slice(0, limit).map((r) => ({
            action: r.actionType,
            amount: Number(r.amount) / 1e9,
            timestamp: Number(r.timestamp),
            txSignature: r.pda.toBase58(), // Using PDA as proxy for tx sig in read layer
          }))
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
    }
  }
}
