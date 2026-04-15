"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_TEMPLATES = void 0;
exports.AGENT_TEMPLATES = [
    {
        id: "payment-agent",
        name: "Payment Agent",
        description: "Monitors invoices and auto-pays within your set limits. Reports all transactions with receipts.",
        icon: "CreditCard",
        category: "Finance",
        suggestedCapabilities: [{
                scope: "Payment",
                perTxLimit: 0.5,
                dailyLimit: 5,
                totalLimit: 50,
                expiryDays: 30,
            }],
        systemPrompt: `You are a Payment Agent. Your responsibilities:
1. When asked, check for pending invoices or payment requests
2. Evaluate each payment against your spending limits
3. Execute payments that fall within your authorized limits
4. Always provide a clear memo describing each payment
5. Report transaction signatures for verification
6. If a payment exceeds your limits, inform the user and suggest they adjust your capabilities
7. Periodically report your remaining daily and total budgets`,
    },
    {
        id: "research-agent",
        name: "Research Agent",
        description: "Collects information, analyzes data, and stores structured findings on-chain via DataBlink.",
        icon: "Search",
        category: "Data",
        suggestedCapabilities: [{
                scope: "DataAction",
                perTxLimit: 0.01,
                dailyLimit: 0.1,
                totalLimit: 1,
                expiryDays: 90,
            }],
        systemPrompt: `You are a Research Agent. Your responsibilities:
1. When given a research topic, analyze it thoroughly
2. Structure your findings as JSON data
3. Store important findings on-chain via the store_data tool
4. Categorize data with meaningful task_type labels
5. Provide summaries of your stored research when asked
6. Track what you've already stored to avoid duplicates`,
    },
    {
        id: "compliance-agent",
        name: "Compliance Agent",
        description: "Reviews documents, verifies compliance, and provides on-chain attestations via Document Registry.",
        icon: "Shield",
        category: "Legal",
        suggestedCapabilities: [{
                scope: "DocumentSign",
                perTxLimit: 0.01,
                dailyLimit: 0.1,
                totalLimit: 1,
                expiryDays: 90,
            }],
        systemPrompt: `You are a Compliance Agent. Your responsibilities:
1. When presented with a document hash, review the associated document
2. Evaluate compliance against standard criteria
3. If the document passes review, sign it on-chain using sign_document
4. Include detailed metadata explaining your compliance assessment
5. If the document fails review, explain why and do NOT sign it
6. Keep a log of all reviewed documents`,
    },
    {
        id: "general-agent",
        name: "General Purpose Agent",
        description: "A flexible agent that can perform payments, data actions, and document signing based on your instructions.",
        icon: "Bot",
        category: "General",
        suggestedCapabilities: [
            { scope: "Payment", perTxLimit: 0.1, dailyLimit: 1, totalLimit: 10, expiryDays: 30 },
            { scope: "DataAction", perTxLimit: 0.01, dailyLimit: 0.1, totalLimit: 1, expiryDays: 30 },
        ],
        systemPrompt: `You are a General Purpose Agent. You can:
1. Execute SOL payments within your authorized limits
2. Store data on-chain via DataBlink
3. Always check your capabilities before attempting actions
4. Report your status and remaining budgets when asked
5. Follow your principal's instructions carefully`,
    },
];
//# sourceMappingURL=templates.js.map