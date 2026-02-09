/**
 * Simulate a Veriff webhook locally for testing.
 *
 * Usage:
 *   npx tsx scripts/simulate-webhook.ts <WALLET_PUBKEY> [PORT]
 */
import * as crypto from 'crypto';

async function main() {
  const wallet = process.argv[2];
  const port = process.argv[3] ?? '3100';

  if (!wallet) {
    console.error('Usage: npx tsx scripts/simulate-webhook.ts <WALLET_PUBKEY> [PORT]');
    process.exit(1);
  }

  const apiSecret = process.env.VERIFF_API_SECRET;
  if (!apiSecret) {
    console.error('Set VERIFF_API_SECRET env var');
    process.exit(1);
  }

  const baseUrl = `http://localhost:${port}`;

  // Step 1: Create session
  console.log('1. Creating KYC session...');
  const sessionRes = await fetch(`${baseUrl}/kyc/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletPubkey: wallet }),
  });

  if (!sessionRes.ok) {
    console.error('Session creation failed:', await sessionRes.text());
    process.exit(1);
  }

  const sessionData = await sessionRes.json() as any;
  console.log('   Session ID:', sessionData.sessionId);

  // Step 2: Simulate approved webhook
  console.log('2. Sending approved webhook...');
  const webhookPayload = JSON.stringify({
    id: sessionData.sessionId,
    verification: {
      id: sessionData.sessionId,
      status: 'approved',
      decisionTime: new Date().toISOString(),
    },
    status: 'approved',
  });

  const rawBody = Buffer.from(webhookPayload);
  const hmac = crypto
    .createHmac('sha256', apiSecret)
    .update(new Uint8Array(rawBody) as any)
    .digest('hex');

  const webhookRes = await fetch(`${baseUrl}/kyc/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HMAC-SIGNATURE': hmac,
    },
    body: rawBody,
  });

  console.log('   Webhook response:', webhookRes.status, await webhookRes.text());

  // Step 3: Check status
  console.log('3. Checking status...');
  const statusRes = await fetch(`${baseUrl}/kyc/status?walletPubkey=${wallet}`);
  const status = await statusRes.json() as any;
  console.log('   Status:', JSON.stringify(status, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
