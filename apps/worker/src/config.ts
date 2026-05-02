import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../.env.product") });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MANDARA_ENV: z.enum(["development", "staging", "production"]).default("development"),
  MANDARA_WORKER_MODE: z.enum(["dry-run", "live-devnet"]).default("dry-run"),
  MANDARA_ENABLE_LIVE_EXECUTION: z.string().default("false"),
  MANDARA_SOLANA_RPC_URL: z.string().default("https://api.devnet.solana.com"),
  MANDARA_IKA_GRPC_URL: z.string().default("https://pre-alpha-dev-1.ika.ika-network.net:443"),
  MANDARA_HUMANRAIL_GUARD_PROGRAM_ID: z.string().default("Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"),
  MANDARA_IKA_DWALLET_PROGRAM_ID: z.string().default("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"),
});

export const env = EnvSchema.parse(process.env);

export const isDev = env.MANDARA_ENV === "development";
export const isDryRun = env.MANDARA_WORKER_MODE === "dry-run";
export const isLiveDevnet = env.MANDARA_WORKER_MODE === "live-devnet";
export const liveExecutionEnabled = env.MANDARA_ENABLE_LIVE_EXECUTION === "true";
