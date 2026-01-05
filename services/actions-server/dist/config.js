"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const web3_js_1 = require("@solana/web3.js");
function getEnvOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}
function getRpcUrl(cluster) {
    const customRpc = process.env.RPC_URL;
    if (customRpc)
        return customRpc;
    switch (cluster) {
        case 'mainnet-beta':
            return (0, web3_js_1.clusterApiUrl)('mainnet-beta');
        case 'devnet':
            return (0, web3_js_1.clusterApiUrl)('devnet');
        case 'localnet':
            return 'http://localhost:8899';
        default:
            return (0, web3_js_1.clusterApiUrl)('devnet');
    }
}
const cluster = getEnvOrDefault('CLUSTER', 'localnet');
exports.config = {
    port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
    rpcUrl: getRpcUrl(cluster),
    cluster,
    programIds: {
        humanRegistry: new web3_js_1.PublicKey(getEnvOrDefault('HUMAN_REGISTRY_PROGRAM_ID', 'Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR')),
        humanPay: new web3_js_1.PublicKey(getEnvOrDefault('HUMAN_PAY_PROGRAM_ID', '6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe')),
        dataBlink: new web3_js_1.PublicKey(getEnvOrDefault('DATA_BLINK_PROGRAM_ID', 'BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5')),
    },
    baseUrl: getEnvOrDefault('BASE_URL', 'http://localhost:3001'),
    iconUrl: getEnvOrDefault('ICON_URL', 'https://humanrail.dev/icon.png'),
};
