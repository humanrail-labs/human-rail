"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanRailClient = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const constants_1 = require("./constants");
const human_registry_1 = require("./idl/human_registry");
const human_pay_1 = require("./idl/human_pay");
const data_blink_1 = require("./idl/data_blink");
class HumanRailClient {
    constructor(config) {
        this.connection = config.connection;
        if (!config.provider) {
            throw new Error('Provider is required. Use HumanRailClient.fromConnection() to create from wallet.');
        }
        this.provider = config.provider;
        this.registryProgramId = config.registryProgramId ?? constants_1.HUMAN_REGISTRY_PROGRAM_ID;
        this.payProgramId = config.payProgramId ?? constants_1.HUMAN_PAY_PROGRAM_ID;
        this.blinkProgramId = config.blinkProgramId ?? constants_1.DATA_BLINK_PROGRAM_ID;
        // Initialize programs with Anchor 0.30+ style
        // IDLs contain the program address, so we just pass the provider
        this.registryProgram = new anchor_1.Program(human_registry_1.IDL, this.provider);
        this.payProgram = new anchor_1.Program(human_pay_1.IDL, this.provider);
        this.blinkProgram = new anchor_1.Program(data_blink_1.IDL, this.provider);
    }
    static fromConnection(connection, wallet) {
        const provider = new anchor_1.AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
        });
        return new HumanRailClient({
            connection,
            provider,
        });
    }
    get wallet() {
        return this.provider.wallet.publicKey;
    }
}
exports.HumanRailClient = HumanRailClient;
//# sourceMappingURL=client.js.map