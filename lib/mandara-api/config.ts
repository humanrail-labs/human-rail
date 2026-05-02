/**
 * Mandara Product API configuration
 *
 * Public frontend config only. No server secrets.
 */

export const MANDARA_API_BASE_URL =
  process.env.NEXT_PUBLIC_MANDARA_API_URL || "http://localhost:4000";

export const MANDARA_DEV_USER =
  process.env.NEXT_PUBLIC_MANDARA_DEV_USER || "dev@local";
