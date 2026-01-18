"use client";

import { FC, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { ClusterProvider } from "./solana/cluster-context";
import { SolanaProviders } from "./solana/providers";
import { useCluster } from "./solana/cluster-context";
import { Toaster } from "@/components/ui/sonner";

const SolanaWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const { cluster, rpcUrl } = useCluster();
  return (
    <SolanaProviders cluster={cluster} customRpcUrl={rpcUrl}>
      {children}
    </SolanaProviders>
  );
};

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ClusterProvider defaultCluster="devnet">
        <SolanaWrapper>
          {children}
          <Toaster position="bottom-right" />
        </SolanaWrapper>
      </ClusterProvider>
    </ThemeProvider>
  );
};