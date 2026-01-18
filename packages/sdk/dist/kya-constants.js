"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_VERIFIED_SIGNING_SCORE = exports.MAX_OFFCHAIN_MESSAGE_LEN = exports.MAX_REQUIRED_SIGNERS = exports.MAX_SIG_METADATA_LEN = exports.MAX_IDENTIFIER_LEN = exports.MAX_URI_LEN = exports.MAX_OFFCHAIN_REF = exports.MAX_BATCH_SIZE = exports.MAX_DESTINATION_ALLOWLIST = exports.KEY_ROTATION_GRACE_PERIOD = exports.MAX_KEY_HISTORY = exports.MIN_HUMAN_SCORE_FOR_AGENT = exports.UNIQUE_THRESHOLD = exports.MAX_ATTESTATIONS = exports.WORKER_STATS_SEED = exports.RESPONSE_SEED = exports.TASK_VAULT_SEED = exports.TASK_SEED = exports.INVOICE_VAULT_SEED = exports.INVOICE_SEED = exports.REQUIRED_SIGNER_SEED = exports.SIGNING_RECEIPT_SEED = exports.SIGNATURE_SEED = exports.DOCUMENT_SEED = exports.BATCH_SEED = exports.RECEIPT_INDEX_SEED = exports.RECEIPT_SEED = exports.USAGE_SEED = exports.FREEZE_SEED = exports.REVOCATION_SEED = exports.CAPABILITY_SEED = exports.KEY_ROTATION_SEED = exports.AGENT_STATS_SEED = exports.AGENT_SEED = exports.HUMAN_PROFILE_SEED = exports.DOCUMENT_REGISTRY_PROGRAM_ID = exports.RECEIPTS_PROGRAM_ID = exports.DELEGATION_PROGRAM_ID = exports.AGENT_REGISTRY_PROGRAM_ID = exports.DATA_BLINK_PROGRAM_ID = exports.HUMAN_PAY_PROGRAM_ID = exports.HUMAN_REGISTRY_PROGRAM_ID = void 0;
exports.getHumanProfilePDA = getHumanProfilePDA;
exports.getAgentPDA = getAgentPDA;
exports.getAgentStatsPDA = getAgentStatsPDA;
exports.getCapabilityPDA = getCapabilityPDA;
exports.getFreezePDA = getFreezePDA;
exports.getRevocationPDA = getRevocationPDA;
exports.getReceiptPDA = getReceiptPDA;
exports.getReceiptIndexPDA = getReceiptIndexPDA;
exports.getInvoicePDA = getInvoicePDA;
exports.getTaskPDA = getTaskPDA;
exports.getDocumentPDA = getDocumentPDA;
exports.getSignaturePDA = getSignaturePDA;
exports.getSigningReceiptPDA = getSigningReceiptPDA;
exports.getRequiredSignerPDA = getRequiredSignerPDA;
const web3_js_1 = require("@solana/web3.js");
// =============================================================================
// PROGRAM IDS (Canonical source - matches declare_id! in on-chain programs)
// H-07 FIX: Single source of truth for all program IDs
// =============================================================================
exports.HUMAN_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('7f9UsctTCcCnQmFCe1rphfuf3SJtkx63qnhwR6hVn5eh');
exports.HUMAN_PAY_PROGRAM_ID = new web3_js_1.PublicKey('AZWKLjsKYYCajnN1XSC8KGZocRUMRE8GSWtCSnUgz22r');
exports.DATA_BLINK_PROGRAM_ID = new web3_js_1.PublicKey('2SQKYWBmqn1XqvkJynbRnCNGhhEyaQy5EF9aJcLVzjQ5');
exports.AGENT_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('G9cks2iyDCRiByK8R7DmxrSq2iwXZaQtAinG1cbnZPQ5');
exports.DELEGATION_PROGRAM_ID = new web3_js_1.PublicKey('5LJLTUQR26xPn2mfyM6Y7uMBezKKpATt3CKfKeCnFdtR');
exports.RECEIPTS_PROGRAM_ID = new web3_js_1.PublicKey('Fgz7HoBTyjBQ9nmkVrzn1ccCtzWyBUkfMDov2eJdXnGr');
exports.DOCUMENT_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('EUVJE9VqpejLp56fpVZyi2QTRTDb5kSQ8KLy5Coyc78N');
// =============================================================================
// PDA SEEDS
// =============================================================================
exports.HUMAN_PROFILE_SEED = 'human_profile';
exports.AGENT_SEED = 'agent';
exports.AGENT_STATS_SEED = 'agent_stats';
exports.KEY_ROTATION_SEED = 'key_rotation';
exports.CAPABILITY_SEED = 'capability';
exports.REVOCATION_SEED = 'revocation';
exports.FREEZE_SEED = 'freeze';
exports.USAGE_SEED = 'usage';
exports.RECEIPT_SEED = 'receipt';
exports.RECEIPT_INDEX_SEED = 'receipt_index';
exports.BATCH_SEED = 'batch';
exports.DOCUMENT_SEED = 'document';
exports.SIGNATURE_SEED = 'signature';
exports.SIGNING_RECEIPT_SEED = 'signing_receipt';
exports.REQUIRED_SIGNER_SEED = 'required_signer';
exports.INVOICE_SEED = 'invoice';
exports.INVOICE_VAULT_SEED = 'invoice_vault';
exports.TASK_SEED = 'task';
exports.TASK_VAULT_SEED = 'task_vault';
exports.RESPONSE_SEED = 'response';
exports.WORKER_STATS_SEED = 'worker_stats';
// =============================================================================
// THRESHOLDS AND LIMITS
// =============================================================================
exports.MAX_ATTESTATIONS = 8;
exports.UNIQUE_THRESHOLD = 100;
exports.MIN_HUMAN_SCORE_FOR_AGENT = 50;
exports.MAX_KEY_HISTORY = 3;
exports.KEY_ROTATION_GRACE_PERIOD = 86400;
exports.MAX_DESTINATION_ALLOWLIST = 10;
exports.MAX_BATCH_SIZE = 10;
exports.MAX_OFFCHAIN_REF = 64;
exports.MAX_URI_LEN = 128;
exports.MAX_IDENTIFIER_LEN = 32;
exports.MAX_SIG_METADATA_LEN = 64;
exports.MAX_REQUIRED_SIGNERS = 10;
exports.MAX_OFFCHAIN_MESSAGE_LEN = 1024;
exports.MIN_VERIFIED_SIGNING_SCORE = 50;
// =============================================================================
// PDA DERIVATION HELPERS
// =============================================================================
function getHumanProfilePDA(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.HUMAN_PROFILE_SEED), wallet.toBuffer()], exports.HUMAN_REGISTRY_PROGRAM_ID);
}
function getAgentPDA(principal, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.AGENT_SEED), principal.toBuffer(), nonceBuffer], exports.AGENT_REGISTRY_PROGRAM_ID);
}
function getAgentStatsPDA(agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.AGENT_STATS_SEED), agent.toBuffer()], exports.AGENT_REGISTRY_PROGRAM_ID);
}
function getCapabilityPDA(principal, agent, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(exports.CAPABILITY_SEED),
        principal.toBuffer(),
        agent.toBuffer(),
        nonceBuffer,
    ], exports.DELEGATION_PROGRAM_ID);
}
function getFreezePDA(principal, agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.FREEZE_SEED), principal.toBuffer(), agent.toBuffer()], exports.DELEGATION_PROGRAM_ID);
}
function getRevocationPDA(capability) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.REVOCATION_SEED), capability.toBuffer()], exports.DELEGATION_PROGRAM_ID);
}
function getReceiptPDA(agent, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.RECEIPT_SEED), agent.toBuffer(), nonceBuffer], exports.RECEIPTS_PROGRAM_ID);
}
function getReceiptIndexPDA(agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.RECEIPT_INDEX_SEED), agent.toBuffer()], exports.RECEIPTS_PROGRAM_ID);
}
function getInvoicePDA(merchant, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.INVOICE_SEED), merchant.toBuffer(), nonceBuffer], exports.HUMAN_PAY_PROGRAM_ID);
}
function getTaskPDA(creator, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.TASK_SEED), creator.toBuffer(), nonceBuffer], exports.DATA_BLINK_PROGRAM_ID);
}
function getDocumentPDA(docHash) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.DOCUMENT_SEED), Buffer.from(docHash)], exports.DOCUMENT_REGISTRY_PROGRAM_ID);
}
function getSignaturePDA(document, signer, role) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(exports.SIGNATURE_SEED),
        document.toBuffer(),
        signer.toBuffer(),
        Buffer.from(role),
    ], exports.DOCUMENT_REGISTRY_PROGRAM_ID);
}
function getSigningReceiptPDA(document, signer, role) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(exports.SIGNING_RECEIPT_SEED),
        document.toBuffer(),
        signer.toBuffer(),
        Buffer.from(role),
    ], exports.DOCUMENT_REGISTRY_PROGRAM_ID);
}
function getRequiredSignerPDA(document, role) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(exports.REQUIRED_SIGNER_SEED),
        document.toBuffer(),
        Buffer.from(role),
    ], exports.DOCUMENT_REGISTRY_PROGRAM_ID);
}
//# sourceMappingURL=kya-constants.js.map