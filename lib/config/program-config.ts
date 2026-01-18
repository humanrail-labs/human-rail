import { Cluster } from "@/lib/solana/providers";

export interface ProgramIds {
  humanRegistry: string;
  agentRegistry: string;
  delegation: string;
  humanPay: string;
  dataBlink: string;
  documentRegistry: string;
  receipts: string;
}

// Default program IDs - will be replaced with actual deployed addresses
const PROGRAM_IDS: Record<Cluster, ProgramIds> = {
  "mainnet-beta": {
    humanRegistry: "",
    agentRegistry: "",
    delegation: "",
    humanPay: "",
    dataBlink: "",
    documentRegistry: "",
    receipts: "",
  },
  devnet: {
    humanRegistry: process.env.NEXT_PUBLIC_HUMAN_REGISTRY_PROGRAM_ID || "",
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_PROGRAM_ID || "",
    delegation: process.env.NEXT_PUBLIC_DELEGATION_PROGRAM_ID || "",
    humanPay: process.env.NEXT_PUBLIC_HUMAN_PAY_PROGRAM_ID || "",
    dataBlink: process.env.NEXT_PUBLIC_DATA_BLINK_PROGRAM_ID || "",
    documentRegistry: process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_PROGRAM_ID || "",
    receipts: process.env.NEXT_PUBLIC_RECEIPTS_PROGRAM_ID || "",
  },
  localnet: {
    humanRegistry: process.env.NEXT_PUBLIC_HUMAN_REGISTRY_PROGRAM_ID || "",
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_PROGRAM_ID || "",
    delegation: process.env.NEXT_PUBLIC_DELEGATION_PROGRAM_ID || "",
    humanPay: process.env.NEXT_PUBLIC_HUMAN_PAY_PROGRAM_ID || "",
    dataBlink: process.env.NEXT_PUBLIC_DATA_BLINK_PROGRAM_ID || "",
    documentRegistry: process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_PROGRAM_ID || "",
    receipts: process.env.NEXT_PUBLIC_RECEIPTS_PROGRAM_ID || "",
  },
};

export function getProgramIds(cluster: Cluster): ProgramIds {
  return PROGRAM_IDS[cluster];
}

export function isProgramConfigured(programIds: ProgramIds): boolean {
  return Object.values(programIds).every((id) => id.length > 0);
}