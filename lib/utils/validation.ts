/**
 * Input validation utilities for HumanRail
 * Security-focused validation for all user inputs
 */

import { PublicKey } from "@solana/web3.js";

// ============================================================================
// SOLANA ADDRESS VALIDATION
// ============================================================================

/**
 * Validate a Solana public key string
 */
export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and parse a Solana public key
 */
export function validatePublicKey(key: string): PublicKey | null {
  try {
    return new PublicKey(key);
  } catch {
    return null;
  }
}

// ============================================================================
// STRING VALIDATION
// ============================================================================

/**
 * Validate string length and sanitize
 */
export function validateString(
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
    pattern?: RegExp;
  } = {}
): { valid: boolean; error?: string; sanitized: string } {
  const { minLength = 0, maxLength = 255, allowEmpty = false, pattern } = options;
  
  // Trim whitespace
  const sanitized = input.trim();
  
  // Check empty
  if (!sanitized && !allowEmpty) {
    return { valid: false, error: "Input cannot be empty", sanitized };
  }
  
  // Check length
  if (sanitized.length < minLength) {
    return { valid: false, error: `Minimum length is ${minLength}`, sanitized };
  }
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Maximum length is ${maxLength}`, sanitized };
  }
  
  // Check pattern
  if (pattern && !pattern.test(sanitized)) {
    return { valid: false, error: "Input contains invalid characters", sanitized };
  }
  
  return { valid: true, sanitized };
}

/**
 * Sanitize a string for display (prevents XSS)
 */
export function sanitizeDisplayString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

// ============================================================================
// NUMERIC VALIDATION
// ============================================================================

/**
 * Validate a numeric amount (for tokens/SOL)
 */
export function validateAmount(
  amount: string | number,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
    decimals?: number;
  } = {}
): { valid: boolean; error?: string; value: number } {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowZero = false, decimals = 9 } = options;
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  
  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: "Invalid number", value: 0 };
  }
  
  // Check zero
  if (num === 0 && !allowZero) {
    return { valid: false, error: "Amount must be greater than zero", value: 0 };
  }
  
  // Check negative
  if (num < 0) {
    return { valid: false, error: "Amount cannot be negative", value: 0 };
  }
  
  // Check min/max
  if (num < min) {
    return { valid: false, error: `Minimum amount is ${min}`, value: 0 };
  }
  
  if (num > max) {
    return { valid: false, error: `Maximum amount is ${max}`, value: 0 };
  }
  
  // Check decimal places
  const decimalPart = num.toString().split(".")[1];
  if (decimalPart && decimalPart.length > decimals) {
    return { valid: false, error: `Maximum ${decimals} decimal places allowed`, value: 0 };
  }
  
  return { valid: true, value: num };
}

/**
 * Convert lamports to SOL with validation
 */
export function validateLamports(lamports: bigint | number): { valid: boolean; error?: string; sol: number } {
  try {
    const num = typeof lamports === "bigint" ? Number(lamports) : lamports;
    
    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: "Invalid lamport amount", sol: 0 };
    }
    
    if (num < 0) {
      return { valid: false, error: "Lamports cannot be negative", sol: 0 };
    }
    
    const sol = num / 1e9;
    return { valid: true, sol };
  } catch {
    return { valid: false, error: "Invalid lamport conversion", sol: 0 };
  }
}

// ============================================================================
// URL VALIDATION
// ============================================================================

const ALLOWED_DOMAINS = [
  "solana.com",
  "explorer.solana.com",
  "api.devnet.solana.com",
  "api.mainnet-beta.solana.com",
  "humanrail-kyc-issuer.fly.dev",
  "github.com",
];

/**
 * Validate an external URL
 */
export function validateExternalUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS in production
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS URLs allowed in production" };
    }
    
    // Check allowed domains
    const domain = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(allowed => 
      domain === allowed || domain.endsWith(`.${allowed}`)
    );
    
    if (!isAllowed) {
      return { valid: false, error: "Domain not in allowlist" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Safe URL construction for Solana Explorer
 */
export function buildExplorerUrl(
  type: "tx" | "address" | "block",
  value: string,
  cluster: string
): { valid: boolean; url?: string; error?: string } {
  // Validate value based on type
  if (type === "tx" || type === "address") {
    if (!isValidPublicKey(value) && type === "address") {
      // Could be a program ID or other address
      try {
        new PublicKey(value);
      } catch {
        return { valid: false, error: "Invalid address format" };
      }
    }
  }
  
  // Validate cluster
  const validClusters = ["mainnet-beta", "devnet", "testnet", "localnet"];
  if (!validClusters.includes(cluster)) {
    return { valid: false, error: "Invalid cluster" };
  }
  
  const url = `https://explorer.solana.com/${type}/${value}?cluster=${cluster}`;
  return { valid: true, url };
}

// ============================================================================
// CLUSTER VALIDATION
// ============================================================================

export type Cluster = "mainnet-beta" | "devnet" | "localnet";

/**
 * Validate cluster name
 */
export function validateCluster(cluster: string): cluster is Cluster {
  return ["mainnet-beta", "devnet", "localnet"].includes(cluster);
}

// ============================================================================
// AGENT NAME VALIDATION
// ============================================================================

const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function validateAgentName(name: string): { valid: boolean; error?: string; sanitized: string } {
  const sanitized = name.trim().slice(0, 32);
  
  if (sanitized.length === 0) {
    return { valid: false, error: "Agent name is required", sanitized };
  }
  
  if (sanitized.length < 2) {
    return { valid: false, error: "Agent name must be at least 2 characters", sanitized };
  }
  
  if (!AGENT_NAME_PATTERN.test(sanitized)) {
    return { valid: false, error: "Agent name can only contain letters, numbers, hyphens and underscores", sanitized };
  }
  
  return { valid: true, sanitized };
}

// ============================================================================
// DOCUMENT HASH VALIDATION
// ============================================================================

/**
 * Validate a SHA-256 hash (64 hex characters)
 */
export function validateDocumentHash(hash: string): { valid: boolean; error?: string } {
  const clean = hash.trim().toLowerCase();
  
  if (!/^[a-f0-9]{64}$/.test(clean)) {
    return { valid: false, error: "Invalid document hash format (expected 64 hex characters)" };
  }
  
  return { valid: true };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  isValidPublicKey,
  validatePublicKey,
  validateString,
  sanitizeDisplayString,
  validateAmount,
  validateLamports,
  validateExternalUrl,
  buildExplorerUrl,
  validateCluster,
  validateAgentName,
  validateDocumentHash,
};
