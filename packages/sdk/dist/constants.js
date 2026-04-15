"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_RECEIPT_DISCRIMINATOR = exports.ACCOUNT_DISCRIMINATORS = exports.DISCRIMINATORS = exports.PROGRAM_IDS = void 0;
exports.getProgramId = getProgramId;
exports.deriveHumanProfilePda = deriveHumanProfilePda;
exports.deriveAgentPda = deriveAgentPda;
exports.deriveCapabilityPda = deriveCapabilityPda;
exports.deriveFreezePda = deriveFreezePda;
exports.deriveDocumentPda = deriveDocumentPda;
exports.deriveReceiptPda = deriveReceiptPda;
const web3_js_1 = require("@solana/web3.js");
// ============================================================================
// CORRECT DEVNET PROGRAM IDs (verified with `solana program show`)
// ============================================================================
exports.PROGRAM_IDS = {
    humanRegistry: new web3_js_1.PublicKey("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo"),
    agentRegistry: new web3_js_1.PublicKey("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ"),
    delegation: new web3_js_1.PublicKey("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT"),
    humanPay: new web3_js_1.PublicKey("HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9"),
    dataBlink: new web3_js_1.PublicKey("GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX"),
    documentRegistry: new web3_js_1.PublicKey("8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28"),
    receipts: new web3_js_1.PublicKey("EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM"),
};
function getProgramId(program) {
    return exports.PROGRAM_IDS[program];
}
// ============================================================================
// DISCRIMINATORS (from IDLs)
// ============================================================================
exports.DISCRIMINATORS = {
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
function deriveHumanProfilePda(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("human_profile"), wallet.toBuffer()], exports.PROGRAM_IDS.humanRegistry);
}
function deriveAgentPda(principal, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    const view = new DataView(nonceBuffer.buffer);
    view.setBigUint64(0, BigInt(nonce), true);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), principal.toBuffer(), nonceBuffer], exports.PROGRAM_IDS.agentRegistry);
}
function deriveCapabilityPda(principal, agent, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    const view = new DataView(nonceBuffer.buffer);
    view.setBigUint64(0, BigInt(nonce), true);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("capability"), principal.toBuffer(), agent.toBuffer(), nonceBuffer], exports.PROGRAM_IDS.delegation);
}
function deriveFreezePda(principal, agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("freeze"), principal.toBuffer(), agent.toBuffer()], exports.PROGRAM_IDS.delegation);
}
function deriveDocumentPda(docHash) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("document"), docHash], exports.PROGRAM_IDS.documentRegistry);
}
function deriveReceiptPda(agentId, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    const view = new DataView(nonceBuffer.buffer);
    view.setBigUint64(0, BigInt(nonce), true);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("receipt"), agentId.toBuffer(), nonceBuffer], exports.PROGRAM_IDS.receipts);
}
// Account discriminators from IDLs
exports.ACCOUNT_DISCRIMINATORS = {
    HumanProfile: Buffer.from([32, 133, 87, 162, 100, 194, 215, 212]),
    AgentProfile: Buffer.from([60, 227, 42, 24, 0, 87, 86, 205]),
    Capability: Buffer.from([192, 140, 41, 92, 236, 64, 181, 99]),
    EmergencyFreezeRecord: Buffer.from([148, 187, 2, 194, 255, 169, 41, 5]),
    ActionReceipt: Buffer.from([52, 35, 16, 111, 195, 40, 16, 69]),
    Document: Buffer.from([226, 212, 133, 177, 48, 5, 171, 243]),
    SignatureRecord: Buffer.from([131, 228, 158, 203, 39, 52, 166, 51]),
};
// Legacy alias
exports.ACTION_RECEIPT_DISCRIMINATOR = exports.ACCOUNT_DISCRIMINATORS.ActionReceipt;
//# sourceMappingURL=constants.js.map