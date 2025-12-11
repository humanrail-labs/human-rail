import { Router, Request, Response } from 'express';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { config } from '../config';

export const paymentRoutes = Router();

const connection = new Connection(config.rpcUrl, 'confirmed');

interface ActionGetResponse {
  icon: string;
  title: string;
  description: string;
  label: string;
  links?: {
    actions: Array<{
      label: string;
      href: string;
    }>;
  };
}

interface ActionPostResponse {
  transaction: string;
  message?: string;
}

/**
 * GET /actions/payments/:invoicePubkey
 * Returns Action metadata for an invoice payment
 */
paymentRoutes.get('/:invoicePubkey', async (req: Request, res: Response) => {
  try {
    const { invoicePubkey } = req.params;

    let invoiceKey: PublicKey;
    try {
      invoiceKey = new PublicKey(invoicePubkey);
    } catch {
      return res.status(400).json({ error: 'Invalid invoice public key' });
    }

    // In production, fetch actual invoice data from chain
    const response: ActionGetResponse = {
      icon: config.iconUrl,
      title: 'HumanRail Payment',
      description: 'Pay this confidential invoice. Your identity will be verified before payment.',
      label: 'Pay Invoice',
      links: {
        actions: [
          {
            label: 'Pay Now',
            href: `${config.baseUrl}/actions/payments/${invoicePubkey}/pay`,
          },
        ],
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * POST /actions/payments/:invoicePubkey/pay
 * Pay an invoice
 */
paymentRoutes.post('/:invoicePubkey/pay', async (req: Request, res: Response) => {
  try {
    const { invoicePubkey } = req.params;
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Missing account in request body' });
    }

    let invoiceKey: PublicKey;
    let payerKey: PublicKey;
    try {
      invoiceKey = new PublicKey(invoicePubkey);
      payerKey = new PublicKey(account);
    } catch {
      return res.status(400).json({ error: 'Invalid public key' });
    }

    // Derive PDAs
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), invoiceKey.toBuffer()],
      config.programIds.humanPay
    );

    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('human_profile'), payerKey.toBuffer()],
      config.programIds.humanRegistry
    );

    // In production, fetch invoice to get mint and build complete instruction
    // This is a placeholder showing the structure
    const instruction = new TransactionInstruction({
      programId: config.programIds.humanPay,
      keys: [
        { pubkey: invoiceKey, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        // mint would be fetched from invoice
        { pubkey: profilePda, isSigner: false, isWritable: false },
        // payer token account would be derived from mint
        { pubkey: payerKey, isSigner: true, isWritable: true },
        { pubkey: config.programIds.humanRegistry, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        // pay_confidential_invoice discriminator
        0x01,
      ]),
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payerKey,
    }).add(instruction);

    const serialized = transaction
      .serialize({ requireAllSignatures: false })
      .toString('base64');

    const response: ActionPostResponse = {
      transaction: serialized,
      message: 'Processing payment',
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Handle OPTIONS for CORS preflight
paymentRoutes.options('*', (req, res) => {
  res.status(200).end();
});
