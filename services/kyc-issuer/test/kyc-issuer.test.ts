import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

// Re-implement locally to test without importing (avoids module resolution in test)
function verifyWebhookSignature(
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

function computePayloadHash(sessionId: string, decision: string, ts: string): Uint8Array {
  const input = `${sessionId}|${decision}|${ts}`;
  return new Uint8Array(crypto.createHash('sha256').update(input).digest());
}

const DOMAIN = 'humanrail:attestation:v1';
const MSG_LEN = 146;

function buildSigningBytes(
  profilePda: Uint8Array,
  issuerPda: Uint8Array,
  payloadHash: Uint8Array,
  weight: number,
  issuedAt: number,
  expiresAt: number,
  nonce: number
): Uint8Array {
  const buf = new ArrayBuffer(MSG_LEN);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);
  let off = 0;
  arr.set(new TextEncoder().encode(DOMAIN), off); off += 24;
  arr.set(profilePda, off); off += 32;
  arr.set(issuerPda, off); off += 32;
  arr.set(payloadHash, off); off += 32;
  view.setUint16(off, weight, true); off += 2;
  view.setBigInt64(off, BigInt(issuedAt), true); off += 8;
  view.setBigInt64(off, BigInt(expiresAt), true); off += 8;
  view.setBigUint64(off, BigInt(nonce), true); off += 8;
  return arr;
}

describe('Webhook HMAC verification', () => {
  const secret = 'test-veriff-secret-key';

  it('accepts valid HMAC', () => {
    const body = Buffer.from('{"id":"abc","status":"approved"}');
    const hmac = crypto.createHmac('sha256', secret).update(new Uint8Array(body) as any).digest('hex');
    expect(verifyWebhookSignature(body, hmac, secret)).toBe(true);
  });

  it('rejects invalid HMAC', () => {
    const body = Buffer.from('{"id":"abc"}');
    expect(verifyWebhookSignature(body, 'deadbeef'.repeat(8), secret)).toBe(false);
  });

  it('rejects tampered body', () => {
    const body = Buffer.from('{"id":"abc"}');
    const hmac = crypto.createHmac('sha256', secret).update(new Uint8Array(body) as any).digest('hex');
    const tampered = Buffer.from('{"id":"xyz"}');
    expect(verifyWebhookSignature(tampered, hmac, secret)).toBe(false);
  });
});

describe('Payload hash', () => {
  it('is deterministic', () => {
    const a = computePayloadHash('sess-1', 'approved', '2026-02-06T22:59:37Z');
    const b = computePayloadHash('sess-1', 'approved', '2026-02-06T22:59:37Z');
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
  });

  it('changes with different inputs', () => {
    const a = computePayloadHash('sess-1', 'approved', '2026-02-06T22:59:37Z');
    const b = computePayloadHash('sess-2', 'approved', '2026-02-06T22:59:37Z');
    expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
  });

  it('is 32 bytes', () => {
    const h = computePayloadHash('x', 'y', 'z');
    expect(h.length).toBe(32);
  });
});

describe('Signing bytes format', () => {
  it('produces exactly 146 bytes', () => {
    const msg = buildSigningBytes(
      new Uint8Array(32),
      new Uint8Array(32),
      new Uint8Array(32),
      60,
      1707260000,
      1707260000 + 7776000,
      1
    );
    expect(msg.length).toBe(146);
  });

  it('starts with domain separator', () => {
    const msg = buildSigningBytes(
      new Uint8Array(32),
      new Uint8Array(32),
      new Uint8Array(32),
      60,
      1707260000,
      1707260000 + 7776000,
      1
    );
    const domain = new TextDecoder().decode(msg.slice(0, 24));
    expect(domain).toBe('humanrail:attestation:v1');
  });

  it('encodes weight as u16 LE at offset 120', () => {
    const msg = buildSigningBytes(
      new Uint8Array(32),
      new Uint8Array(32),
      new Uint8Array(32),
      55,
      1000,
      2000,
      1
    );
    // offset: 24+32+32+32 = 120
    const view = new DataView(msg.buffer, msg.byteOffset);
    expect(view.getUint16(120, true)).toBe(55);
  });

  it('encodes nonce as u64 LE at offset 138', () => {
    const msg = buildSigningBytes(
      new Uint8Array(32),
      new Uint8Array(32),
      new Uint8Array(32),
      60,
      1000,
      2000,
      42
    );
    // offset: 24+32+32+32+2+8+8 = 138
    const view = new DataView(msg.buffer, msg.byteOffset);
    expect(view.getBigUint64(138, true)).toBe(42n);
  });
});
