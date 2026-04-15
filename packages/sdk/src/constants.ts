import { PublicKey } from "@solana/web3.js";

// ============================================================================
// CORRECT DEVNET PROGRAM IDs (verified with `solana program show`)
// ============================================================================
export const PROGRAM_IDS = {
  humanRegistry: new PublicKey("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo"),
  agentRegistry: new PublicKey("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ"),
  delegation: new PublicKey("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT"),
  humanPay: new PublicKey("HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9"),
  dataBlink: new PublicKey("GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX"),
  documentRegistry: new PublicKey("8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28"),
  receipts: new PublicKey("EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM"),
};

export type ProgramName = keyof typeof PROGRAM_IDS;

export function getProgramId(program: ProgramName): PublicKey {
  return PROGRAM_IDS[program];
}

// ============================================================================
// DISCRIMINATORS (from IDLs)
// ============================================================================
export const DISCRIMINATORS = {
  // human_registry
  initProfile: Buffer.from([210, 162, 212, 95, 95, 186, 89, 119]),
  registerAttestation: Buffer.from([16, 160, 132, 114, 195, 169, 210, 204]),
  issueAttestation: Buffer.from([18, 115, 85, 100, 231, 31, 242, 143]),

  // agent_registry
  registerAgent: Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]),
  suspendAgent: Buffer.from([242, 28, 54, 59, 247, 20, 59, 110]),
  reactivateAgent: Buffer.from([231, 7, 179, 97, 210, 24, 209, 12]),
  revokeAgent: Buffer.from([227, 60, 209, 125, 240, 117, 163, 73]),
  rotateAgentKey: Buffer.from([85, 31, 17, 212, 162, 53, 153, 115]),

  // delegation
  issueCapability: Buffer.from([191, 205, 139, 120, 12, 205, 58, 77]),
  revokeCapability: Buffer.from([26, 112, 110, 143, 126, 19, 23, 73]),
  emergencyFreeze: Buffer.from([179, 69, 168, 100, 173, 7, 136, 112]),
  unfreeze: Buffer.from([133, 160, 68, 253, 80, 232, 218, 247]),

  // receipts
  createReceipt: Buffer.from([52, 35, 16, 111, 195, 40, 16, 69]),

  // document_registry
  registerDocument: Buffer.from([108, 34, 153, 39, 82, 41, 133, 73]),
  signDocumentVerified: Buffer.from([206, 24, 10, 213, 161, 57, 46, 23]),
  signDocumentTx: Buffer.from([215, 18, 24, 33, 147, 69, 109, 113]),
};

// ============================================================================
// PDA DERIVATION HELPERS
// ============================================================================
export function deriveHumanProfilePda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("human_profile"), wallet.toBuffer()],
    PROGRAM_IDS.humanRegistry
  );
}

export function deriveAgentPda(
  principal: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, BigInt(nonce), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), principal.toBuffer(), nonceBuffer],
    PROGRAM_IDS.agentRegistry
  );
}

export function deriveCapabilityPda(
  principal: PublicKey,
  agent: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, BigInt(nonce), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("capability"), principal.toBuffer(), agent.toBuffer(), nonceBuffer],
    PROGRAM_IDS.delegation
  );
}

export function deriveFreezePda(
  principal: PublicKey,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("freeze"), principal.toBuffer(), agent.toBuffer()],
    PROGRAM_IDS.delegation
  );
}

export function deriveDocumentPda(docHash: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("document"), docHash],
    PROGRAM_IDS.documentRegistry
  );
}

export function deriveReceiptPda(
  agentId: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, BigInt(nonce), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentId.toBuffer(), nonceBuffer],
    PROGRAM_IDS.receipts
  );
}

// Account discriminators from IDLs
export const ACCOUNT_DISCRIMINATORS = {
  HumanProfile: Buffer.from([32, 133, 87, 162, 100, 194, 215, 212]),
  AgentProfile: Buffer.from([60, 227, 42, 24, 0, 87, 86, 205]),
  Capability: Buffer.from([192, 140, 41, 92, 236, 64, 181, 99]),
  EmergencyFreezeRecord: Buffer.from([148, 187, 2, 194, 255, 169, 41, 5]),
  ActionReceipt: Buffer.from([52, 35, 16, 111, 195, 40, 16, 69]),
  Document: Buffer.from([226, 212, 133, 177, 48, 5, 171, 243]),
  SignatureRecord: Buffer.from([131, 228, 158, 203, 39, 52, 166, 51]),
};

// Legacy alias
export const ACTION_RECEIPT_DISCRIMINATOR = ACCOUNT_DISCRIMINATORS.ActionReceipt;
