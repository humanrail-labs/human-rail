"use client";
import {
  FC,
  ReactNode,
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export type Cluster = "mainnet-beta" | "devnet" | "localnet";

interface SolanaProvidersProps {
  children: ReactNode;
  cluster: Cluster;
  customRpcUrl?: string;
}

function getPublicUrl(cluster: Cluster): string {
  return cluster === "localnet" ? "http://localhost:8899" : clusterApiUrl(cluster);
}

function getWsEndpoint(cluster: Cluster): string {
  return cluster === "localnet" ? "ws://localhost:8899" : "wss://api.devnet.solana.com";
}

/**
 * Client-only wallet wrapper so adapters are never created during SSR /
 * hydration. This avoids the empty-wallets → populated-wallets race that
 * triggers WalletConnectionError in React 19 + Next.js App Router.
 */
function ClientWalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new SolflareWalletAdapter()],
    []
  );

  return (
    <WalletProvider
      wallets={wallets}
      autoConnect={false}
      onError={(err) => {
        console.error("[WalletAdapter] Error:", err);
      }}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  );
}

export const SolanaProviders: FC<SolanaProvidersProps> = ({
  children,
  cluster,
  customRpcUrl,
}) => {
  const publicUrl = getPublicUrl(cluster);
  const wsEndpoint = getWsEndpoint(cluster);

  /**
   * Security: never put RPC credentials in NEXT_PUBLIC_ env vars.
   *
   * We start with the public devnet URL during SSR / hydration so there is
   * no hydration mismatch. After mount we switch to the local /api/rpc proxy
   * so that any private RPC key (e.g. Helius) stays server-side and never
   * reaches the browser bundle.
   */
  const [endpoint, setEndpoint] = useState(() => publicUrl);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpoint(customRpcUrl || `${window.location.origin}/api/rpc`);
    }
  }, [customRpcUrl]);

  // Track consecutive failures on primary to auto-switch
  const failCount = useRef(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const FAIL_THRESHOLD = 3;

  // Custom fetch that retries with fallback on network errors
  const fetchWithFallback = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentUrl = usingFallback ? publicUrl : endpoint;
      try {
        const res = await fetch(currentUrl, init);
        if (res.ok && usingFallback && failCount.current > 0) {
          failCount.current = 0;
          // Stay on fallback to avoid flip-flopping; reload to retry primary
        }
        return res;
      } catch (err) {
        failCount.current++;
        if (
          !usingFallback &&
          failCount.current >= FAIL_THRESHOLD &&
          publicUrl !== endpoint
        ) {
          console.warn(
            `[RPC] Primary endpoint failed ${FAIL_THRESHOLD}x, switching to fallback: ${publicUrl}`
          );
          setUsingFallback(true);
          failCount.current = 0;
          // Retry once on fallback
          return fetch(publicUrl, init);
        }
        throw err;
      }
    },
    [endpoint, publicUrl, usingFallback]
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "confirmed", fetch: fetchWithFallback, wsEndpoint }}
    >
      {mounted ? (
        <ClientWalletProviders>{children}</ClientWalletProviders>
      ) : (
        children
      )}
    </ConnectionProvider>
  );
};
