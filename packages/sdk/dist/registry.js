"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveHumanProfilePda = deriveHumanProfilePda;
exports.getHumanProfile = getHumanProfile;
exports.initProfile = initProfile;
exports.registerAttestation = registerAttestation;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
function deriveHumanProfilePda(wallet, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.HUMAN_PROFILE_SEED, wallet.toBuffer()], programId);
}
async function getHumanProfile(client, wallet) {
    try {
        const [profilePda] = deriveHumanProfilePda(wallet, client.registryProgramId);
        return await client.registryProgram.account.humanProfile.fetch(profilePda);
    }
    catch (error) {
        return null;
    }
}
async function initProfile(client) {
    const [profilePda] = deriveHumanProfilePda(client.wallet, client.registryProgramId);
    return await client.registryProgram.methods
        .initProfile()
        .accounts({
        profile: profilePda,
        authority: client.wallet,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
}
async function registerAttestation(client, source, payloadHash, weight) {
    const [profilePda] = deriveHumanProfilePda(client.wallet, client.registryProgramId);
    const hashArray = payloadHash instanceof Uint8Array
        ? Array.from(payloadHash)
        : payloadHash;
    return await client.registryProgram.methods
        .registerAttestation(source, hashArray, weight)
        .accounts({
        profile: profilePda,
        authority: client.wallet,
    })
        .rpc();
}
//# sourceMappingURL=registry.js.map