import { PublicKey } from "@solana/web3.js";
import type { HumanProfile, AgentAccount, Capability, FreezeAccount, Receipt, DocumentRecord, SignatureRecord } from "./types.js";
export declare function parseAgentStatus(statusByte: number): "Active" | "Suspended" | "Revoked";
export declare function parseCapabilityStatus(statusByte: number): "Active" | "Frozen" | "Revoked" | "Disputed";
export declare function parseDocumentStatus(byte: number): "Draft" | "Active" | "Finalized" | "Disputed";
export declare function parseSignerType(byte: number): "Human" | "Agent" | "Organization";
export declare function parseSignatureTier(byte: number): "WalletNotarization" | "VerifiedSigner" | "AgentOnBehalf";
export declare function parseSignatureStatus(byte: number): "Active" | "Revoked";
export declare function parseHumanProfile(data: Buffer): HumanProfile | null;
export declare function parseAgentProfile(data: Buffer, pda: PublicKey): AgentAccount | null;
export declare function parseCapability(data: Buffer, pda: PublicKey): Capability | null;
export declare function parseFreezeAccount(data: Buffer): FreezeAccount | null;
export declare function parseReceipt(data: Buffer, pda: PublicKey): Receipt | null;
export declare function parseDocument(pubkey: PublicKey, data: Buffer): DocumentRecord | null;
export declare function parseSignatureRecord(pubkey: PublicKey, data: Buffer): SignatureRecord | null;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function hexToBytes(hex: string): Uint8Array;
export declare function getActionTypeName(actionType: number): string;
//# sourceMappingURL=parsers.d.ts.map