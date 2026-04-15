"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAgentStatus = parseAgentStatus;
exports.parseCapabilityStatus = parseCapabilityStatus;
exports.parseDocumentStatus = parseDocumentStatus;
exports.parseSignerType = parseSignerType;
exports.parseSignatureTier = parseSignatureTier;
exports.parseSignatureStatus = parseSignatureStatus;
exports.parseHumanProfile = parseHumanProfile;
exports.parseAgentProfile = parseAgentProfile;
exports.parseCapability = parseCapability;
exports.parseFreezeAccount = parseFreezeAccount;
exports.parseReceipt = parseReceipt;
exports.parseDocument = parseDocument;
exports.parseSignatureRecord = parseSignatureRecord;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
exports.getActionTypeName = getActionTypeName;
const web3_js_1 = require("@solana/web3.js");
const constants_js_1 = require("./constants.js");
function parseAgentStatus(statusByte) {
    switch (statusByte) {
        case 0: return "Active";
        case 1: return "Suspended";
        case 2: return "Revoked";
        default: return "Active";
    }
}
function parseCapabilityStatus(statusByte) {
    switch (statusByte) {
        case 0: return "Active";
        case 1: return "Frozen";
        case 2: return "Revoked";
        case 3: return "Disputed";
        default: return "Active";
    }
}
function parseDocumentStatus(byte) {
    switch (byte) {
        case 0: return "Draft";
        case 1: return "Active";
        case 2: return "Finalized";
        case 3: return "Disputed";
        default: return "Draft";
    }
}
function parseSignerType(byte) {
    switch (byte) {
        case 0: return "Human";
        case 1: return "Agent";
        case 2: return "Organization";
        default: return "Human";
    }
}
function parseSignatureTier(byte) {
    switch (byte) {
        case 0: return "WalletNotarization";
        case 1: return "VerifiedSigner";
        case 2: return "AgentOnBehalf";
        default: return "WalletNotarization";
    }
}
function parseSignatureStatus(byte) {
    return byte === 0 ? "Active" : "Revoked";
}
function parseHumanProfile(data) {
    try {
        if (data.length < 80)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.HumanProfile))
            return null;
        let offset = 8; // Skip discriminator
        const wallet = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const humanScore = data.readUInt16LE(offset);
        offset += 2;
        const isUnique = data[offset] === 1;
        offset += 1;
        const totalAttestationCount = data.readUInt32LE(offset);
        offset += 4;
        const activeAttestationCount = data.readUInt32LE(offset);
        offset += 4;
        const lastAttestationAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const lastScoreUpdate = Number(data.readBigInt64LE(offset));
        offset += 8;
        // Skip attestations vec (4 bytes length + variable data)
        const attestationsLen = data.readUInt32LE(offset);
        offset += 4;
        offset += attestationsLen * 75;
        const canRegisterAgents = data[offset] === 1;
        offset += 1;
        const agentsRegistered = data.readUInt32LE(offset);
        offset += 4;
        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const bump = data[offset];
        return {
            wallet,
            humanScore,
            isUnique,
            totalAttestationCount,
            activeAttestationCount,
            lastAttestationAt,
            lastScoreUpdate,
            canRegisterAgents,
            agentsRegistered,
            createdAt,
            bump,
        };
    }
    catch (e) {
        console.error("Failed to parse human profile:", e);
        return null;
    }
}
function parseAgentProfile(data, pda) {
    try {
        if (data.length < 200)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.AgentProfile))
            return null;
        let offset = 8; // Skip discriminator
        const ownerPrincipal = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const signingKey = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const nameBytes = data.slice(offset, offset + 32);
        const name = Buffer.from(nameBytes).toString("utf-8").replace(/\0/g, "").trim();
        offset += 32;
        const metadataHash = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        const teeMeasurement = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        const hasTeeMeasurement = data[offset] === 1;
        offset += 1;
        const status = parseAgentStatus(data[offset]);
        offset += 1;
        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const lastStatusChange = Number(data.readBigInt64LE(offset));
        offset += 8;
        const lastMetadataUpdate = Number(data.readBigInt64LE(offset));
        offset += 8;
        const capabilityCount = data.readUInt32LE(offset);
        offset += 4;
        const actionCount = Number(data.readBigUInt64LE(offset));
        offset += 8;
        const nonce = data.readBigUInt64LE(offset);
        offset += 8;
        const bump = data[offset];
        return {
            ownerPrincipal,
            signingKey,
            name,
            metadataHash,
            teeMeasurement,
            hasTeeMeasurement,
            status,
            createdAt,
            lastStatusChange,
            lastMetadataUpdate,
            capabilityCount,
            actionCount,
            nonce,
            bump,
            pda,
        };
    }
    catch (e) {
        console.error("Failed to parse agent profile:", e);
        return null;
    }
}
function parseCapability(data, pda) {
    try {
        if (data.length < 400)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.Capability))
            return null;
        let offset = 8; // Skip discriminator
        const principal = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const agent = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const allowedPrograms = data.readBigUInt64LE(offset);
        offset += 8;
        const allowedAssets = data.readBigUInt64LE(offset);
        offset += 8;
        const perTxLimit = data.readBigUInt64LE(offset);
        offset += 8;
        const dailyLimit = data.readBigUInt64LE(offset);
        offset += 8;
        const totalLimit = data.readBigUInt64LE(offset);
        offset += 8;
        const maxSlippageBps = data.readUInt16LE(offset);
        offset += 2;
        const maxFee = data.readBigUInt64LE(offset);
        offset += 8;
        const validFrom = Number(data.readBigInt64LE(offset));
        offset += 8;
        const expiresAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const cooldownSeconds = data.readUInt32LE(offset);
        offset += 4;
        const riskTier = data[offset];
        offset += 1;
        const status = parseCapabilityStatus(data[offset]);
        offset += 1;
        const issuedAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const lastUsedAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        const dailySpent = data.readBigUInt64LE(offset);
        offset += 8;
        const currentDay = data.readUInt32LE(offset);
        offset += 4;
        const totalSpent = data.readBigUInt64LE(offset);
        offset += 8;
        const useCount = data.readBigUInt64LE(offset);
        offset += 8;
        const enforceAllowlist = data[offset] === 1;
        offset += 1;
        // Skip allowlist_count (1 byte) + destination_allowlist (10 * 32 bytes) + dispute_reason (32 bytes)
        offset += 1 + 320 + 32;
        const nonce = data.readBigUInt64LE(offset);
        offset += 8;
        const bump = data[offset];
        return {
            principal,
            agent,
            allowedPrograms,
            allowedAssets,
            perTxLimit,
            dailyLimit,
            totalLimit,
            maxSlippageBps,
            maxFee,
            validFrom,
            expiresAt,
            cooldownSeconds,
            riskTier,
            status,
            issuedAt,
            lastUsedAt,
            dailySpent,
            currentDay,
            totalSpent,
            useCount,
            enforceAllowlist,
            nonce,
            bump,
            pda,
            isFrozen: false, // resolved externally by checking freeze PDA
        };
    }
    catch (e) {
        console.error("Failed to parse capability:", e);
        return null;
    }
}
function parseFreezeAccount(data) {
    try {
        if (data.length < 80)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.EmergencyFreezeRecord))
            return null;
        let offset = 8; // Skip discriminator
        const principal = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const agent = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const frozen = data[offset] === 1;
        offset += 1;
        const frozenAt = data.readBigInt64LE(offset);
        return {
            principal,
            agent,
            frozen,
            frozenAt: frozenAt > 0 ? frozenAt : null,
        };
    }
    catch (e) {
        console.error("Failed to parse freeze account:", e);
        return null;
    }
}
function parseReceipt(data, pda) {
    try {
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.ActionReceipt))
            return null;
        let offset = 8;
        const principalId = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const agentId = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const capabilityId = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const actionHash = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        const resultHash = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        const actionType = data[offset];
        offset += 1;
        const amount = data.readBigUInt64LE(offset);
        offset += 8;
        const destination = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const timestamp = Number(data.readBigInt64LE(offset));
        offset += 8;
        const slot = data.readBigUInt64LE(offset);
        offset += 8;
        const blockHash = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        const offchainRef = new Uint8Array(data.slice(offset, offset + 64));
        offset += 64;
        const hasOffchainRef = data[offset] === 1;
        offset += 1;
        const sequence = data.readBigUInt64LE(offset);
        offset += 8;
        const nonce = data.readBigUInt64LE(offset);
        offset += 8;
        const bump = data[offset];
        return {
            principalId,
            agentId,
            capabilityId,
            actionHash,
            resultHash,
            actionType,
            amount,
            destination,
            timestamp,
            slot,
            blockHash,
            offchainRef,
            hasOffchainRef,
            sequence,
            nonce,
            bump,
            pda,
        };
    }
    catch (err) {
        console.error("Failed to parse ActionReceipt:", err);
        return null;
    }
}
function parseDocument(pubkey, data) {
    try {
        if (data.length < 150)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.Document))
            return null;
        let offset = 8; // Skip discriminator
        const docHash = new Uint8Array(data.slice(offset, offset + 32));
        offset += 32;
        // hash_algorithm (1 byte)
        offset += 1;
        const schemaBytes = data.slice(offset, offset + 32);
        const schema = Buffer.from(schemaBytes).toString("utf-8").replace(/\0/g, "").trim();
        offset += 32;
        const uriBytes = data.slice(offset, offset + 128);
        offset += 128;
        const hasUri = data[offset] === 1;
        offset += 1;
        const uri = hasUri ? Buffer.from(uriBytes).toString("utf-8").replace(/\0/g, "").trim() : null;
        // Skip metadata_hash (32) + has_metadata (1)
        offset += 33;
        const creator = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const status = parseDocumentStatus(data[offset]);
        offset += 1;
        const signatureCount = data.readUInt32LE(offset);
        offset += 4;
        // Skip required_signers_count (1)
        offset += 1;
        const createdAtSlot = Number(data.readBigUInt64LE(offset));
        offset += 8;
        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        // Skip finalized_at_slot
        offset += 8;
        const finalizedAtTs = Number(data.readBigInt64LE(offset));
        const finalizedAt = finalizedAtTs > 0 ? finalizedAtTs : null;
        return {
            pubkey,
            docHash,
            docHashHex: bytesToHex(docHash),
            creator,
            schema,
            uri,
            status,
            signatureCount,
            createdAt,
            finalizedAt,
        };
    }
    catch (e) {
        console.error("Failed to parse document:", e);
        return null;
    }
}
function parseSignatureRecord(pubkey, data) {
    try {
        if (data.length < 200)
            return null;
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(constants_js_1.ACCOUNT_DISCRIMINATORS.SignatureRecord))
            return null;
        let offset = 8; // Skip discriminator
        const document = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const signerType = parseSignerType(data[offset]);
        offset += 1;
        const signerPubkey = new web3_js_1.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        // Skip principal_pubkey (32) + has_principal (1) + capability_id (32) + has_capability (1)
        // + attestation_id (32) + has_attestation (1) + signature_mode (1) + signature_bytes (64) + has_signature_bytes (1)
        offset += 32 + 1 + 32 + 1 + 32 + 1 + 1 + 64 + 1;
        const roleBytes = data.slice(offset, offset + 32);
        const role = Buffer.from(roleBytes).toString("utf-8").replace(/\0/g, "").trim();
        offset += 32;
        const tier = parseSignatureTier(data[offset]);
        offset += 1;
        const status = parseSignatureStatus(data[offset]);
        offset += 1;
        // Skip signed_at_slot
        offset += 8;
        const signedAt = Number(data.readBigInt64LE(offset));
        offset += 8;
        // Skip revoked_at_slot (8) + revoked_at_ts (8) + metadata (64) + has_metadata (1)
        offset += 8 + 8 + 64 + 1;
        const humanScoreAtSigning = data.readUInt16LE(offset);
        return {
            pubkey,
            document,
            signerPubkey,
            signerType,
            role,
            tier,
            status,
            signedAt,
            humanScoreAtSigning,
        };
    }
    catch (e) {
        console.error("Failed to parse signature record:", e);
        return null;
    }
}
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
function hexToBytes(hex) {
    const cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length !== 64) {
        throw new Error("Invalid SHA-256 hash: must be 64 hex characters");
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
function getActionTypeName(actionType) {
    const names = {
        0: "Transfer", 1: "Swap", 2: "Stake", 3: "Unstake",
        4: "Task Response", 5: "Document Sign", 6: "Payment", 7: "Custom",
    };
    return names[actionType] || `Action #${actionType}`;
}
//# sourceMappingURL=parsers.js.map