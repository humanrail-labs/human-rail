"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { FreezeBanner } from "@/components/vault/freeze-banner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { motion } from "framer-motion";

function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-sm flex-col items-center text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Wallet className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-8 text-sm text-neutral-500">
            Connect a Solana wallet to access Agent Vault — deploy agents, set capabilities, and monitor activity on devnet.
          </p>
          <Button
            onClick={() => setVisible(true)}
            className="gap-2 bg-emerald-600 px-6 hover:bg-emerald-700"
          >
            <Wallet className="h-4 w-4" /> Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return children;
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <FreezeBanner />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <WalletGate>{children}</WalletGate>
          </div>
        </main>
      </div>
    </div>
  );
}
