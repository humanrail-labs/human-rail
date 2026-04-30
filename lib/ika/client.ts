/**
 * Ika gRPC Client — Stub for HumanRail dWallet integration
 *
 * TODO: add Ika client/gRPC integration
 *   - Initialize gRPC connection to https://pre-alpha-dev-1.ika.ika-network.net:443
 *   - Implement DWalletContext from ika-dwallet-* crate bindings (or TS equivalent)
 *   - Implement SubmitTransaction with DWalletRequest::Sign
 *   - Poll for CommitSignature result
 *   - Handle MessageApproval PDA lifecycle (Pending -> Signed)
 *
 * Pre-alpha disclaimer: Ika devnet uses a single mock signer.
 * All data is subject to periodic wipes. Not production custody.
 */

export const IKA_DEVNET_PROGRAM_ID = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
export const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net:443";
export const IKA_CPI_AUTHORITY_SEED = "__ika_cpi_authority";

export interface IkaSignRequest {
  dwalletId: string;
  messageDigest: Uint8Array; // keccak256
  signatureScheme: number;
  approvalProof: Uint8Array;
}

export interface IkaSignResult {
  signature: Uint8Array;
  status: "pending" | "signed" | "failed";
}

// TODO: implement actual gRPC client
export class IkaClient {
  // constructor() { /* init gRPC channel */ }
  // async submitSignRequest(req: IkaSignRequest): Promise<string> { /* tx digest */ }
  // async pollForSignature(txDigest: string, timeoutMs?: number): Promise<IkaSignResult> { }
}
