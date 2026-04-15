import type { CapabilityScope } from "@humanrail/sdk";
export interface AgentTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    suggestedCapabilities: {
        scope: CapabilityScope;
        perTxLimit: number;
        dailyLimit: number;
        totalLimit: number;
        expiryDays: number;
    }[];
    systemPrompt: string;
}
export declare const AGENT_TEMPLATES: AgentTemplate[];
//# sourceMappingURL=templates.d.ts.map