"use client";

import { FC } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useCluster } from "@/lib/solana/cluster-context";
import { Badge } from "@/components/ui/badge";
import {
  Home, Fingerprint, Bot, Shield, Zap, Receipt,
} from "lucide-react";

const ROUTE_META: Record<string, { label: string; icon: FC<{ className?: string }> }> = {
  "/vault": { label: "Home", icon: Home },
  "/vault/identity": { label: "My Identity", icon: Fingerprint },
  "/vault/agents": { label: "My Agents", icon: Bot },
  "/vault/capabilities": { label: "Capabilities", icon: Shield },
  "/vault/payments": { label: "Payments", icon: Zap },
  "/vault/activity": { label: "Activity Log", icon: Receipt },
  // Legacy dashboard routes (for redirects)
  "/dashboard": { label: "Overview", icon: Home },
  "/dashboard/identity": { label: "Human Identity", icon: Fingerprint },
  "/dashboard/agents": { label: "Agent Registry", icon: Bot },
  "/dashboard/delegation": { label: "Delegation", icon: Shield },
  "/dashboard/payments": { label: "HumanPay", icon: Zap },
  "/dashboard/documents": { label: "Documents", icon: Receipt },
  "/dashboard/receipts": { label: "Receipts", icon: Receipt },
};

export const DashboardHeader: FC = () => {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { cluster } = useCluster();
  const route = ROUTE_META[pathname] ?? ROUTE_META["/vault"];
  const RouteIcon = route.icon;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-neutral-950/60 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <RouteIcon className="h-5 w-5 text-sky-400/70" />
        <h1 className="text-base font-semibold tracking-tight text-white">{route.label}</h1>
        <Badge variant="warning" className="ml-2 text-xs font-medium uppercase tracking-wider">
          {cluster}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        {connected && publicKey && (
          <span className="hidden text-xs font-mono text-neutral-500 sm:block">
            {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-4)}
          </span>
        )}
        <WalletButton />
      </div>
    </header>
  );
};
