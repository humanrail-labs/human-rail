"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeResolution = exports.CapabilityStatus = exports.AssetScope = exports.ProgramScope = void 0;
exports.createProgramScope = createProgramScope;
exports.createAssetScope = createAssetScope;
exports.isCapabilityValid = isCapabilityValid;
exports.getRemainingDailyLimit = getRemainingDailyLimit;
exports.getRemainingTotalLimit = getRemainingTotalLimit;
const anchor_1 = require("@coral-xyz/anchor");
// Program scope bitmask values
exports.ProgramScope = {
    HUMAN_PAY: 1n << 0n,
    DATA_BLINK: 1n << 1n,
    TOKEN_TRANSFER: 1n << 2n,
    NFT_TRANSFER: 1n << 3n,
    SWAP: 1n << 4n,
    STAKE: 1n << 5n,
    GOVERNANCE: 1n << 6n,
};
// Asset type bitmask values
exports.AssetScope = {
    SOL: 1n << 0n,
    USDC: 1n << 1n,
    USDT: 1n << 2n,
    ANY_SPL_TOKEN: 1n << 3n,
    ANY_NFT: 1n << 4n,
};
// Capability status enum
var CapabilityStatus;
(function (CapabilityStatus) {
    CapabilityStatus[CapabilityStatus["Active"] = 0] = "Active";
    CapabilityStatus[CapabilityStatus["Revoked"] = 1] = "Revoked";
    CapabilityStatus[CapabilityStatus["Expired"] = 2] = "Expired";
    CapabilityStatus[CapabilityStatus["Frozen"] = 3] = "Frozen";
    CapabilityStatus[CapabilityStatus["Disputed"] = 4] = "Disputed";
})(CapabilityStatus || (exports.CapabilityStatus = CapabilityStatus = {}));
// Dispute resolution enum
var DisputeResolution;
(function (DisputeResolution) {
    DisputeResolution[DisputeResolution["Cleared"] = 0] = "Cleared";
    DisputeResolution[DisputeResolution["Revoked"] = 1] = "Revoked";
    DisputeResolution[DisputeResolution["Modified"] = 2] = "Modified";
})(DisputeResolution || (exports.DisputeResolution = DisputeResolution = {}));
// Helper to create scope bitmask
function createProgramScope(...programs) {
    const scope = programs.reduce((acc, p) => acc | p, 0n);
    return new anchor_1.BN(scope.toString());
}
// Helper to create asset scope bitmask
function createAssetScope(...assets) {
    const scope = assets.reduce((acc, a) => acc | a, 0n);
    return new anchor_1.BN(scope.toString());
}
// Helper to check if capability is valid
function isCapabilityValid(capability, currentTime) {
    return (capability.status === CapabilityStatus.Active &&
        currentTime >= capability.validFrom.toNumber() &&
        currentTime < capability.expiresAt.toNumber());
}
// Helper to check remaining daily limit
function getRemainingDailyLimit(capability) {
    return capability.dailyLimit.sub(capability.dailySpent);
}
// Helper to check remaining total limit
function getRemainingTotalLimit(capability) {
    return capability.totalLimit.sub(capability.totalSpent);
}
//# sourceMappingURL=delegation.js.map