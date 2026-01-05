import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export interface Config {
  port: number;
  rpcUrl: string;
  cluster: 'mainnet-beta' | 'devnet' | 'localnet';
  programIds: {
    humanRegistry: PublicKey;
    humanPay: PublicKey;
    dataBlink: PublicKey;
  };
  baseUrl: string;
  iconUrl: string;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getRpcUrl(cluster: string): string {
  const customRpc = process.env.RPC_URL;
  if (customRpc) return customRpc;

  switch (cluster) {
    case 'mainnet-beta':
      return clusterApiUrl('mainnet-beta');
    case 'devnet':
      return clusterApiUrl('devnet');
    case 'localnet':
      return 'http://localhost:8899';
    default:
      return clusterApiUrl('devnet');
  }
}

const cluster = getEnvOrDefault('CLUSTER', 'localnet') as Config['cluster'];

export const config: Config = {
  port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
  rpcUrl: getRpcUrl(cluster),
  cluster,
  programIds: {
    humanRegistry: new PublicKey(
      getEnvOrDefault('HUMAN_REGISTRY_PROGRAM_ID', 'Bzvn211EkzfesXFxXKm81TxGpxx4VsZ8SdGf5N95i8SR')
    ),
    humanPay: new PublicKey(
      getEnvOrDefault('HUMAN_PAY_PROGRAM_ID', '6tdLvL8JoJTxUrbkWKNoacfNjnXdpnneT9Wo8hxmWmqe')
    ),
    dataBlink: new PublicKey(
      getEnvOrDefault('DATA_BLINK_PROGRAM_ID', 'BRzgfv849aBAaDsRyHZtJ1ZVFnn8JzdKx2cxWjum56K5')
    ),
  },
  baseUrl: getEnvOrDefault('BASE_URL', 'http://localhost:3001'),
  iconUrl: getEnvOrDefault('ICON_URL', 'https://humanrail.dev/icon.png'),
};
