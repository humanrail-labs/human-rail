/**
 * Agent API key utilities for Mandara.
 *
 * Format: mandara_dev_<prefix>_<secret>
 * Only prefix + hash are stored. Raw key is returned once on creation.
 */

import crypto from "node:crypto";

const KEY_PREFIX = "mandara_dev";
const PREFIX_SEGMENT_LENGTH = 8;
const SECRET_LENGTH = 32;

export interface GeneratedAgentApiKey {
  rawKey: string;
  prefix: string;
  hash: string;
  lastFour: string;
}

export function generateAgentApiKey(): GeneratedAgentApiKey {
  const prefixSegment = crypto
    .randomBytes(PREFIX_SEGMENT_LENGTH)
    .toString("base64url")
    .slice(0, PREFIX_SEGMENT_LENGTH);
  const secret = crypto
    .randomBytes(SECRET_LENGTH)
    .toString("base64url")
    .slice(0, SECRET_LENGTH);

  const rawKey = `${KEY_PREFIX}_${prefixSegment}_${secret}`;
  const prefix = `${KEY_PREFIX}_${prefixSegment}`;
  const hash = hashAgentApiKey(rawKey);
  const lastFour = rawKey.slice(-4);

  return { rawKey, prefix, hash, lastFour };
}

export function hashAgentApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function getAgentApiKeyPrefix(rawKey: string): string | null {
  const parts = rawKey.split("_");
  if (parts.length < 3) return null;
  return `${parts[0]}_${parts[1]}_${parts[2]}`;
}

export function verifyAgentApiKey(rawKey: string, storedHash: string): boolean {
  const computed = hashAgentApiKey(rawKey);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}
