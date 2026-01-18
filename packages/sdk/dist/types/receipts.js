"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionHash = createActionHash;
exports.createOffchainRef = createOffchainRef;
exports.decodeOffchainRef = decodeOffchainRef;
exports.verifyReceiptIntegrity = verifyReceiptIntegrity;
// Helper to create action hash from request data
function createActionHash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    // Simple hash (in production, use proper hash function)
    const hash = new Uint8Array(32);
    for (let i = 0; i < encoded.length; i++) {
        hash[i % 32] ^= encoded[i];
    }
    return hash;
}
// Helper to create offchain reference
function createOffchainRef(uri) {
    const bytes = new Uint8Array(64);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(uri.slice(0, 64));
    bytes.set(encoded);
    return bytes;
}
// Helper to decode offchain reference
function decodeOffchainRef(bytes) {
    const decoder = new TextDecoder();
    const nullIndex = bytes.indexOf(0);
    return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}
// Helper to verify receipt data integrity
function verifyReceiptIntegrity(receipt, expectedPrincipal, expectedAgent, expectedCapability) {
    let isValid = true;
    if (expectedPrincipal && !receipt.principalId.equals(expectedPrincipal)) {
        isValid = false;
    }
    if (expectedAgent && !receipt.agentId.equals(expectedAgent)) {
        isValid = false;
    }
    if (expectedCapability && !receipt.capabilityId.equals(expectedCapability)) {
        isValid = false;
    }
    return {
        isValid,
        receipt,
        principal: receipt.principalId,
        agent: receipt.agentId,
        capability: receipt.capabilityId,
        timestamp: new Date(receipt.timestamp.toNumber() * 1000),
        value: receipt.value,
    };
}
//# sourceMappingURL=receipts.js.map