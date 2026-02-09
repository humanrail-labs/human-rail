import { z } from 'zod';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const envSchema = z.object({
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_CLUSTER: z.enum(['devnet', 'testnet', 'mainnet-beta']).default('devnet'),
  ISSUER_KEYPAIR_PATH: z.string().default('../../.keys/veriff-issuer.json'),
  VERIFF_API_KEY: z.string().min(1),
  VERIFF_API_SECRET: z.string().min(1),
  VERIFF_BASE_URL: z.string().url().default('https://stationapi.veriff.com/v1'),
  PORT: z.coerce.number().int().positive().default(3100),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;
  _config = envSchema.parse(process.env);
  return _config;
}

export function loadIssuerKeypair(cfg?: Config): Keypair {
  const config = cfg ?? getConfig();
  const resolved = path.resolve(config.ISSUER_KEYPAIR_PATH);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Issuer keypair not found: ${resolved}`);
  }

  // P0 #2: Refuse world-readable key files
  const stat = fs.statSync(resolved);
  const mode = stat.mode & 0o777;
  if (mode & 0o044) {
    if (config.NODE_ENV === 'production') {
      throw new Error(
        `FATAL: Issuer keypair ${resolved} is world/group-readable (mode ${mode.toString(8)}). ` +
        `Run: chmod 600 ${resolved}`
      );
    } else {
      console.warn(
        `⚠️  Issuer keypair ${resolved} is world/group-readable (mode ${mode.toString(8)}). ` +
        `Fix with: chmod 600 ${resolved}`
      );
    }
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secretKey);
}
