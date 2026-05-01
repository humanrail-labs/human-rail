import { Keypair, PublicKey } from "@solana/web3.js";
import { HumanRailAgent } from "@humanrail/sdk";
import type { LLMProvider, ChatMessage } from "./providers/types.js";
import { ToolExecutor } from "./executor.js";
import { HUMANRAIL_TOOLS } from "./tools.js";

export type AgentEvent =
  | { type: "message_received"; content: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: string }
  | { type: "response"; content: string };

export class AgentRuntime {
  private provider: LLMProvider;
  private executor: ToolExecutor;
  public readonly agent: HumanRailAgent;
  private systemPrompt: string;
  private conversationHistory: ChatMessage[];
  private onEvent?: (event: AgentEvent) => void;

  constructor(config: {
    llmProvider: LLMProvider;
    agentKeypair: Keypair;
    principalPubkey: PublicKey;
    rpcUrl?: string;
    systemPrompt?: string;
    onEvent?: (event: AgentEvent) => void;
  }) {
    this.agent = new HumanRailAgent({
      agentKeypair: config.agentKeypair,
      principalPubkey: config.principalPubkey,
      rpcUrl: config.rpcUrl,
    });
    this.executor = new ToolExecutor(this.agent);
    this.provider = config.llmProvider;
    this.conversationHistory = [];
    this.onEvent = config.onEvent;
    this.systemPrompt = this.buildSystemPrompt(config.systemPrompt);
  }

  private buildSystemPrompt(customInstructions?: string): string {
    return `You are an AI agent operating on the Solana blockchain through the HumanRail protocol.

## Your Identity
You are a registered on-chain agent with a verified human principal who controls your capabilities.
Your actions are bounded by capabilities (spending limits, scopes, and expiry) set by your principal.
Every action you take creates an immutable on-chain receipt.

## Rules
1. ALWAYS call check_capability BEFORE attempting any payment, data action, or document signing.
2. If a capability check returns unauthorized, explain why to the user and do NOT attempt the action.
3. Never attempt to exceed your spending limits. Check get_agent_status to see remaining budgets.
4. If you are frozen, inform the user that your principal has frozen your capabilities and you cannot take any actions.
5. Always include a clear memo/description for payments so the audit trail is meaningful.
6. Report transaction signatures after successful actions so the user can verify on-chain.

## Available Actions
- execute_payment: Send SOL payments (requires Payment capability)
- store_data: Store structured data on-chain via DataBlink (requires DataAction capability)
- sign_document: Attest/sign document hashes on-chain (requires DocumentSign capability)
- request_cross_chain_signature: Request a policy-governed cross-chain signature via HumanRail Guard + Ika dWallet. ALWAYS use preview mode first. Devnet execution is restricted to the demo policy (Base Sepolia USDC). Ika is pre-alpha/mock signer — not production custody.
- check_capability: Check if you're authorized for an action
- get_agent_status: View your current status, limits, and remaining budgets
- get_recent_receipts: View your recent on-chain activity

## Cross-Chain Signing Rules
1. For cross-chain signing requests, ALWAYS call request_cross_chain_signature with mode="preview" first.
2. Only use mode="devnet_execute_new_request" if the user explicitly asks to execute on devnet AND the preview passed.
3. Never claim production MPC custody. Explain that Ika is pre-alpha with a single mock signer.
4. Never bypass HumanRail policy. If preview shows rejection, do NOT attempt execution.
5. The demo policy only allows: chain=84532 (Base Sepolia), asset=USDC:BASE_SEPOLIA, recipient=0x1111..., amount <= 100,000,000.

${customInstructions ? `\n## Custom Instructions from Principal\n${customInstructions}` : ""}`;
  }

  async processMessage(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: "user", content: userMessage });
    this.emit({ type: "message_received", content: userMessage });

    const frozen = await this.agent.isFrozen();
    if (frozen) {
      const response =
        "I am currently frozen by my principal. All my capabilities are suspended and I cannot take any actions. Please contact my principal to unfreeze me.";
      this.conversationHistory.push({ role: "assistant", content: response });
      this.emit({ type: "response", content: response });
      return response;
    }

    let maxIterations = 10;
    while (maxIterations > 0) {
      maxIterations--;

      const llmResponse = await this.provider.chat({
        systemPrompt: this.systemPrompt,
        messages: this.conversationHistory,
        tools: HUMANRAIL_TOOLS,
      });

      if (llmResponse.toolCalls.length > 0) {
        this.conversationHistory.push({
          role: "assistant",
          content: llmResponse.content || "",
        });

        for (const toolCall of llmResponse.toolCalls) {
          this.emit({ type: "tool_call", tool: toolCall.name, args: toolCall.arguments });
          const result = await this.executor.execute(toolCall);
          this.emit({ type: "tool_result", tool: toolCall.name, result });
          this.conversationHistory.push({
            role: "tool",
            content: result,
            toolCallId: toolCall.id,
          });
        }
        continue;
      }

      const finalResponse = llmResponse.content || "I have completed the requested actions.";
      this.conversationHistory.push({ role: "assistant", content: finalResponse });
      this.emit({ type: "response", content: finalResponse });
      return finalResponse;
    }

    const fallback =
      "I reached the maximum number of tool-calling iterations. Please try a simpler request.";
    this.emit({ type: "response", content: fallback });
    return fallback;
  }

  resetConversation(): void {
    this.conversationHistory = [];
  }

  private emit(event: AgentEvent): void {
    this.onEvent?.(event);
  }
}
