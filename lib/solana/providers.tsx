"use client";
import { FC, ReactNode, useMemo } from "react";
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

export const SolanaProviders: FC<SolanaProvidersProps> = ({
  children,
  cluster,
  customRpcUrl,
}) => {
  const endpoint = useMemo(() => {
    if (customRpcUrl) return customRpcUrl;
    if (process.env.NEXT_PUBLIC_RPC_ENDPOINT) return process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    if (cluster === "localnet") return "http://localhost:8899";
    return clusterApiUrl(cluster);
  }, [cluster, customRpcUrl]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
