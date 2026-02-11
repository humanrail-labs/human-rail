"use client";
import { FC, ReactNode, useMemo, useRef, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export type Cluster = "mainnet-beta" | "devnet" | "localnet";

interface SolanaProvidersProps {
  children: ReactNode;
  cluster: Cluster;
  customRpcUrl?: string;
}

function resolveEndpoints(cluster: Cluster, customRpcUrl?: string): { primary: string; fallback: string } {
  const primary = customRpcUrl
    || process.env.NEXT_PUBLIC_RPC_ENDPOINT
    || (cluster === "localnet" ? "http://localhost:8899" : clusterApiUrl(cluster));

  const fallback = process.env.NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT
    || (cluster === "localnet" ? "http://localhost:8899" : clusterApiUrl(cluster));

  return { primary, fallback };
}

export const SolanaProviders: FC<SolanaProvidersProps> = ({
  children,
  cluster,
  customRpcUrl,
}) => {
  const { primary, fallback } = useMemo(
    () => resolveEndpoints(cluster, customRpcUrl),
    [cluster, customRpcUrl]
  );

  // Track consecutive failures on primary to auto-switch
  const failCount = useRef(0);
  const usingFallback = useRef(false);
  const FAIL_THRESHOLD = 3;

  const endpoint = useMemo(() => {
    // Start with primary; fallback activates after repeated failures
    return usingFallback.current ? fallback : primary;
  }, [primary, fallback]);

  // Custom fetch that retries with fallback on network errors
  const fetchWithFallback = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentUrl = usingFallback.current ? fallback : primary;
      try {
        const res = await fetch(currentUrl, init);
        if (res.ok) {
          // Reset on success
          if (usingFallback.current && failCount.current > 0) {
            failCount.current = 0;
            // Don't auto-switch back to primary to avoid flip-flopping
            // User can reload to retry primary
          }
        }
        return res;
      } catch (err) {
        failCount.current++;
        if (!usingFallback.current && failCount.current >= FAIL_THRESHOLD && fallback !== primary) {
          console.warn(
            `[RPC] Primary endpoint failed ${FAIL_THRESHOLD}x, switching to fallback: ${fallback}`
          );
          usingFallback.current = true;
          failCount.current = 0;
          // Retry once on fallback
          return fetch(fallback, init);
        }
        throw err;
      }
    },
    [primary, fallback]
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "confirmed", fetch: fetchWithFallback }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
