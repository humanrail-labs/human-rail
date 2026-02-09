import express from 'express';
import rateLimit from 'express-rate-limit';
import { Connection, PublicKey } from '@solana/web3.js';
import { getConfig, loadIssuerKeypair } from './config';
import { Store } from './store';
import {
  createVeriffSession,
  verifyWebhookSignature,
  computePayloadHash,
} from './veriff';
import { issueAttestationOnChain } from './issuer';

const app = express();

// Parse raw body for HMAC verification on webhook route
app.use('/kyc/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const sessionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

const WEBHOOK_FRESHNESS_SECONDS = 15 * 60; // ±15 min

const store = new Store();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /kyc/session
app.post('/kyc/session', sessionLimiter, async (req, res) => {
  try {
    const { walletPubkey } = req.body;
    if (!walletPubkey || typeof walletPubkey !== 'string') {
      res.status(400).json({ error: 'walletPubkey required' });
      return;
    }

    try { new PublicKey(walletPubkey); } catch {
      res.status(400).json({ error: 'Invalid Solana public key' });
      return;
    }

    const config = getConfig();
    const veriffResp = await createVeriffSession(
      config.VERIFF_API_KEY,
      config.VERIFF_BASE_URL,
      walletPubkey
    );

    const sessionId = veriffResp.verification.id;
    store.createSession(walletPubkey, sessionId);

    res.json({ sessionId, verificationUrl: veriffResp.verification.url });
  } catch (err: any) {
    console.error('POST /kyc/session error:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// POST /kyc/webhook
app.post('/kyc/webhook', async (req, res) => {
  try {
    const config = getConfig();
    const rawBody = req.body as Buffer;
    const hmacHeader = req.headers['x-hmac-signature'] as string;

    if (!hmacHeader || !verifyWebhookSignature(rawBody, hmacHeader, config.VERIFF_API_SECRET)) {
      res.status(401).json({ error: 'Invalid HMAC signature' });
      return;
    }

    const payload = JSON.parse(rawBody.toString());
    const sessionId: string = payload.id ?? payload.verification?.id;
    const decision: string = payload.verification?.status ?? payload.status;
    const decisionTime: string = payload.verification?.decisionTime ?? new Date().toISOString();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing session ID' });
      return;
    }

    // P0 #3a: Freshness check — reject stale webhooks
    const webhookTs = new Date(decisionTime).getTime() / 1000;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - webhookTs) > WEBHOOK_FRESHNESS_SECONDS) {
      console.warn(`Stale webhook rejected: decisionTime=${decisionTime}, drift=${Math.abs(now - webhookTs)}s`);
      res.status(400).json({ error: 'Webhook timestamp outside acceptable window' });
      return;
    }

    const session = store.getBySessionId(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // P0 #3b: Idempotency — treat duplicate approved webhooks as success
    if (store.isAlreadyAttested(sessionId)) {
      console.log(`Duplicate webhook for ${sessionId}, already attested`);
      res.json({ status: 'ok', note: 'already_attested' });
      return;
    }

    if (decision === 'approved') {
      const payloadHash = computePayloadHash(sessionId, decision, decisionTime);
      const nonce = store.getNextNonce(session.wallet_pubkey);

      store.updateStatus(sessionId, 'approved', {
        payloadHash: Buffer.from(payloadHash).toString('hex'),
        nonce,
      });

      try {
        const connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
        const issuerKeypair = loadIssuerKeypair(config);

        const result = await issueAttestationOnChain({
          connection,
          issuerKeypair,
          walletPubkey: new PublicKey(session.wallet_pubkey),
          payloadHash,
          weight: 60,
          validitySeconds: 90 * 24 * 60 * 60,
          nonce,
        });

        store.updateStatus(sessionId, 'attested', {
          txSignature: result.txSignature,
          attestationPda: result.attestationPda,
        });
      } catch (chainErr: any) {
        console.error('On-chain attestation failed:', chainErr.message);
        store.updateStatus(sessionId, 'chain_error');
      }
    } else {
      store.updateStatus(sessionId, decision);
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('POST /kyc/webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /kyc/status
app.get('/kyc/status', statusLimiter, (req, res) => {
  const walletPubkey = req.query.walletPubkey as string;
  if (!walletPubkey) {
    res.status(400).json({ error: 'walletPubkey query param required' });
    return;
  }

  const session = store.getByWallet(walletPubkey);
  if (!session) {
    res.json({ status: 'not_found' });
    return;
  }

  res.json({
    status: session.status,
    txSignature: session.tx_signature,
    attestationPda: session.attestation_pda,
    updatedAt: session.updated_at,
  });
});

const port = parseInt(process.env.PORT ?? '3100', 10);
app.listen(port, () => {
  console.log(`🚀 KYC Issuer running on :${port}`);
});

export default app;
