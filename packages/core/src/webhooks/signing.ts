/**
 * Webhook payload signing utilities.
 *
 * Format:
 *   X-Mandara-Timestamp: <unix timestamp in seconds>
 *   X-Mandara-Signature: sha256=<hmac-sha256(secret, timestamp.body)>
 *
 * The signature is computed over the string:
 *   <timestamp>.<raw-json-body>
 */

import crypto from "node:crypto";

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashWebhookSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function signWebhookPayload(
  secret: string,
  timestamp: number,
  rawBody: string
): string {
  const payload = `${timestamp}.${rawBody}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: number,
  rawBody: string,
  signature: string
): boolean {
  const expected = signWebhookPayload(secret, timestamp, rawBody);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
