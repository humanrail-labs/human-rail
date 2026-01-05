"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceStatus = exports.AttestationType = void 0;
// Attestation types
var AttestationType;
(function (AttestationType) {
    AttestationType[AttestationType["SAS"] = 0] = "SAS";
    AttestationType[AttestationType["WorldId"] = 1] = "WorldId";
    AttestationType[AttestationType["Civic"] = 2] = "Civic";
    AttestationType[AttestationType["GitcoinPassport"] = 3] = "GitcoinPassport";
    AttestationType[AttestationType["Custom"] = 4] = "Custom";
})(AttestationType || (exports.AttestationType = AttestationType = {}));
// Invoice status
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus[InvoiceStatus["Open"] = 0] = "Open";
    InvoiceStatus[InvoiceStatus["Paid"] = 1] = "Paid";
    InvoiceStatus[InvoiceStatus["Cancelled"] = 2] = "Cancelled";
    InvoiceStatus[InvoiceStatus["Withdrawn"] = 3] = "Withdrawn";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
//# sourceMappingURL=types.js.map