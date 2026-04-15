export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  identity: {
    type: string;
    description: string;
  };
  capabilities: Array<{
    name: string;
    scope: string;
    perTxLimit: string;
    dailyLimit: string;
    totalLimit: string;
    expiryDate: string;
    noExpiry: boolean;
    allowedPrograms: string;
  }>;
  systemPrompt: string;
}

function formatDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

const defaultExpiry = formatDateInput(new Date(Date.now() + 30 * 86400000));

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "payment-agent",
    name: "Payment Agent",
    description: "Autonomous payment agent for invoices, payroll, and scheduled transfers.",
    icon: "Wallet",
    category: "Finance",
    identity: {
      type: "payment",
      description: "Handles outgoing payments, payroll, and vendor invoices within authorized budgets.",
    },
    capabilities: [
      {
        name: "Payment Budget",
        scope: "payment",
        perTxLimit: "0.5",
        dailyLimit: "2",
        totalLimit: "20",
        expiryDate: defaultExpiry,
        noExpiry: false,
        allowedPrograms: "",
      },
    ],
    systemPrompt:
      "You are a payment agent. You can check payment capabilities and execute transfers. Always verify the recipient address and amount before confirming a payment.",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Gathers on-chain data, stores research notes, and produces reports.",
    icon: "Zap",
    category: "Data",
    identity: {
      type: "data_processor",
      description: "Collects on-chain metrics, stores research data, and generates formatted reports.",
    },
    capabilities: [
      {
        name: "Data Action Budget",
        scope: "data",
        perTxLimit: "0.05",
        dailyLimit: "0.5",
        totalLimit: "5",
        expiryDate: defaultExpiry,
        noExpiry: false,
        allowedPrograms: "",
      },
    ],
    systemPrompt:
      "You are a research agent. You can store data on-chain and query agent status. Do not make payments unless explicitly authorized.",
  },
  {
    id: "compliance-agent",
    name: "Compliance Agent",
    description: "Signs documents, verifies attestations, and maintains audit logs.",
    icon: "FileText",
    category: "Legal",
    identity: {
      type: "custom",
      description: "Manages document signing, compliance attestations, and audit trail maintenance.",
    },
    capabilities: [
      {
        name: "Document Signing Budget",
        scope: "document",
        perTxLimit: "0.05",
        dailyLimit: "0.5",
        totalLimit: "5",
        expiryDate: defaultExpiry,
        noExpiry: false,
        allowedPrograms: "",
      },
    ],
    systemPrompt:
      "You are a compliance agent. You can sign documents and check capabilities. Always confirm the document hash and metadata before signing.",
  },
  {
    id: "general-agent",
    name: "General Purpose Agent",
    description: "All-rounder agent with full access for experimentation and prototyping.",
    icon: "Bot",
    category: "General",
    identity: {
      type: "custom",
      description: "A flexible general-purpose agent capable of payments, data actions, and document signing.",
    },
    capabilities: [
      {
        name: "Full Access Budget",
        scope: "full",
        perTxLimit: "0.1",
        dailyLimit: "1",
        totalLimit: "10",
        expiryDate: defaultExpiry,
        noExpiry: false,
        allowedPrograms: "",
      },
    ],
    systemPrompt:
      "You are a general-purpose agent. You can check capabilities, execute payments, store data, and sign documents. Always verify authorization before taking action.",
  },
];
