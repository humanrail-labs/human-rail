import { PublicKey } from "@solana/web3.js";
export declare const PROGRAM_IDS: {
    humanRegistry: PublicKey;
    agentRegistry: PublicKey;
    delegation: PublicKey;
    humanPay: PublicKey;
    dataBlink: PublicKey;
    documentRegistry: PublicKey;
    receipts: PublicKey;
};
export type ProgramName = keyof typeof PROGRAM_IDS;
export declare function getProgramId(program: ProgramName): PublicKey;
export declare const DISCRIMINATORS: {
    initProfile: Buffer<ArrayBuffer>;
    registerAttestation: Buffer<ArrayBuffer>;
    issueAttestation: Buffer<ArrayBuffer>;
    registerAgent: Buffer<ArrayBuffer>;
    suspendAgent: Buffer<ArrayBuffer>;
    reactivateAgent: Buffer<ArrayBuffer>;
    revokeAgent: Buffer<ArrayBuffer>;
    rotateAgentKey: Buffer<ArrayBuffer>;
    issueCapability: Buffer<ArrayBuffer>;
    revokeCapability: Buffer<ArrayBuffer>;
    emergencyFreeze: Buffer<ArrayBuffer>;
    unfreeze: Buffer<ArrayBuffer>;
    createReceipt: Buffer<ArrayBuffer>;
    registerDocument: Buffer<ArrayBuffer>;
    signDocumentVerified: Buffer<ArrayBuffer>;
    signDocumentTx: Buffer<ArrayBuffer>;
};
export declare function deriveHumanProfilePda(wallet: PublicKey): [PublicKey, number];
export declare function deriveAgentPda(principal: PublicKey, nonce: bigint | number): [PublicKey, number];
export declare function deriveCapabilityPda(principal: PublicKey, agent: PublicKey, nonce: bigint | number): [PublicKey, number];
export declare function deriveFreezePda(principal: PublicKey, agent: PublicKey): [PublicKey, number];
export declare function deriveDocumentPda(docHash: Buffer): [PublicKey, number];
export declare function deriveReceiptPda(agentId: PublicKey, nonce: bigint | number): [PublicKey, number];
export declare const ACCOUNT_DISCRIMINATORS: {
    HumanProfile: Buffer<ArrayBuffer>;
    AgentProfile: Buffer<ArrayBuffer>;
    Capability: Buffer<ArrayBuffer>;
    EmergencyFreezeRecord: Buffer<ArrayBuffer>;
    ActionReceipt: Buffer<ArrayBuffer>;
    Document: Buffer<ArrayBuffer>;
    SignatureRecord: Buffer<ArrayBuffer>;
};
export declare const ACTION_RECEIPT_DISCRIMINATOR: Buffer<ArrayBuffer>;
//# sourceMappingURL=constants.d.ts.map