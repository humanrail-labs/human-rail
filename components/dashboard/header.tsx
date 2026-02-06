"use client";

import { FC } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useCluster } from "@/lib/solana/cluster-context";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Fingerprint, Bot, Shield, Zap, FileText, Receipt,
} from "lucide-react";

const ROUTE_META: Record<string, { label: string; icon: FC<{ className?: string }> }> = {
  "/dashboard": { label: "Overview", icon: LayoutDashboard },
  "/dashboard/identity": { label: "Human Identity", icon: Fingerprint },
  "/dashboard/agents": { label: "Agent Registry", icon: Bot },
  "/dashboard/delegation": { label: "Delegation", icon: Shield },
  "/dashboard/payments": { label: "HumanPay", icon: Zap },
  "/dashboard/documents": { label: "Documents", icon: FileText },
  "/dashboard/receipts": { label: "Receipts", icon: Receipt },
};

export const DashboardHeader: FC = () => {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { cluster } = useCluster();
  const route = ROUTE_META[pathname] ?? ROUTE_META["/dashboard"];
  const RouteIcon = route.icon;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-neutral-950/60 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <RouteIcon className="h-5 w-5 text-emerald-400/70" />
        <h1 className="text-[15px] font-semibold tracking-tight text-white">{route.label}</h1>
        <Badge variant="outline" className="ml-2 border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          {cluster}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        {connected && publicKey && (
          <span className="hidden text-[11px] font-mono text-neutral-600 sm:block">
            {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-4)}
          </span>
        )}
        <WalletButton />
      </div>
    </header>
  );
};
