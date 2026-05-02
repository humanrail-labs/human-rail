export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
} as const;

export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.BASE_SEPOLIA]: "Base Sepolia",
};

export const DEMO_ASSET = {
  BASE_SEPOLIA_USDC: "USDC:BASE_SEPOLIA",
} as const;
