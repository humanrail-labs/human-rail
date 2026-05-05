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

function getPublicUrl(cluster: Cluster): string {
  return cluster === "localnet" ? "http://localhost:8899" : clusterApiUrl(cluster);
}

function getWsEndpoint(cluster: Cluster): string {
  return cluster === "localnet" ? "ws://localhost:8899" : "wss://api.devnet.solana.com";
}

export const SolanaProviders: FC<SolanaProvidersProps> = ({
  children,
  cluster,
  customRpcUrl,
}) => {
  const publicUrl = getPublicUrl(cluster);
  const wsEndpoint = getWsEndpoint(cluster);

  const [endpoint, setEndpoint] = useState(() => publicUrl);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpoint(customRpcUrl || `${window.location.origin}/api/rpc`);
    }
  }, [customRpcUrl]);

  const failCount = useRef(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const FAIL_THRESHOLD = 3;

  const fetchWithFallback = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentUrl = usingFallback ? publicUrl : endpoint;
      try {
        const res = await fetch(currentUrl, init);
        if (res.ok && usingFallback && failCount.current > 0) {
          failCount.current = 0;
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

  const wallets = useMemo(
    () => (mounted ? [new PhantomWalletAdapter(), new SolflareWalletAdapter()] : []),
    [mounted]
  );

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "confirmed", fetch: fetchWithFallback, wsEndpoint }}
    >
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(err) => {
          console.error("[WalletAdapter] Error:", err);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
