"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanRailError = exports.HumanRailErrorCode = void 0;
var HumanRailErrorCode;
(function (HumanRailErrorCode) {
    HumanRailErrorCode["AGENT_NOT_FOUND"] = "AGENT_NOT_FOUND";
    HumanRailErrorCode["AGENT_SUSPENDED"] = "AGENT_SUSPENDED";
    HumanRailErrorCode["AGENT_REVOKED"] = "AGENT_REVOKED";
    HumanRailErrorCode["AGENT_FROZEN"] = "AGENT_FROZEN";
    HumanRailErrorCode["NO_CAPABILITY"] = "NO_CAPABILITY";
    HumanRailErrorCode["CAPABILITY_EXPIRED"] = "CAPABILITY_EXPIRED";
    HumanRailErrorCode["PER_TX_LIMIT_EXCEEDED"] = "PER_TX_LIMIT_EXCEEDED";
    HumanRailErrorCode["DAILY_LIMIT_EXCEEDED"] = "DAILY_LIMIT_EXCEEDED";
    HumanRailErrorCode["TOTAL_LIMIT_EXCEEDED"] = "TOTAL_LIMIT_EXCEEDED";
    HumanRailErrorCode["PROGRAM_NOT_ALLOWED"] = "PROGRAM_NOT_ALLOWED";
    HumanRailErrorCode["HUMAN_PROFILE_NOT_FOUND"] = "HUMAN_PROFILE_NOT_FOUND";
    HumanRailErrorCode["TRANSACTION_FAILED"] = "TRANSACTION_FAILED";
    HumanRailErrorCode["RPC_ERROR"] = "RPC_ERROR";
    HumanRailErrorCode["DOCUMENT_NOT_REGISTERED"] = "DOCUMENT_NOT_REGISTERED";
})(HumanRailErrorCode || (exports.HumanRailErrorCode = HumanRailErrorCode = {}));
class HumanRailError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = "HumanRailError";
    }
}
exports.HumanRailError = HumanRailError;
//# sourceMappingURL=errors.js.map