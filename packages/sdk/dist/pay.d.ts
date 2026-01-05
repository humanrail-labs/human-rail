import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { HumanRailClient } from './client';
import { ConfidentialInvoice, CreateInvoiceParams } from './types';
/**
 * Derive invoice PDA
 */
export declare function deriveInvoicePda(merchant: PublicKey, mint: PublicKey, nonce: BN, programId: PublicKey): [PublicKey, number];
/**
 * Derive invoice vault PDA
 */
export declare function deriveInvoiceVaultPda(invoice: PublicKey, programId: PublicKey): [PublicKey, number];
/**
 * Fetch an invoice by its public key
 */
export declare function getInvoice(client: HumanRailClient, invoicePubkey: PublicKey): Promise<ConfidentialInvoice | null>;
/**
 * Fetch all invoices created by a merchant
 */
export declare function getInvoicesByMerchant(client: HumanRailClient, merchant: PublicKey): Promise<ConfidentialInvoice[]>;
/**
 * Create a new confidential invoice
 */
export declare function createInvoice(client: HumanRailClient, params: CreateInvoiceParams & {
    mint: PublicKey;
}): Promise<{
    tx: string;
    invoice: PublicKey;
}>;
/**
 * Generate a unique nonce for PDA derivation
 */
export declare function generateNonce(): BN;
/**
 * Pay an existing invoice
 */
export declare function payInvoice(client: HumanRailClient, invoicePubkey: PublicKey): Promise<string>;
/**
 * Cancel an invoice (merchant only)
 */
export declare function cancelInvoice(client: HumanRailClient, invoicePubkey: PublicKey): Promise<string>;
/**
 * Withdraw funds from a paid invoice (merchant only)
 */
export declare function withdrawInvoice(client: HumanRailClient, invoicePubkey: PublicKey): Promise<string>;
//# sourceMappingURL=pay.d.ts.map