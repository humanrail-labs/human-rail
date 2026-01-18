"use client";

import { createContext, useContext, useState, ReactNode, FC } from "react";
import { Cluster } from "./providers";

interface ClusterContextType {
  cluster: Cluster;
  setCluster: (cluster: Cluster) => void;
  rpcUrl: string;
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined);

const RPC_URLS: Record<Cluster, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://localhost:8899",
};

interface ClusterProviderProps {
  children: ReactNode;
  defaultCluster?: Cluster;
}

export const ClusterProvider: FC<ClusterProviderProps> = ({
  children,
  defaultCluster = "devnet",
}) => {
  const [cluster, setCluster] = useState<Cluster>(defaultCluster);

  return (
    <ClusterContext.Provider
      value={{
        cluster,
        setCluster,
        rpcUrl: RPC_URLS[cluster],
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
};

export const useCluster = () => {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error("useCluster must be used within a ClusterProvider");
  }
  return context;
};