/**
 * Application-layer encryption for sensitive database fields.
 *
 * Uses AES-256-GCM with a server-side secret key derived from
 * the provided password via scrypt.
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const SALT = Buffer.from("mandara-static-salt-v1", "utf8");

function getKey(password: string): Buffer {
  if (!password || password.length < 16) {
    throw new Error("Encryption password must be at least 16 characters");
  }
  return crypto.scryptSync(password, SALT, 32);
}

export interface EncryptedField {
  value: string; // hex-encoded ciphertext
  iv: string;    // hex-encoded IV
  tag: string;   // hex-encoded auth tag
}

export function encrypt(plaintext: string, password: string): EncryptedField {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(password), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    value: encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(encrypted: EncryptedField, password: string): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(password),
    Buffer.from(encrypted.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));
  let decrypted = decipher.update(encrypted.value, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
