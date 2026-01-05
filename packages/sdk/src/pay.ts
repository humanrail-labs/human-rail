import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { HumanRailClient } from './client';
import { ConfidentialInvoice, CreateInvoiceParams, InvoiceStatus } from './types';
import { INVOICE_SEED, INVOICE_VAULT_SEED, HUMAN_PROFILE_SEED } from './constants';

/**
 * Derive invoice PDA
 */
export function deriveInvoicePda(
  merchant: PublicKey,
  mint: PublicKey,
  nonce: BN,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      INVOICE_SEED,
      merchant.toBuffer(),
      mint.toBuffer(),
      nonce.toArrayLike(Buffer, 'le', 8),
    ],
    programId
  );
}

/**
 * Derive invoice vault PDA
 */
export function deriveInvoiceVaultPda(
  invoice: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [INVOICE_VAULT_SEED, invoice.toBuffer()],
    programId
  );
}

/**
 * Fetch an invoice by its public key
 */
export async function getInvoice(
  client: HumanRailClient,
  invoicePubkey: PublicKey
): Promise<ConfidentialInvoice | null> {
  try {
    const account = await (client.payProgram.account as any).confidentialInvoice.fetch(
      invoicePubkey
    );
    return account as ConfidentialInvoice;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch all invoices created by a merchant
 */
export async function getInvoicesByMerchant(
  client: HumanRailClient,
  merchant: PublicKey
): Promise<ConfidentialInvoice[]> {
  const accounts = await (client.payProgram.account as any).confidentialInvoice.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: merchant.toBase58(),
      },
    },
  ]);

  return accounts.map((a: any) => a.account as ConfidentialInvoice);
}

/**
 * Create a new confidential invoice
 */
export async function createInvoice(
  client: HumanRailClient,
  params: CreateInvoiceParams & { mint: PublicKey }
): Promise<{ tx: string; invoice: PublicKey }> {
  const [invoicePda] = deriveInvoicePda(
    client.wallet,
    params.mint,
    params.nonce,
    client.payProgramId
  );

  const [vaultPda] = deriveInvoiceVaultPda(invoicePda, client.payProgramId);

  const tx = await (client.payProgram.methods as any)
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
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, invoice: invoicePda };
}

/**
 * Generate a unique nonce for PDA derivation
 */
export function generateNonce(): BN {
  return new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

/**
 * Pay an existing invoice
 */
export async function payInvoice(
  client: HumanRailClient,
  invoicePubkey: PublicKey
): Promise<string> {
  const invoice = await getInvoice(client, invoicePubkey);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.Open) {
    throw new Error('Invoice is not open for payment');
  }

  const payerTokenAccount = getAssociatedTokenAddressSync(
    invoice.mint,
    client.wallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const [profilePda] = PublicKey.findProgramAddressSync(
    [HUMAN_PROFILE_SEED, client.wallet.toBuffer()],
    client.registryProgramId
  );

  const tx = await (client.payProgram.methods as any)
    .payConfidentialInvoice()
    .accounts({
      invoice: invoicePubkey,
      vault: invoice.vault,
      mint: invoice.mint,
      payerProfile: profilePda,
      payerTokenAccount: payerTokenAccount,
      payer: client.wallet,
      humanRegistryProgram: client.registryProgramId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

/**
 * Cancel an invoice (merchant only)
 */
export async function cancelInvoice(
  client: HumanRailClient,
  invoicePubkey: PublicKey
): Promise<string> {
  const tx = await (client.payProgram.methods as any)
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
export async function withdrawInvoice(
  client: HumanRailClient,
  invoicePubkey: PublicKey
): Promise<string> {
  const invoice = await getInvoice(client, invoicePubkey);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const merchantTokenAccount = getAssociatedTokenAddressSync(
    invoice.mint,
    client.wallet,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await (client.payProgram.methods as any)
    .withdrawInvoice()
    .accounts({
      invoice: invoicePubkey,
      vault: invoice.vault,
      mint: invoice.mint,
      merchantTokenAccount: merchantTokenAccount,
      merchant: client.wallet,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc();

  return tx;
}
