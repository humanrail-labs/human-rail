import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { CapabilityScope } from "./types.js";
export declare function buildRegisterHumanIx(params: {
    wallet: PublicKey;
    displayName: string;
}): TransactionInstruction;
export declare function buildRegisterAgentIx(params: {
    principal: PublicKey;
    agentPubkey: PublicKey;
    name: string;
    agentType: string;
    nonce: bigint;
}): TransactionInstruction;
export declare function buildSuspendAgentIx(params: {
    principal: PublicKey;
    agentPda: PublicKey;
}): TransactionInstruction;
export declare function buildReactivateAgentIx(params: {
    principal: PublicKey;
    agentPda: PublicKey;
}): TransactionInstruction;
export declare function buildRevokeAgentIx(params: {
    principal: PublicKey;
    agentPda: PublicKey;
}): TransactionInstruction;
export declare function buildIssueCapabilityIx(params: {
    principal: PublicKey;
    agent: PublicKey;
    scope: CapabilityScope;
    perTxLimit: bigint;
    dailyLimit: bigint;
    totalLimit: bigint;
    expiresAt: bigint | null;
    allowedPrograms: PublicKey[];
    nonce: bigint;
}): TransactionInstruction;
export declare function buildFreezeAgentIx(params: {
    principal: PublicKey;
    agent: PublicKey;
    capabilityPda: PublicKey;
}): TransactionInstruction;
export declare function buildUnfreezeAgentIx(params: {
    principal: PublicKey;
    agent: PublicKey;
}): TransactionInstruction;
export declare function buildRevokeCapabilityIx(params: {
    principal: PublicKey;
    capabilityPda: PublicKey;
}): TransactionInstruction;
export declare function buildCreateReceiptIx(params: {
    agent: PublicKey;
    principal: PublicKey;
    capability: PublicKey;
    actionType: number;
    amount: bigint;
    destination: PublicKey;
    memo: string;
    nonce: bigint;
}): TransactionInstruction;
export declare function buildRegisterDocumentIx(params: {
    creator: PublicKey;
    docHash: Uint8Array;
    schema: string;
    uri?: string | null;
}): TransactionInstruction;
export declare function buildSignDocumentIx(params: {
    signer: PublicKey;
    documentPda: PublicKey;
    role: string;
}): TransactionInstruction;
export declare function buildDirectPaymentIx(params: {
    from: PublicKey;
    to: PublicKey;
    amount: bigint;
}): TransactionInstruction;
//# sourceMappingURL=instructions.d.ts.map