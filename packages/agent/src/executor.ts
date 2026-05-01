import { PublicKey } from "@solana/web3.js";
import { HumanRailAgent } from "@humanrail/sdk";
import type { ToolCall } from "./providers/types.js";
import type { CapabilityScope } from "@humanrail/sdk";
import { evaluateDemoPolicy } from "./crossChainPolicy.js";
import { readSanitizedArtifacts } from "./ikaArtifactReader.js";

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

      case "request_cross_chain_signature": {
        const {
          destination_chain_id,
          asset,
          recipient,
          amount,
          message,
          mode,
        } = toolCall.arguments as {
          destination_chain_id: number;
          asset: string;
          recipient: string;
          amount: string;
          message: string;
          mode: string;
        };

        // Always evaluate policy first
        const policyResult = evaluateDemoPolicy({
          destinationChainId: destination_chain_id,
          asset,
          recipient,
          amount,
          message,
        });

        if (mode === "preview") {
          return JSON.stringify({
            mode: "preview",
            policyAllowed: policyResult.allowed,
            policyReason: policyResult.reason,
            destinationChainId: policyResult.destinationChainId,
            amount: policyResult.amount.toString(),
            messageDigest: policyResult.messageDigest,
            assetHash: policyResult.policyHashAsset,
            recipientHash: policyResult.policyHashRecipient,
            nextStep: policyResult.allowed
              ? "Policy matches demo constraints. Use mode='devnet_existing_artifact' to inspect current lifecycle state."
              : "Request does not match demo policy. Adjust parameters or use a different policy.",
          });
        }

        if (mode === "devnet_existing_artifact") {
          const artifacts = await readSanitizedArtifacts();
          return JSON.stringify({
            mode: "devnet_existing_artifact",
            policyAllowed: policyResult.allowed,
            policyReason: policyResult.reason,
            artifacts,
            messageDigest: policyResult.messageDigest,
            hint: artifacts.exists
              ? "Artifacts loaded. If status is Signed, the lifecycle is complete."
              : "No artifacts found. Run the devnet scripts first.",
          });
        }

        if (mode === "devnet_execute_new_request") {
          // Safety gate 1: must pass policy
          if (!policyResult.allowed) {
            return JSON.stringify({
              mode: "devnet_execute_new_request",
              error: "POLICY_REJECTION",
              reason: policyResult.reason,
              safetyNote:
                "Devnet execution is blocked because the request does not match the demo policy. " +
                "Arbitrary chain/recipient signing is not allowed during the grant demo.",
            });
          }

          // Safety gate 2: env var required
          const allowDevnet =
            typeof process !== "undefined" &&
            process.env?.HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING === "true";

          if (!allowDevnet) {
            return JSON.stringify({
              mode: "devnet_execute_new_request",
              error: "SAFETY_GATE_DISABLED",
              reason:
                "HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING is not set to 'true'. " +
                "Devnet signing execution is disabled by default for safety.",
              howToEnable:
                "Set environment variable HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING=true before starting the agent.",
              alternative:
                "Use mode='preview' to validate policy, or mode='devnet_existing_artifact' to inspect current state.",
            });
          }

          // Safety gate 3: Node.js only
          const isNode =
            typeof process !== "undefined" && process.versions?.node != null;
          if (!isNode) {
            return JSON.stringify({
              mode: "devnet_execute_new_request",
              error: "SERVER_ONLY",
              reason:
                "Devnet execution requires a Node.js environment. " +
                "It cannot run in the browser.",
            });
          }

          // Execute via spawned npm scripts (fixed commands, no user input interpolation)
          try {
            const { spawn } = await import("child_process");

            const runScript = (script: string): Promise<{ code: number | null; stdout: string; stderr: string }> => {
              return new Promise((resolve) => {
                const proc = spawn("npm", ["run", script], {
                  cwd: process.cwd(),
                  timeout: 300_000, // 5 minutes
                });
                let stdout = "";
                let stderr = "";
                proc.stdout?.on("data", (data: Buffer) => { stdout += data.toString(); });
                proc.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });
                proc.on("close", (code) => {
                  resolve({ code, stdout, stderr });
                });
                proc.on("error", (err) => {
                  resolve({ code: null, stdout, stderr: stderr + String(err) });
                });
              });
            };

            const approveResult = await runScript("ika:approve-message");
            if (approveResult.code !== 0) {
              return JSON.stringify({
                mode: "devnet_execute_new_request",
                error: "APPROVE_FAILED",
                exitCode: approveResult.code,
                stderr: approveResult.stderr.slice(0, 2000),
                stdout: approveResult.stdout.slice(0, 2000),
              });
            }

            const signResult = await runScript("ika:sign-approved-message");
            if (signResult.code !== 0) {
              return JSON.stringify({
                mode: "devnet_execute_new_request",
                error: "SIGN_FAILED",
                exitCode: signResult.code,
                stderr: signResult.stderr.slice(0, 2000),
                stdout: signResult.stdout.slice(0, 2000),
              });
            }

            const artifacts = await readSanitizedArtifacts();
            return JSON.stringify({
              mode: "devnet_execute_new_request",
              success: true,
              policyAllowed: policyResult.allowed,
              messageDigest: policyResult.messageDigest,
              artifacts,
              approveExitCode: approveResult.code,
              signExitCode: signResult.code,
              notes: "Ika pre-alpha mock signer. Signature committed on-chain.",
            });
          } catch (spawnErr) {
            return JSON.stringify({
              mode: "devnet_execute_new_request",
              error: "SPAWN_ERROR",
              reason: spawnErr instanceof Error ? spawnErr.message : String(spawnErr),
            });
          }
        }

        return JSON.stringify({
          error: "INVALID_MODE",
          reason: `Unknown mode: ${mode}. Valid modes: preview, devnet_existing_artifact, devnet_execute_new_request.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
    }
  }
}
