"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const config_1 = require("../config");
exports.paymentRoutes = (0, express_1.Router)();
const connection = new web3_js_1.Connection(config_1.config.rpcUrl, 'confirmed');
/**
 * GET /actions/payments/:invoicePubkey
 * Returns Action metadata for an invoice payment
 */
exports.paymentRoutes.get('/:invoicePubkey', async (req, res) => {
    try {
        const { invoicePubkey } = req.params;
        let invoiceKey;
        try {
            invoiceKey = new web3_js_1.PublicKey(invoicePubkey);
        }
        catch {
            return res.status(400).json({ error: 'Invalid invoice public key' });
        }
        // In production, fetch actual invoice data from chain
        const response = {
            icon: config_1.config.iconUrl,
            title: 'HumanRail Payment',
            description: 'Pay this confidential invoice. Your identity will be verified before payment.',
            label: 'Pay Invoice',
            links: {
                actions: [
                    {
                        label: 'Pay Now',
                        href: `${config_1.config.baseUrl}/actions/payments/${invoicePubkey}/pay`,
                    },
                ],
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});
/**
 * POST /actions/payments/:invoicePubkey/pay
 * Pay an invoice
 */
exports.paymentRoutes.post('/:invoicePubkey/pay', async (req, res) => {
    try {
        const { invoicePubkey } = req.params;
        const { account } = req.body;
        if (!account) {
            return res.status(400).json({ error: 'Missing account in request body' });
        }
        let invoiceKey;
        let payerKey;
        try {
            invoiceKey = new web3_js_1.PublicKey(invoicePubkey);
            payerKey = new web3_js_1.PublicKey(account);
        }
        catch {
            return res.status(400).json({ error: 'Invalid public key' });
        }
        // Derive PDAs
        const [vaultPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vault'), invoiceKey.toBuffer()], config_1.config.programIds.humanPay);
        const [profilePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('human_profile'), payerKey.toBuffer()], config_1.config.programIds.humanRegistry);
        // In production, fetch invoice to get mint and build complete instruction
        // This is a placeholder showing the structure
        const instruction = new web3_js_1.TransactionInstruction({
            programId: config_1.config.programIds.humanPay,
            keys: [
                { pubkey: invoiceKey, isSigner: false, isWritable: true },
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                // mint would be fetched from invoice
                { pubkey: profilePda, isSigner: false, isWritable: false },
                // payer token account would be derived from mint
                { pubkey: payerKey, isSigner: true, isWritable: true },
                { pubkey: config_1.config.programIds.humanRegistry, isSigner: false, isWritable: false },
                { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([
                // pay_confidential_invoice discriminator
                0x01,
            ]),
        });
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new web3_js_1.Transaction({
            recentBlockhash: blockhash,
            feePayer: payerKey,
        }).add(instruction);
        const serialized = transaction
            .serialize({ requireAllSignatures: false })
            .toString('base64');
        const response = {
            transaction: serialized,
            message: 'Processing payment',
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error creating payment transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});
// Handle OPTIONS for CORS preflight
exports.paymentRoutes.options('*', (req, res) => {
    res.status(200).end();
});
