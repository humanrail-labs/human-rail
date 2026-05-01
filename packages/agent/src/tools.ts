import type { ToolDefinition } from "./providers/types.js";

export const HUMANRAIL_TOOLS: ToolDefinition[] = [
  {
    name: "check_capability",
    description:
      "Check if the agent has authorization to perform an action. Call this BEFORE attempting any payment, data action, or document signing.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["Payment", "DataAction", "DocumentSign"],
          description: "The type of action to check authorization for",
        },
        amount_sol: {
          type: "number",
          description: "Amount in SOL (required for Payment actions)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "execute_payment",
    description:
      "Send a SOL payment to a recipient. The agent must have a Payment capability with sufficient limits. This creates an on-chain receipt.",
    parameters: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description: "Solana public key (base58) of the payment recipient",
        },
        amount_sol: {
          type: "number",
          description: "Amount to send in SOL",
        },
        memo: {
          type: "string",
          description: "Human-readable description of what this payment is for",
        },
      },
      required: ["recipient", "amount_sol"],
    },
  },
  {
    name: "store_data",
    description:
      "Store structured data on-chain via DataBlink. Use for recording research results, analysis outputs, logs, or any structured information.",
    parameters: {
      type: "object",
      properties: {
        task_type: {
          type: "string",
          description:
            'Category of data being stored (e.g., "research", "analysis", "log", "report")',
        },
        data: {
          type: "string",
          description: "The data payload as a JSON string",
        },
      },
      required: ["task_type", "data"],
    },
  },
  {
    name: "sign_document",
    description:
      "Attest/sign a document hash on-chain. Use for document verification, compliance sign-off, or multi-party attestation.",
    parameters: {
      type: "object",
      properties: {
        document_hash: {
          type: "string",
          description: "SHA-256 hash of the document (hex string, 64 chars)",
        },
        metadata: {
          type: "string",
          description: "Optional description or metadata about the document",
        },
      },
      required: ["document_hash"],
    },
  },
  {
    name: "get_agent_status",
    description:
      "Get the current status of this agent — active/suspended, capabilities, spending limits, remaining budgets, and recent activity.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_recent_receipts",
    description: "Get recent on-chain receipts (audit trail) for this agent.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of receipts to fetch (default 10, max 50)",
        },
      },
      required: [],
    },
  },
  {
    name: "request_cross_chain_signature",
    description:
      "Request a policy-governed cross-chain signature using HumanRail Guard and Ika dWallets. " +
      "Use preview mode by default to evaluate policy compatibility. " +
      "Devnet execution is restricted to the known demo policy (Base Sepolia USDC). " +
      "Never attempt arbitrary chain/recipient signing.",
    parameters: {
      type: "object",
      properties: {
        destination_chain_id: {
          type: "number",
          description: "Target chain ID (e.g., 84532 for Base Sepolia)",
        },
        asset: {
          type: "string",
          description: 'Asset identifier (e.g., "USDC:BASE_SEPOLIA")',
        },
        recipient: {
          type: "string",
          description: "Recipient address (e.g., Ethereum address)",
        },
        amount: {
          type: "string",
          description: "Amount as integer string (e.g., '42000000' for 42 USDC with 6 decimals)",
        },
        message: {
          type: "string",
          description: "Human-readable message describing the signing request",
        },
        mode: {
          type: "string",
          enum: ["preview", "devnet_existing_artifact", "devnet_execute_new_request"],
          description:
            "preview = policy check only; " +
            "devnet_existing_artifact = read current signed lifecycle state (server-side only); " +
            "devnet_execute_new_request = submit approval + sign via Ika gRPC (server-side only, requires HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING=true)",
        },
      },
      required: ["destination_chain_id", "asset", "recipient", "amount", "message", "mode"],
    },
  },
];
