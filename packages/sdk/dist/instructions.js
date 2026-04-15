"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRegisterHumanIx = buildRegisterHumanIx;
exports.buildRegisterAgentIx = buildRegisterAgentIx;
exports.buildSuspendAgentIx = buildSuspendAgentIx;
exports.buildReactivateAgentIx = buildReactivateAgentIx;
exports.buildRevokeAgentIx = buildRevokeAgentIx;
exports.buildIssueCapabilityIx = buildIssueCapabilityIx;
exports.buildFreezeAgentIx = buildFreezeAgentIx;
exports.buildUnfreezeAgentIx = buildUnfreezeAgentIx;
exports.buildRevokeCapabilityIx = buildRevokeCapabilityIx;
exports.buildCreateReceiptIx = buildCreateReceiptIx;
exports.buildRegisterDocumentIx = buildRegisterDocumentIx;
exports.buildSignDocumentIx = buildSignDocumentIx;
exports.buildDirectPaymentIx = buildDirectPaymentIx;
const web3_js_1 = require("@solana/web3.js");
const constants_js_1 = require("./constants.js");
// ============================================================================
// Encoding helpers
// ============================================================================
function padString(str, length) {
    const buf = Buffer.alloc(length);
    const bytes = Buffer.from(str.slice(0, length), "utf-8");
    bytes.copy(buf);
    return buf;
}
function u64LE(value) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value));
    return buf;
}
function i64LE(value) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(BigInt(value));
    return buf;
}
function u32LE(value) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value);
    return buf;
}
function u16LE(value) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(value);
    return buf;
}
function u8(value) {
    return Buffer.from([value]);
}
// ============================================================================
// Human Registry
// ============================================================================
function buildRegisterHumanIx(params) {
    const [profilePda] = (0, constants_js_1.deriveHumanProfilePda)(params.wallet);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.wallet, isSigner: true, isWritable: true },
            { pubkey: profilePda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: constants_js_1.PROGRAM_IDS.humanRegistry,
        data: constants_js_1.DISCRIMINATORS.initProfile,
    });
}
// ============================================================================
// Agent Registry
// ============================================================================
function buildRegisterAgentIx(params) {
    const programId = constants_js_1.PROGRAM_IDS.agentRegistry;
    const humanRegistryId = constants_js_1.PROGRAM_IDS.humanRegistry;
    const [humanProfilePda] = (0, constants_js_1.deriveHumanProfilePda)(params.principal);
    const [agentPda] = (0, constants_js_1.deriveAgentPda)(params.principal, params.nonce);
    const [operatorStatsPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent_stats"), agentPda.toBuffer()], programId);
    const nameBuffer = padString(params.name, 32);
    const metadataHash = Buffer.alloc(32);
    const paramsData = Buffer.concat([
        nameBuffer,
        metadataHash,
        params.agentPubkey.toBuffer(),
        Buffer.from([0]), // no tee_measurement
        u64LE(params.nonce),
    ]);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: humanProfilePda, isSigner: false, isWritable: false },
            { pubkey: humanRegistryId, isSigner: false, isWritable: false },
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: operatorStatsPda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.concat([constants_js_1.DISCRIMINATORS.registerAgent, paramsData]),
    });
}
function buildSuspendAgentIx(params) {
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.agentPda, isSigner: false, isWritable: true },
        ],
        programId: constants_js_1.PROGRAM_IDS.agentRegistry,
        data: constants_js_1.DISCRIMINATORS.suspendAgent,
    });
}
function buildReactivateAgentIx(params) {
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.agentPda, isSigner: false, isWritable: true },
        ],
        programId: constants_js_1.PROGRAM_IDS.agentRegistry,
        data: constants_js_1.DISCRIMINATORS.reactivateAgent,
    });
}
function buildRevokeAgentIx(params) {
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.agentPda, isSigner: false, isWritable: true },
        ],
        programId: constants_js_1.PROGRAM_IDS.agentRegistry,
        data: constants_js_1.DISCRIMINATORS.revokeAgent,
    });
}
// ============================================================================
// Delegation
// ============================================================================
function buildIssueCapabilityIx(params) {
    const programId = constants_js_1.PROGRAM_IDS.delegation;
    const [capabilityPda] = (0, constants_js_1.deriveCapabilityPda)(params.principal, params.agent, params.nonce);
    // Build scope bitmask
    let allowedProgramsMask = BigInt("0xFFFFFFFFFFFFFFFF");
    if (params.allowedPrograms.length > 0) {
        allowedProgramsMask = BigInt(0);
        for (const id of params.allowedPrograms) {
            const pk = id.toBase58();
            if (pk === constants_js_1.PROGRAM_IDS.humanPay.toBase58())
                allowedProgramsMask |= BigInt(1);
            else if (pk === constants_js_1.PROGRAM_IDS.dataBlink.toBase58())
                allowedProgramsMask |= BigInt(2);
            else if (pk === constants_js_1.PROGRAM_IDS.documentRegistry.toBase58())
                allowedProgramsMask |= BigInt(4);
            else
                allowedProgramsMask |= BigInt("0x8000000000000000");
        }
        if (allowedProgramsMask === BigInt(0)) {
            allowedProgramsMask = BigInt("0xFFFFFFFFFFFFFFFF");
        }
    }
    const allowedAssetsMask = BigInt("0xFFFFFFFFFFFFFFFF");
    const validitySeconds = params.expiresAt && params.expiresAt > 0
        ? Number(params.expiresAt) - Math.floor(Date.now() / 1000)
        : 0;
    const paramsData = Buffer.concat([
        u64LE(allowedProgramsMask),
        u64LE(allowedAssetsMask),
        u64LE(params.perTxLimit),
        u64LE(params.dailyLimit),
        u64LE(params.totalLimit),
        u16LE(500), // maxSlippageBps 5%
        u64LE(10000000), // maxFee 0.01 SOL
        i64LE(validitySeconds),
        u32LE(0), // cooldownSeconds
        u8(1), // riskTier
        u8(0), // enforceAllowlist
        u32LE(0), // allowlist vec length
        u64LE(params.nonce),
    ]);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.agent, isSigner: false, isWritable: false },
            { pubkey: capabilityPda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.concat([constants_js_1.DISCRIMINATORS.issueCapability, paramsData]),
    });
}
function buildFreezeAgentIx(params) {
    const [freezePda] = (0, constants_js_1.deriveFreezePda)(params.principal, params.agent);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.agent, isSigner: false, isWritable: false },
            { pubkey: params.capabilityPda, isSigner: false, isWritable: false },
            { pubkey: freezePda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: constants_js_1.PROGRAM_IDS.delegation,
        data: constants_js_1.DISCRIMINATORS.emergencyFreeze,
    });
}
function buildUnfreezeAgentIx(params) {
    const [freezePda] = (0, constants_js_1.deriveFreezePda)(params.principal, params.agent);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: freezePda, isSigner: false, isWritable: true },
        ],
        programId: constants_js_1.PROGRAM_IDS.delegation,
        data: constants_js_1.DISCRIMINATORS.unfreeze,
    });
}
function buildRevokeCapabilityIx(params) {
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.principal, isSigner: true, isWritable: true },
            { pubkey: params.capabilityPda, isSigner: false, isWritable: true },
        ],
        programId: constants_js_1.PROGRAM_IDS.delegation,
        data: constants_js_1.DISCRIMINATORS.revokeCapability,
    });
}
// ============================================================================
// Receipts
// ============================================================================
function buildCreateReceiptIx(params) {
    const programId = constants_js_1.PROGRAM_IDS.receipts;
    const [receiptPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("receipt"), params.agent.toBuffer(), u64LE(params.nonce)], programId);
    // Build CreateReceiptParams
    // action_hash: [u8;32], result_hash: [u8;32], action_type: u8, value: u64,
    // destination: Pubkey, timestamp: i64, block_hash: [u8;32], offchain_ref: [u8;64],
    // has_offchain_ref: bool, sequence: u64
    const actionHash = Buffer.alloc(32);
    const resultHash = Buffer.alloc(32);
    const blockHash = Buffer.alloc(32);
    const offchainRef = Buffer.alloc(64);
    const memoBytes = Buffer.from(params.memo.slice(0, 64), "utf-8");
    memoBytes.copy(offchainRef);
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsData = Buffer.concat([
        actionHash,
        resultHash,
        u8(params.actionType),
        u64LE(params.amount),
        params.destination.toBuffer(),
        i64LE(timestamp),
        blockHash,
        offchainRef,
        u8(params.memo ? 1 : 0),
        u64LE(0), // sequence
    ]);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.agent, isSigner: true, isWritable: true },
            { pubkey: params.principal, isSigner: false, isWritable: false },
            { pubkey: params.capability, isSigner: false, isWritable: false },
            { pubkey: receiptPda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.concat([constants_js_1.DISCRIMINATORS.createReceipt, paramsData]),
    });
}
// ============================================================================
// Document Registry
// ============================================================================
function buildRegisterDocumentIx(params) {
    const programId = constants_js_1.PROGRAM_IDS.documentRegistry;
    const [documentPda] = (0, constants_js_1.deriveDocumentPda)(Buffer.from(params.docHash));
    const buffer = Buffer.alloc(8 + 32 + 1 + 32 + 128 + 1 + 32 + 1 + 1 + 32);
    let offset = 0;
    // discriminator
    constants_js_1.DISCRIMINATORS.registerDocument.copy(buffer, offset);
    offset += 8;
    // doc_hash
    Buffer.from(params.docHash).copy(buffer, offset);
    offset += 32;
    // hash_algorithm (Sha256 = 0)
    buffer.writeUInt8(0, offset);
    offset += 1;
    // schema
    const schemaBytes = Buffer.alloc(32);
    Buffer.from(params.schema.slice(0, 32), "utf-8").copy(schemaBytes);
    schemaBytes.copy(buffer, offset);
    offset += 32;
    // uri
    if (params.uri) {
        const uriBytes = Buffer.alloc(128);
        Buffer.from(params.uri.slice(0, 128), "utf-8").copy(uriBytes);
        uriBytes.copy(buffer, offset);
    }
    offset += 128;
    // has_uri
    buffer.writeUInt8(params.uri ? 1 : 0, offset);
    offset += 1;
    // metadata_hash (empty)
    offset += 32;
    // has_metadata
    buffer.writeUInt8(0, offset);
    offset += 1;
    // version_of (None)
    buffer.writeUInt8(0, offset);
    offset += 1;
    const data = buffer.slice(0, offset);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.creator, isSigner: true, isWritable: true },
            { pubkey: documentPda, isSigner: false, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}
function buildSignDocumentIx(params) {
    const programId = constants_js_1.PROGRAM_IDS.documentRegistry;
    const humanRegistryId = constants_js_1.PROGRAM_IDS.humanRegistry;
    const [humanProfilePda] = (0, constants_js_1.deriveHumanProfilePda)(params.signer);
    const roleBytes = Buffer.alloc(32);
    Buffer.from(params.role.slice(0, 32), "utf-8").copy(roleBytes);
    const [signatureRecordPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("signature"), params.documentPda.toBuffer(), params.signer.toBuffer(), roleBytes], programId);
    const [signingReceiptPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("signing_receipt"), params.documentPda.toBuffer(), params.signer.toBuffer(), roleBytes], programId);
    const buffer = Buffer.alloc(8 + 32 + 64 + 1);
    let offset = 0;
    constants_js_1.DISCRIMINATORS.signDocumentVerified.copy(buffer, offset);
    offset += 8;
    roleBytes.copy(buffer, offset);
    offset += 32;
    // signature_metadata (empty)
    offset += 64;
    // has_metadata
    buffer.writeUInt8(0, offset);
    offset += 1;
    const data = buffer.slice(0, offset);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: params.signer, isSigner: true, isWritable: true },
            { pubkey: humanProfilePda, isSigner: false, isWritable: false },
            { pubkey: params.documentPda, isSigner: false, isWritable: true },
            { pubkey: signatureRecordPda, isSigner: false, isWritable: true },
            { pubkey: signingReceiptPda, isSigner: false, isWritable: true },
            { pubkey: humanRegistryId, isSigner: false, isWritable: false },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}
// ============================================================================
// HumanPay (simplified direct SOL transfer + receipt)
// ============================================================================
function buildDirectPaymentIx(params) {
    return web3_js_1.SystemProgram.transfer({
        fromPubkey: params.from,
        toPubkey: params.to,
        lamports: BigInt(params.amount),
    });
}
//# sourceMappingURL=instructions.js.map