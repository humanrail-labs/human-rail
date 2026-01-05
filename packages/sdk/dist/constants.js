"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTESTATION_WEIGHTS = exports.MAX_HUMAN_SCORE = exports.UNIQUE_HUMAN_THRESHOLD = exports.WORKER_STATS_SEED = exports.RESPONSE_SEED = exports.TASK_VAULT_SEED = exports.TASK_SEED = exports.INVOICE_VAULT_SEED = exports.INVOICE_SEED = exports.REGISTRY_CONFIG_SEED = exports.HUMAN_PROFILE_SEED = exports.DATA_BLINK_PROGRAM_ID = exports.HUMAN_PAY_PROGRAM_ID = exports.HUMAN_REGISTRY_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
// Program IDs - canonical addresses from declare_id! in on-chain programs
exports.HUMAN_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR');
exports.HUMAN_PAY_PROGRAM_ID = new web3_js_1.PublicKey('6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe');
exports.DATA_BLINK_PROGRAM_ID = new web3_js_1.PublicKey('BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5');
// PDA Seeds
exports.HUMAN_PROFILE_SEED = Buffer.from('human_profile');
exports.REGISTRY_CONFIG_SEED = Buffer.from('registry_config');
exports.INVOICE_SEED = Buffer.from('invoice');
exports.INVOICE_VAULT_SEED = Buffer.from('vault');
exports.TASK_SEED = Buffer.from('task');
exports.TASK_VAULT_SEED = Buffer.from('task_vault');
exports.RESPONSE_SEED = Buffer.from('response');
exports.WORKER_STATS_SEED = Buffer.from('worker_stats');
// Score thresholds
exports.UNIQUE_HUMAN_THRESHOLD = 5000;
exports.MAX_HUMAN_SCORE = 10000;
// Attestation type weights (in basis points)
exports.ATTESTATION_WEIGHTS = {
    SAS: 3000,
    WorldId: 2500,
    Civic: 2000,
    GitcoinPassport: 1500,
    Custom: 500,
};
//# sourceMappingURL=constants.js.map