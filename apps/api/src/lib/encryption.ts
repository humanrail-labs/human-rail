/**
 * Application-layer encryption for sensitive database fields.
 *
 * Uses AES-256-GCM with a server-side secret key derived from
 * MANDARA_ENCRYPTION_PASSWORD via scrypt.
 */

import crypto from "node:crypto";
import { env } from "../config.js";

const ALGO = "aes-256-gcm";
const SALT = Buffer.from("mandara-static-salt-v1", "utf8");

function getKey(): Buffer {
  const password = env.MANDARA_ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error("MANDARA_ENCRYPTION_PASSWORD is not configured");
  }
  return crypto.scryptSync(password, SALT, 32);
}

export interface EncryptedField {
  value: string; // hex-encoded ciphertext
  iv: string;    // hex-encoded IV
  tag: string;   // hex-encoded auth tag
}

export function encrypt(plaintext: string): EncryptedField {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    value: encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(encrypted: EncryptedField): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(encrypted.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));
  let decrypted = decipher.update(encrypted.value, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
