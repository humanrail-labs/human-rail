"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveInvoicePda = deriveInvoicePda;
exports.deriveInvoiceVaultPda = deriveInvoiceVaultPda;
exports.getInvoice = getInvoice;
exports.getInvoicesByMerchant = getInvoicesByMerchant;
exports.createInvoice = createInvoice;
exports.generateNonce = generateNonce;
exports.payInvoice = payInvoice;
exports.cancelInvoice = cancelInvoice;
exports.withdrawInvoice = withdrawInvoice;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const types_1 = require("./types");
const constants_1 = require("./constants");
/**
 * Derive invoice PDA
 */
function deriveInvoicePda(merchant, mint, nonce, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        constants_1.INVOICE_SEED,
        merchant.toBuffer(),
        mint.toBuffer(),
        nonce.toArrayLike(Buffer, 'le', 8),
    ], programId);
}
/**
 * Derive invoice vault PDA
 */
function deriveInvoiceVaultPda(invoice, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.INVOICE_VAULT_SEED, invoice.toBuffer()], programId);
}
/**
 * Fetch an invoice by its public key
 */
async function getInvoice(client, invoicePubkey) {
    try {
        const account = await client.payProgram.account.confidentialInvoice.fetch(invoicePubkey);
        return account;
    }
    catch (error) {
        return null;
    }
}
/**
 * Fetch all invoices created by a merchant
 */
async function getInvoicesByMerchant(client, merchant) {
    const accounts = await client.payProgram.account.confidentialInvoice.all([
        {
            memcmp: {
                offset: 8, // After discriminator
                bytes: merchant.toBase58(),
            },
        },
    ]);
    return accounts.map((a) => a.account);
}
/**
 * Create a new confidential invoice
 */
async function createInvoice(client, params) {
    const [invoicePda] = deriveInvoicePda(client.wallet, params.mint, params.nonce, client.payProgramId);
    const [vaultPda] = deriveInvoiceVaultPda(invoicePda, client.payProgramId);
    const tx = await client.payProgram.methods
        .createConfidentialInvoice({
        amount: params.amount,
        humanRequirements: params.humanRequirements,
        expiresAt: params.expiresAt,
        memo: Array.from(params.memo),
        nonce: params.nonce,
    })
        .accounts({
        invoice: invoicePda,
        vault: vaultPda,
        mint: params.mint,
        merchant: client.wallet,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return { tx, invoice: invoicePda };
}
/**
 * Generate a unique nonce for PDA derivation
 */
function generateNonce() {
    return new anchor_1.BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}
/**
 * Pay an existing invoice
 */
async function payInvoice(client, invoicePubkey) {
    const invoice = await getInvoice(client, invoicePubkey);
    if (!invoice) {
        throw new Error('Invoice not found');
    }
    if (invoice.status !== types_1.InvoiceStatus.Open) {
        throw new Error('Invoice is not open for payment');
    }
    const payerTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(invoice.mint, client.wallet, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const [profilePda] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.HUMAN_PROFILE_SEED, client.wallet.toBuffer()], client.registryProgramId);
    const tx = await client.payProgram.methods
        .payConfidentialInvoice()
        .accounts({
        invoice: invoicePubkey,
        vault: invoice.vault,
        mint: invoice.mint,
        payerProfile: profilePda,
        payerTokenAccount: payerTokenAccount,
        payer: client.wallet,
        humanRegistryProgram: client.registryProgramId,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
    })
        .rpc();
    return tx;
}
/**
 * Cancel an invoice (merchant only)
 */
async function cancelInvoice(client, invoicePubkey) {
    const tx = await client.payProgram.methods
        .cancelInvoice()
        .accounts({
        invoice: invoicePubkey,
        merchant: client.wallet,
    })
        .rpc();
    return tx;
}
/**
 * Withdraw funds from a paid invoice (merchant only)
 */
async function withdrawInvoice(client, invoicePubkey) {
    const invoice = await getInvoice(client, invoicePubkey);
    if (!invoice) {
        throw new Error('Invoice not found');
    }
    const merchantTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(invoice.mint, client.wallet, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const tx = await client.payProgram.methods
        .withdrawInvoice()
        .accounts({
        invoice: invoicePubkey,
        vault: invoice.vault,
        mint: invoice.mint,
        merchantTokenAccount: merchantTokenAccount,
        merchant: client.wallet,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
    })
        .rpc();
    return tx;
}
//# sourceMappingURL=pay.js.map