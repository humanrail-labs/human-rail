import * as crypto from 'crypto';

export interface VeriffSessionResponse {
  status: string;
  verification: {
    id: string;
    url: string;
    vendorData: string;
    host: string;
    status: string;
    sessionToken: string;
  };
}

export async function createVeriffSession(
  apiKey: string,
  baseUrl: string,
  walletPubkey: string
): Promise<VeriffSessionResponse> {
  const body = {
    verification: {
      vendorData: walletPubkey,
      timestamp: new Date().toISOString(),
    },
  };

  const res = await fetch(`${baseUrl}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-CLIENT': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veriff session creation failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<VeriffSessionResponse>;
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  apiSecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', apiSecret)
    .update(new Uint8Array(rawBody) as any)
    .digest('hex')
    .toLowerCase();

  const provided = signatureHeader.toLowerCase();
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(expected)) as any,
    new Uint8Array(Buffer.from(provided)) as any
  );
}

export function computePayloadHash(
  sessionId: string,
  decision: string,
  decisionTimestamp: string
): Uint8Array {
  const input = `${sessionId}|${decision}|${decisionTimestamp}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  return new Uint8Array(hash);
}
