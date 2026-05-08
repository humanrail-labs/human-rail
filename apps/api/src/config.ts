import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.product if present; never fail if missing
dotenv.config({ path: path.resolve(__dirname, "../../../.env.product") });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MANDARA_API_PORT: z.string().default("4000").transform(Number),
  MANDARA_API_HOST: z.string().default("0.0.0.0"),
  MANDARA_ENV: z.enum(["development", "staging", "production"]).default("development"),
  MANDARA_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MANDARA_DEV_AUTH_SECRET: z.string().optional(),
  MANDARA_ENCRYPTION_PASSWORD: z.string().min(16).optional(),
  MANDARA_API_KEY_PEPPER: z.string().min(16).optional(),
  MANDARA_SERVICE_WALLET_PATH: z.string().default(""),
  MANDARA_SOLANA_RPC_URL: z.string().default("https://api.devnet.solana.com"),
  MANDARA_IKA_GRPC_URL: z.string().default("https://pre-alpha-dev-1.ika.ika-network.net:443"),
  MANDARA_HUMANRAIL_GUARD_PROGRAM_ID: z.string().default("Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"),
  MANDARA_IKA_DWALLET_PROGRAM_ID: z.string().default("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"),
});

export const env = EnvSchema.parse(process.env);

export const isDev = env.MANDARA_ENV === "development";
export const isProd = env.MANDARA_ENV === "production";

export function requireEncryptionPassword(): string {
  if (env.MANDARA_ENCRYPTION_PASSWORD) {
    return env.MANDARA_ENCRYPTION_PASSWORD;
  }

  if (isDev) {
    return "change-me-dev-only-32-byte-minimum";
  }

  throw new Error("MANDARA_ENCRYPTION_PASSWORD is required outside development.");
}
